import re
import time
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import BugReport, Notification, ProjectSubmission, Testing
from .serializers import BugReportSerializer, NotificationSerializer, ProjectSubmissionSerializer
from users.models import Employee
from django.db import transaction, DatabaseError

logger = logging.getLogger(__name__)

def get_next_bug_id():
    bug_ids = BugReport.objects.exclude(bug_id__isnull=True).values_list('bug_id', flat=True)
    max_num = 100
    for b_id in bug_ids:
        if b_id:
            match = re.search(r'BUG-(\d+)', str(b_id), re.IGNORECASE)
            if match:
                try:
                    val = int(match.group(1))
                    if val > max_num:
                        max_num = val
                except ValueError:
                    pass
    return f'BUG-{max_num + 1}'


def reformat_legacy_bug_ids():
    try:
        all_bugs = list(BugReport.objects.all().order_by('module', 'id', 'created_at'))
        proj_counters = {}
        for bug in all_bugs:
            proj_name = bug.module or 'General'
            clean = "".join([c for c in proj_name if c.isalnum() or c.isspace()]).strip()
            words = [w for w in clean.split() if w]
            if not words:
                acronym = "PRJ"
            elif len(words) > 1:
                acronym = "".join([w[0] for w in words]).upper()
            else:
                w = words[0]
                acronym = w.upper() if len(w) <= 4 else w[:2].upper()

            proj_counters[acronym] = proj_counters.get(acronym, 0) + 1
            expected_id = f"{acronym}-{str(proj_counters[acronym]).zfill(3)}"

            if not bug.bug_id or bug.bug_id.startswith('BUG-') or bug.bug_id.startswith('BUG_') or not re.match(rf'^{re.escape(acronym)}-\d+$', str(bug.bug_id), re.IGNORECASE):
                bug.bug_id = expected_id
                bug.save(update_fields=['bug_id'])
    except Exception as e:
        logger.error(f"Error reformatting legacy bug IDs: {e}")


class BugReportListCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        reformat_legacy_bug_ids()
        bugs = BugReport.objects.all().order_by('-created_at')
        bugs = self._apply_filters(bugs, request.query_params)
        
        serializer = BugReportSerializer(bugs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _apply_filters(self, bugs, params):
        """Applies developer and tester filters to the bug queryset."""
        dev_id = params.get('developer_id') or params.get('developerId')
        dev_name = params.get('developer_name') or params.get('developerName')
        
        if dev_id:
            bugs = bugs.filter(Q(developer_id__iexact=dev_id) | Q(developer_name__icontains=dev_id))
        elif dev_name:
            bugs = bugs.filter(developer_name__icontains=dev_name)
            
        tester_id = params.get('tester_id') or params.get('testerId')
        tester_email = params.get('tester_email') or params.get('testerEmail')
        tester_name = params.get('tester_name') or params.get('testerName')
        
        if tester_id:
            bugs = bugs.filter(tester_id__iexact=tester_id)
        elif tester_email:
            bugs = bugs.filter(tester_email__iexact=tester_email)
        elif tester_name:
            bugs = bugs.filter(tester_name__icontains=tester_name)
            
        return bugs

    def _get_next_project_bug_id(self, project_name):
        acronym = self._get_project_acronym(project_name)
        existing_bugs = BugReport.objects.filter(
            Q(module__iexact=project_name) | Q(bug_id__istartswith=f"{acronym}-")
        )
        max_seq = 0
        pattern = re.compile(rf'^{re.escape(acronym)}-(\d+)$', re.IGNORECASE)
        for b in existing_bugs:
            if b.bug_id:
                m = pattern.match(b.bug_id)
                if m:
                    try:
                        seq = int(m.group(1))
                        if seq > max_seq:
                            max_seq = seq
                    except ValueError:
                        pass
                else:
                    m_bug = re.search(r'BUG-(\d+)', str(b.bug_id), re.IGNORECASE)
                    if m_bug:
                        try:
                            val = int(m_bug.group(1))
                            seq = val % 100 if (100 < val <= 999 and val % 100 != 0) else val
                            if seq > max_seq:
                                max_seq = seq
                        except ValueError:
                            pass
        return f"{acronym}-{str(max_seq + 1).zfill(3)}"

    def _prepare_bug_data(self, data):
        incoming_id = str(data.get('bug_id') or data.get('bugId') or '').strip()
        proj_name = data.get('module') or data.get('project_name') or data.get('projectName') or 'General'
        
        if not incoming_id or 'SAVED' in incoming_id.upper() or incoming_id.upper().startswith('BUG-'):
            next_id = self._get_next_project_bug_id(proj_name)
            data['bug_id'] = data['bugId'] = next_id
        else:
            data['bug_id'] = data['bugId'] = incoming_id

        self._assign_developer_info(data)
        self._assign_tester_info(data)
        self._assign_default_statuses(data)
        return data

    def _assign_developer_info(self, data):
        dev_id = data.get('developerId') or data.get('developer_id')
        if not dev_id:
            return
            
        emp = Employee.objects.filter(
            Q(employee_id__iexact=dev_id) | Q(name__icontains=dev_id), 
            role='Developer'
        ).first()
        
        if emp:
            data['developer_id'] = emp.employee_id
            if not (data.get('developer_name') or data.get('developerName')):
                dev_display = f"{emp.name} ({emp.employee_id})"
                data['developer_name'] = data['developerName'] = dev_display

    def _assign_tester_info(self, data):
        tester_id = data.get('testerId') or data.get('tester_id')
        tester_email = data.get('tester_email') or data.get('testerEmail')
        if not tester_id and not tester_email:
            return
            
        emp_t = Employee.objects.filter(
            Q(employee_id__iexact=tester_id or '') | Q(company_email__iexact=tester_email or ''), 
            role='Tester'
        ).first()
        
        if emp_t:
            data['tester_id'] = emp_t.employee_id

    def _assign_default_statuses(self, data):
        status_val = (
            data.get('status') or 
            data.get('testerStatus') or 
            data.get('devStatus') or 
            data.get('dev_status') or 
            'Open'
        )
        data['status'] = data['testerStatus'] = data['devStatus'] = data['dev_status'] = status_val

    def _get_project_acronym(self, project_name):
        if not project_name or not project_name.strip():
            return "PRJ"
        clean = "".join([c for c in project_name if c.isalnum() or c.isspace()]).strip()
        words = [w for w in clean.split() if w]
        if not words:
            return "PRJ"
        if len(words) > 1:
            return "".join([w[0] for w in words]).upper()
        word = words[0]
        if len(word) <= 4:
            return word.upper()
        return word[:2].upper()

    def _send_creation_notifications(self, bug, dev_id):
        proj_name = bug.module or 'General'
        acronym = self._get_project_acronym(proj_name)
        proj_count = BugReport.objects.filter(module__iexact=proj_name).count()
        seq = f"{max(proj_count, 1):03d}"
        
        if bug.bug_id and not bug.bug_id.startswith("BUG-") and not bug.bug_id.startswith("BUG_"):
            formatted_bug_id = bug.bug_id
        else:
            formatted_bug_id = f"{acronym}-{seq}"

        title = bug.title
        tester_name = bug.tester_name or 'Tester'
        tester_email = bug.tester_email or ''
        tester_emp_id = bug.tester_id or 'TS001'
        dev_emp_id = bug.developer_id or dev_id or 'DEV001'

        self._create_tester_notification(bug, formatted_bug_id, title, tester_name, tester_email, tester_emp_id, dev_emp_id)
        self._create_developer_notification(bug, formatted_bug_id, title, tester_name, tester_emp_id, dev_emp_id)
        self._create_cto_project_notification(bug)

    def _create_cto_project_notification(self, bug):
        try:
            proj_name = (getattr(bug, 'module', None) or 'General').strip().upper()
            project_bugs = BugReport.objects.filter(module__iexact=proj_name)
            total_count = project_bugs.count()
            closed_count = project_bugs.filter(status__iexact='Closed').count()
            resolved_or_closed = project_bugs.filter(Q(status__iexact='Closed') | Q(status__iexact='Resolved') | Q(status__iexact='Fixed')).count()
            pct = int((resolved_or_closed / total_count) * 100) if total_count > 0 else 0

            tester_name = getattr(bug, 'tester_name', None) or 'Tester'
            tester_name_clean = str(tester_name).split('(')[0].strip()

            dev_name = getattr(bug, 'developer_name', None) or getattr(bug, 'developer', None) or 'Developer'
            dev_name_clean = str(dev_name).split('(')[0].strip()

            all_closed = total_count > 0 and closed_count == total_count

            if all_closed:
                msg = f'Project {proj_name} fully completed (100% progress)'
            elif pct == 100 and total_count > 0:
                msg = f'{proj_name} progress is 100% (Resolved by Developer)'
            else:
                msg = f'{proj_name} progress is {pct}%'

            Notification.objects.filter(
                recipient_role='CTO',
                project_name__iexact=proj_name,
                notification_type__in=['project_status_updated', 'project_closed']
            ).delete()

            Notification.objects.create(
                recipient_email='cto@company.com',
                recipient_name='CTO',
                recipient_role='CTO',
                recipient_id='CTO001',
                notification_type='project_closed' if all_closed else 'project_status_updated',
                message=msg,
                bug_report=bug if isinstance(bug, BugReport) else None,
                project_name=proj_name
            )
        except Exception as e:
            logger.error(f"Error creating CTO notification: {e}")

    def _create_tester_notification(self, bug, bug_id, title, tester_name, tester_email, tester_emp_id, dev_emp_id):
        if not (tester_email or tester_emp_id):
            return
            
        assigned_to = bug.developer_name or dev_emp_id
        Notification.objects.create(
            recipient_email=tester_email,
            recipient_name=tester_name,
            recipient_role='Tester',
            recipient_id=tester_emp_id,
            notification_type='bug_created',
            message=f'Your bug report {bug_id} "{title}" was submitted and assigned to {assigned_to}.',
            bug_report=bug,
            project_name=bug.module or 'General'
        )

    def _create_admin_notification(self, bug, bug_id, title, tester_name, tester_emp_id):
        Notification.objects.create(
            recipient_email='vasan11@gmail.com',
            recipient_name='Admin',
            recipient_role='Admin',
            recipient_id='ADM001',
            notification_type='bug_created',
            message=f'New bug {bug_id} reported: "{title}" by {tester_name} ({tester_emp_id})',
            bug_report=bug,
            project_name=bug.module or 'General'
        )

    def _create_developer_notification(self, bug, bug_id, title, tester_name, tester_emp_id, dev_emp_id):
        if not (bug.developer_name and bug.developer_name != 'Unassigned'):
            return

        dev_name_clean = bug.developer_name.split('(')[0].strip()
        dev_email = ''
        try:
            emp = Employee.objects.filter(
                Q(employee_id__iexact=dev_emp_id) | Q(name__icontains=dev_name_clean), 
                role='Developer'
            ).first()
            if emp:
                dev_email = emp.company_email
                if not bug.developer_id:
                    bug.developer_id = emp.employee_id
                    bug.save(update_fields=['developer_id'])
        except Exception:
            pass

        final_dev_email = dev_email or f"{dev_name_clean.lower().replace(' ', '')}@bugtracker.com"
        Notification.objects.create(
            recipient_email=final_dev_email,
            recipient_name=dev_name_clean,
            recipient_role='Developer',
            recipient_id=bug.developer_id or dev_emp_id,
            notification_type='bug_assigned',
            message=f'New bug report submitted: [{bug_id}] {title} assigned to you by Tester {tester_name} ({tester_emp_id}).',
            bug_report=bug,
            project_name=bug.module or 'General'
        )

    def post(self, request):
        data = self._prepare_bug_data(request.data.copy())
        dev_id = data.get('developerId') or data.get('developer_id')
        serializer = BugReportSerializer(data=data)
        if serializer.is_valid():
            bug = serializer.save()
            self._send_creation_notifications(bug, dev_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class BugReportDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def _get_bug(self, pk):
        pk_str = str(pk).strip()
        if pk_str.isdigit():
            bug = BugReport.objects.filter(pk=int(pk_str)).first()
            if bug:
                return bug
        bug = BugReport.objects.filter(bug_id__iexact=pk_str).first()
        if bug:
            return bug
        if not pk_str.upper().startswith('BUG-'):
            bug = BugReport.objects.filter(bug_id__iexact=f'BUG-{pk_str}').first()
            if bug:
                return bug
        return get_object_or_404(BugReport, pk=pk if pk_str.isdigit() else 0)

    def get(self, request, pk):
        bug = self._get_bug(pk)
        role = request.query_params.get('role') or request.query_params.get('user_role')
        if role == 'Developer' and bug.tester_edited:
            bug.tester_edited = False
            bug.save(update_fields=['tester_edited'])
        elif role == 'Tester' and bug.dev_resolved:
            bug.dev_resolved = False
            bug.save(update_fields=['dev_resolved'])
            
        serializer = BugReportSerializer(bug)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _validate_close_action(self, bug, new_status):
        if new_status and str(new_status).strip().lower() == 'closed':
            curr_status = (bug.status or bug.dev_status or '').strip().lower()
            if curr_status not in ['closed', 'resolved', 'fixed'] and not bug.dev_resolved:
                return Response(
                    {'detail': 'Only bugs that have been marked as Resolved by the developer can be closed by the tester.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return None

    def _process_patch_flags(self, data, new_status):
        tester_fields = ['title', 'description', 'severity', 'bugType', 'bug_type', 'stepsText', 'steps_text']
        if any(f in data for f in tester_fields):
            data['tester_edited'] = True
            data['testerEdited'] = True
            
        if new_status or data.get('tester_edited') is False or data.get('testerEdited') is False:
            data['dev_resolved'] = False
            data['devResolved'] = False
        return data

    def _send_patch_notifications(self, updated_bug, new_status, old_status):
        try:
            proj_name = updated_bug.module or "General"
            acronym = self._get_project_acronym(proj_name)

            proj_bugs = list(BugReport.objects.filter(module__iexact=updated_bug.module).order_by('id'))
            try:
                bug_idx = proj_bugs.index(updated_bug) + 1
            except ValueError:
                bug_idx = 1

            seq = f"{bug_idx:03d}"
            formatted_id = f"{acronym}-{seq}"

            tester_title = updated_bug.tester_name or "Tester"
            tester_name_clean = str(tester_title).split('(')[0].strip()

            dev_id = updated_bug.developer_id or getattr(updated_bug, 'developerId', None)
            dev_name = updated_bug.developer_name or getattr(updated_bug, 'developerName', None) or getattr(updated_bug, 'developer', None) or 'Developer'
            dev_name_clean = str(dev_name).split('(')[0].strip()

            if new_status == "Closed":
                msg = f'Tester {tester_name_clean} verified and closed bug [{formatted_id}]'
            elif new_status == "Not Fixed":
                msg = f'Tester {tester_name_clean} marked bug [{formatted_id}] as "Not Fixed"'
            elif new_status == "Open":
                msg = f'Tester {tester_name_clean} updated bug [{formatted_id}] status to "Open"'
            else:
                msg = f'Bug [{formatted_id}] status updated to "{updated_bug.status}"'

            norm_status = str(new_status or '').strip().lower()

            if norm_status in ['open', 'closed', 'not fixed', 'not-fixed'] and dev_name and str(dev_name).strip().lower() != 'unassigned':
                dev_email = ''
                real_dev_id = dev_id or 'DEV001'

                try:
                    query = Q(role='Developer')
                    if dev_id:
                        query &= (Q(employee_id__iexact=dev_id) | Q(name__icontains=dev_name_clean))
                    else:
                        query &= Q(name__icontains=dev_name_clean)

                    emp = Employee.objects.filter(query).first()
                    if emp:
                        dev_email = emp.company_email
                        real_dev_id = emp.employee_id
                        if not updated_bug.developer_id:
                            updated_bug.developer_id = emp.employee_id
                            updated_bug.save(update_fields=['developer_id'])
                except Exception as ex:
                    logger.error(f"Error querying employee for dev notification: {ex}")

                Notification.objects.create(
                    recipient_email=dev_email or f"{dev_name_clean.lower().replace(' ', '')}@bugtracker.com",
                    recipient_name=dev_name_clean,
                    recipient_role='Developer',
                    recipient_id=real_dev_id,
                    notification_type='bug_updated',
                    message=msg,
                    bug_report=updated_bug,
                    project_name=updated_bug.module or "General"
                )

            if norm_status in ['pending', 'in progress', 'in-progress', 'resolved', 'fixed']:
                if norm_status == 'pending':
                    t_msg = f'Developer {dev_name_clean} marked bug [{formatted_id}] as "Pending"'
                elif norm_status in ['resolved', 'fixed']:
                    t_msg = f'Developer {dev_name_clean} resolved bug [{formatted_id}] for project "{proj_name}". Please verify and close.'
                else:
                    t_msg = f'Developer {dev_name_clean} updated bug [{formatted_id}] status to "{new_status}"'

                tester_email = updated_bug.tester_email or ""
                real_tester_id = updated_bug.tester_id or "TS001"

                try:
                    t_emp = Employee.objects.filter(
                        Q(employee_id__iexact=real_tester_id) | Q(name__icontains=tester_name_clean),
                        role='Tester'
                    ).first()
                    if t_emp:
                        tester_email = t_emp.company_email or tester_email
                        real_tester_id = t_emp.employee_id
                except Exception as ex:
                    logger.error(f"Error querying employee for tester notification: {ex}")

                Notification.objects.create(
                    recipient_email=tester_email or f"{tester_name_clean.lower().replace(' ', '')}@bugtracker.com",
                    recipient_name=tester_name_clean,
                    recipient_role='Tester',
                    recipient_id=real_tester_id,
                    notification_type='bug_updated',
                    message=t_msg,
                    bug_report=updated_bug,
                    project_name=updated_bug.module or "General"
                )

            if norm_status in ['not fixed', 'not-fixed']:
                not_fixed_msg = f'Tester {tester_name_clean} marked bug [{formatted_id}] as "Not Fixed" in project "{proj_name}"'
                Notification.objects.create(
                    recipient_email='cto@company.com',
                    recipient_name='CTO',
                    recipient_role='CTO',
                    recipient_id='CTO001',
                    notification_type='not_fixed_alert',
                    message=not_fixed_msg,
                    bug_report=updated_bug,
                    project_name=proj_name
                )
            elif norm_status in ['resolved', 'fixed']:
                dev_resolved_msg = f'Developer {dev_name_clean} marked bug [{formatted_id}] as "Resolved" in project "{proj_name}"'
                Notification.objects.create(
                    recipient_email='cto@company.com',
                    recipient_name='CTO',
                    recipient_role='CTO',
                    recipient_id='CTO001',
                    notification_type='bug_resolved_alert',
                    message=dev_resolved_msg,
                    bug_report=updated_bug,
                    project_name=proj_name
                )

            self._create_cto_project_notification(updated_bug)
        except Exception as e:
            logger.error(f"Error in _send_patch_notifications: {e}")

    def patch(self, request, pk):
        try:
            bug = self._get_bug(pk)
            old_status = bug.status
            new_status = request.data.get('status') or request.data.get('testerStatus') or request.data.get('devStatus') or request.data.get('dev_status')
            
            error_response = self._validate_close_action(bug, new_status)
            if error_response:
                return error_response

            data = request.data.copy()
            if new_status:
                for field in ['status', 'testerStatus', 'devStatus', 'dev_status']:
                    data[field] = new_status
                    
            data = self._process_patch_flags(data, new_status)

            serializer = BugReportSerializer(bug, data=data, partial=True)
            if serializer.is_valid():
                updated_bug = serializer.save()
                try:
                    self._send_patch_notifications(updated_bug, new_status, old_status)
                except Exception as ne:
                    logger.error(f"Notification error on patch: {ne}")
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in BugReportDetailView.patch: {e}", exc_info=True)
            return Response({'detail': f'Error updating bug status: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, pk):
        bug = self._get_bug(pk)
        bug.delete()
        return Response({'message': 'Bug deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


class NotificationListCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        email = request.query_params.get('email') or request.query_params.get('recipient_email')
        role = request.query_params.get('role') or request.query_params.get('recipient_role')
        recipient_id = request.query_params.get('recipient_id') or request.query_params.get('recipientId')
        
        notifications = Notification.objects.select_related('bug_report').all().order_by('-created_at')

        if role and role.strip().upper() == 'CTO':
            notifications = notifications.filter(
                Q(recipient_role__iexact='CTO') |
                Q(recipient_id__iexact='CTO001') |
                Q(recipient_email__iexact='cto@company.com')
            )
            serializer = NotificationSerializer(notifications, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        if email or recipient_id:
            query = Q()
            if email:
                query |= Q(recipient_email__iexact=email)
            if recipient_id:
                query |= Q(recipient_id__iexact=recipient_id) | Q(recipient_name__icontains=recipient_id)
            if role:
                query |= Q(recipient_role__iexact=role)
            notifications = notifications.filter(query)
        elif role:
            notifications = notifications.filter(recipient_role__iexact=role)
            
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = NotificationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk)
        serializer = NotificationSerializer(notification, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk)
        notification.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def generate_submission_id(dev_id, project_name):
    clean_dev_id = str(dev_id or 'dev001').strip().lower()
    clean_proj = str(project_name or 'prj').strip()
    words = re.findall(r'[a-zA-Z0-9]+', clean_proj)
    
    if len(words) > 1:
        acronym = "".join(w[0] for w in words).lower()
    elif len(words) == 1:
        w = words[0].lower()
        if len(w) <= 4:
            acronym = w
        elif w.startswith("auth"):
            acronym = "auth"
        else:
            acronym = w[:3]
    else:
        acronym = "prj"
        
    dev_prefix = f"{clean_dev_id}-"
    existing_ids = ProjectSubmission.objects.filter(id__istartswith=dev_prefix).values_list('id', flat=True)
    max_seq = 0
    pattern = re.compile(rf"^{re.escape(clean_dev_id)}-(?:[a-z0-9]+-(\d+)|(\d+)-[a-z0-9]+)$", re.IGNORECASE)
    for existing_id in existing_ids:
        match = pattern.match(str(existing_id))
        if match:
            try:
                seq_str = match.group(1) or match.group(2)
                seq = int(seq_str)
                if seq > max_seq:
                    max_seq = seq
            except ValueError:
                pass
    next_seq = str(max_seq + 1).zfill(3)
    return f"{clean_dev_id}-{acronym}-{next_seq}"


def reformat_legacy_submission_ids():
    try:
        all_subs = list(ProjectSubmission.objects.all().order_by('developer_id', 'id', 'date_submitted'))
        dev_seq_counters = {}
        
        for sub in all_subs:
            dev_id = str(sub.developer_id or 'dev001').strip().lower()
            clean_proj = str(sub.project_name or 'prj').strip()
            words = re.findall(r'[a-zA-Z0-9]+', clean_proj)
            if len(words) > 1:
                acronym = "".join(w[0] for w in words).lower()
            elif len(words) == 1:
                w = words[0].lower()
                if len(w) <= 4:
                    acronym = w
                elif w.startswith("auth"):
                    acronym = "auth"
                else:
                    acronym = w[:3]
            else:
                acronym = "prj"

            current_counter = dev_seq_counters.get(dev_id, 0) + 1
            dev_seq_counters[dev_id] = current_counter
            new_id = f"{dev_id}-{acronym}-{str(current_counter).zfill(3)}"

            if sub.id != new_id:
                sub_dict = {
                    'id': new_id,
                    'project_name': sub.project_name,
                    'developer_name': sub.developer_name,
                    'developer_id': sub.developer_id,
                    'version': sub.version,
                    'subject': sub.subject,
                    'date_submitted': sub.date_submitted,
                    'project_link': sub.project_link,
                    'status': sub.status,
                    'downloaded': sub.downloaded,
                    'claimed_by': sub.claimed_by,
                    'claimed_by_id': sub.claimed_by_id,
                }
                with transaction.atomic():
                    old_id = sub.id
                    ProjectSubmission.objects.filter(id=old_id).delete()
                    ProjectSubmission.objects.create(**sub_dict)
    except Exception as e:
        logger.error(f"Error reformatting legacy submission IDs: {e}")


class ProjectSubmissionListCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        reformat_legacy_submission_ids()
        developer_id = request.query_params.get('developer_id') or request.query_params.get('developerId')
        developer_name = request.query_params.get('developer_name') or request.query_params.get('developerName')
        submissions = ProjectSubmission.objects.all().order_by('id')
        if developer_id:
            submissions = submissions.filter(Q(developer_id__iexact=developer_id) | Q(developer_name__icontains=developer_id))
        elif developer_name:
            submissions = submissions.filter(developer_name__icontains=developer_name)
        serializer = ProjectSubmissionSerializer(submissions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _send_submission_notifications(self, submission, dev_id):
        target_name = (submission.claimed_by or '').strip()
        target_id = (submission.claimed_by_id or '').strip()

        raw_dev_name = (submission.developer_name or '').split('(')[0].strip()
        dev_label = f"{raw_dev_name} ({dev_id})" if raw_dev_name and dev_id and dev_id.lower() not in raw_dev_name.lower() else (raw_dev_name or dev_id)
        sub_msg = f'{dev_label} submitted project build: "{submission.project_name}"'

        target_testers = []
        if target_name or target_id:
            query = Q(role='Tester')
            if target_id:
                query &= (Q(employee_id__iexact=target_id) | Q(name__icontains=target_name))
            elif target_name:
                query &= Q(name__icontains=target_name)
            target_testers = list(Employee.objects.filter(query))

        if target_testers:
            for tester in target_testers:
                Notification.objects.create(
                    recipient_email=tester.company_email,
                    recipient_name=tester.name,
                    recipient_role='Tester',
                    recipient_id=tester.employee_id,
                    notification_type='project_submitted',
                    message=sub_msg,
                    bug_report=None,
                    project_name=submission.project_name,
                    sender_id=dev_id
                )
        elif target_name:
            Notification.objects.create(
                recipient_email=f"{target_name.lower().replace(' ', '')}@bugtracker.com",
                recipient_name=target_name,
                recipient_role='Tester',
                recipient_id=target_id or 'TS001',
                notification_type='project_submitted',
                message=sub_msg,
                bug_report=None,
                project_name=submission.project_name,
                sender_id=dev_id
            )
        else:
            testers = Employee.objects.filter(role='Tester')
            for tester in testers:
                Notification.objects.create(
                    recipient_email=tester.company_email,
                    recipient_name=tester.name,
                    recipient_role='Tester',
                    recipient_id=tester.employee_id,
                    notification_type='project_submitted',
                    message=sub_msg,
                    bug_report=None,
                    project_name=submission.project_name,
                    sender_id=dev_id
                )

        proj_name = (submission.project_name or 'General').strip().upper()
        project_bugs = BugReport.objects.filter(module__iexact=proj_name)
        total_count = project_bugs.count()
        closed_count = project_bugs.filter(Q(status__iexact='Closed') | Q(status__iexact='Resolved')).count()
        pct = int((closed_count / total_count) * 100) if total_count > 0 else 0

        cto_sub_msg = f'{dev_label} submitted project build: "{submission.project_name}"'
        if not Notification.objects.filter(recipient_role='CTO', message=cto_sub_msg).exists():
            Notification.objects.create(
                recipient_email='cto@company.com',
                recipient_name='CTO',
                recipient_role='CTO',
                recipient_id='CTO001',
                notification_type='project_submitted',
                message=cto_sub_msg,
                bug_report=None,
                project_name=submission.project_name,
                sender_id=dev_id
            )

        dev_email = ''
        try:
            emp = Employee.objects.filter(
                Q(employee_id__iexact=dev_id) | Q(name__icontains=submission.developer_name.split('(')[0].strip()),
                role='Developer'
            ).first()
            if emp:
                dev_email = emp.company_email
        except Exception:
            pass

        Notification.objects.create(
            recipient_email=dev_email,
            recipient_name=submission.developer_name.split('(')[0].strip(),
            recipient_role='Developer',
            recipient_id=dev_id,
            notification_type='project_submitted',
            message=f'Your project build "{submission.project_name}" was submitted successfully to Testers.',
            bug_report=None,
            project_name=submission.project_name,
            sender_id=dev_id
        )

    def post(self, request):
        data = request.data.copy()
        dev_id = data.get('developerId') or data.get('developer_id') or 'DEV001'
        dev_name = data.get('developerName') or data.get('developer_name') or ''
        project_name = (data.get('projectName') or data.get('project_name') or '').strip()

        data['id'] = generate_submission_id(dev_id, project_name)

        if project_name:
            dev_clean = dev_name.split('(')[0].strip() if dev_name else ''
            existing = ProjectSubmission.objects.filter(
                project_name__iexact=project_name
            ).filter(
                Q(developer_id__iexact=dev_id) | Q(developer_name__icontains=dev_id) | (Q(developer_name__icontains=dev_clean) if dev_clean else Q())
            ).first()
            if existing:
                return Response(
                    {"detail": f"You have already submitted a project with the name '{project_name}'. Duplicate project submissions with the same name are not allowed."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        data['developer_id'] = dev_id
        
        serializer = ProjectSubmissionSerializer(data=data)
        if serializer.is_valid():
            submission = serializer.save()
            self._send_submission_notifications(submission, dev_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectSubmissionDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def _propagate_project_name_update(self, old_project_name, new_project_name, sender_id):
        Testing.objects.filter(project_name=old_project_name, sender_id=sender_id).update(project_name=new_project_name)
        Notification.objects.filter(project_name=old_project_name, sender_id=sender_id).update(project_name=new_project_name)

        related_notifs = Notification.objects.filter(project_name=new_project_name, sender_id=sender_id)
        for notif in related_notifs:
            notif.message = notif.message.replace(old_project_name, new_project_name)
            notif.save()

    def _handle_claim_notification(self, updated_sub):
        claimed_by = updated_sub.claimed_by
        claimed_by_id = updated_sub.claimed_by_id or 'TS001'
        
        dev_name_clean = updated_sub.developer_name.split('(')[0].strip()
        dev_id_match = re.search(r'\((DEV\d+|EMP\d+)\)', updated_sub.developer_name, re.IGNORECASE)
        dev_id = updated_sub.developer_id or (dev_id_match.group(1).upper() if dev_id_match else 'DEV001')
        
        emp = Employee.objects.filter(Q(employee_id__iexact=dev_id) | Q(name__icontains=dev_name_clean), role='Developer').first()
        dev_email = emp.company_email if emp else f"{dev_name_clean.lower().replace(' ', '')}@bugtracker.com"
        dev_name = emp.name if emp else dev_name_clean
        
        Notification.objects.create(
            recipient_email=dev_email,
            recipient_name=dev_name,
            recipient_role='Developer',
            recipient_id=dev_id,
            notification_type='build_accepted',
            message=f'Your project build "{updated_sub.project_name}" has been accepted and is being tested by {claimed_by} ({claimed_by_id})',
            bug_report=None,
            project_name=updated_sub.project_name,
            sender_id=dev_id
        )

        cto_claim_msg = f'Tester {claimed_by} accepted project build "{updated_sub.project_name}"'
        if not Notification.objects.filter(recipient_role='CTO', message=cto_claim_msg).exists():
            Notification.objects.create(
                recipient_email='cto@company.com',
                recipient_name='CTO',
                recipient_role='CTO',
                recipient_id='CTO001',
                notification_type='project_accepted',
                message=cto_claim_msg,
                bug_report=None,
                project_name=updated_sub.project_name,
                sender_id=dev_id
            )

    def patch(self, request, pk):
        submission = get_object_or_404(ProjectSubmission, pk=pk)
        old_project_name = submission.project_name
        sender_id = submission.developer_id or "DEV001"

        new_proj_name = (request.data.get('projectName') or request.data.get('project_name') or '').strip()
        if new_proj_name and new_proj_name.lower() != old_project_name.lower():
            existing = ProjectSubmission.objects.filter(
                project_name__iexact=new_proj_name
            ).filter(
                Q(developer_id__iexact=sender_id) | Q(developer_name__icontains=sender_id)
            ).exclude(pk=pk).first()
            if existing:
                return Response(
                    {"detail": f"You have already submitted another project with the name '{new_proj_name}'. Duplicate project names are not allowed."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = ProjectSubmissionSerializer(submission, data=request.data, partial=True)
        if serializer.is_valid():
            with transaction.atomic():
                updated_sub = serializer.save()
                new_project_name = updated_sub.project_name

                if old_project_name != new_project_name:
                    self._propagate_project_name_update(old_project_name, new_project_name, sender_id)
            
            if request.data.get('claimedBy') or request.data.get('claimed_by'):
                self._handle_claim_notification(updated_sub)
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            submission = ProjectSubmission.objects.get(pk=pk)
            with transaction.atomic():
                submission.delete()
                
            return Response({
                "success": True,
                "message": "Project submission deleted successfully."
            }, status=status.HTTP_200_OK)
            
        except ProjectSubmission.DoesNotExist:
            return Response({
                "success": False,
                "message": "Project submission not found."
            }, status=status.HTTP_404_NOT_FOUND)
            
        except DatabaseError as e:
            return Response({
                "success": False,
                "message": f"Database error occurred: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            return Response({
                "success": False,
                "message": f"An error occurred: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)