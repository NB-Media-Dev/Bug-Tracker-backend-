import re
import time
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

def get_next_bug_id():
    last_bug = BugReport.objects.all().order_by('-id').first()
    if not last_bug:
        return 'BUG-101'
    match = re.search(r'BUG-(\d+)', last_bug.bug_id)
    if match:
        next_num = int(match.group(1)) + 1
        return f'BUG-{next_num}'
    return f'BUG-{100 + (last_bug.id if last_bug else 1)}'


class BugReportListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
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

    def _prepare_bug_data(self, data):
        if not (data.get('bug_id') or data.get('bugId')):
            next_id = get_next_bug_id()
            data['bug_id'] = data['bugId'] = next_id

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

    def _send_creation_notifications(self, bug, dev_id):
        bug_id = bug.bug_id
        title = bug.title
        tester_name = bug.tester_name or 'Tester'
        tester_email = bug.tester_email or ''
        tester_emp_id = bug.tester_id or 'TS001'
        dev_emp_id = bug.developer_id or dev_id or 'DEV001'

        self._create_tester_notification(bug, bug_id, title, tester_name, tester_email, tester_emp_id, dev_emp_id)
        self._create_admin_notification(bug, bug_id, title, tester_name, tester_emp_id)
        self._create_developer_notification(bug, bug_id, title, tester_name, tester_emp_id, dev_emp_id)

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
            bug_report=bug
        )

    def _create_admin_notification(self, bug, bug_id, title, tester_name, tester_emp_id):
        Notification.objects.create(
            recipient_email='vasan11@gmail.com',
            recipient_name='Admin',
            recipient_role='Admin',
            recipient_id='ADM001',
            notification_type='bug_created',
            message=f'New bug {bug_id} reported: "{title}" by {tester_name} ({tester_emp_id})',
            bug_report=bug
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
            bug_report=bug
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
    permission_classes = [AllowAny]

    def _get_bug(self, pk):
        if isinstance(pk, str) and not pk.isdigit():
            return get_object_or_404(BugReport, bug_id=pk)
        return get_object_or_404(BugReport, pk=pk)

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
        if new_status == 'Closed':
            current_status = (bug.status or 'Open').strip().lower()
            if current_status not in ['resolved', 'not fixed', 'notfixed', 'fixed', 'completed']:
                return Response({
                    "detail": "Cannot close bug. This bug must be marked as 'Resolved' or 'Not Fixed' by the developer first."
                }, status=status.HTTP_400_BAD_REQUEST)
        return None

    def _process_patch_flags(self, data, new_status):
        tester_fields = ['title', 'description', 'severity', 'bugType', 'bug_type', 'stepsText', 'steps_text']
        if any(f in data for f in tester_fields):
            data['tester_edited'] = True
            data['testerEdited'] = True
            
        if new_status or data.get('tester_edited') is False or data.get('testerEdited') is False:
            data['tester_edited'] = False
            data['testerEdited'] = False

        if new_status and new_status.strip().lower() in ['resolved', 'fixed']:
            data['dev_resolved'] = True
            data['devResolved'] = True

        if any(f in data for f in tester_fields) or (new_status in ['Open', 'Closed']) or data.get('dev_resolved') is False or data.get('devResolved') is False:
            data['dev_resolved'] = False
            data['devResolved'] = False
        return data

    def _send_patch_notifications(self, updated_bug, new_status, old_status):
        if not new_status or new_status == old_status:
            return
            
        msg = f'Bug [{updated_bug.bug_id}] status updated to "{updated_bug.status}"'
        if new_status in ['Open', 'Closed', 'Not Fixed'] and updated_bug.developer_name and updated_bug.developer_name != 'Unassigned':
            dev_name_clean = updated_bug.developer_name.split('(')[0].strip()
            dev_email = ''
            try:
                emp = Employee.objects.filter(name__icontains=dev_name_clean, role='Developer').first()
                if emp:
                    dev_email = emp.company_email
            except Exception:
                pass

            Notification.objects.create(
                recipient_email=dev_email or '',
                recipient_name=dev_name_clean,
                recipient_role='Developer',
                recipient_id=updated_bug.developer_id or 'DEV001',
                notification_type='bug_updated',
                message=msg,
                bug_report=updated_bug
            )

    def patch(self, request, pk):
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
            self._send_patch_notifications(updated_bug, new_status, old_status)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        bug = self._get_bug(pk)
        bug.delete()
        return Response({'message': 'Bug deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


class NotificationListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        email = request.query_params.get('email') or request.query_params.get('recipient_email')
        role = request.query_params.get('role') or request.query_params.get('recipient_role')
        recipient_id = request.query_params.get('recipient_id') or request.query_params.get('recipientId')
        
        notifications = Notification.objects.all().order_by('-created_at')
        
        if role:
            notifications = notifications.filter(recipient_role__iexact=role)
        if recipient_id:
            notifications = notifications.filter(
                Q(recipient_id__iexact=recipient_id) |
                Q(recipient_name__icontains=recipient_id)
            )
        if email:
            notifications = notifications.filter(recipient_email__iexact=email)
            
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = NotificationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationDetailView(APIView):
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


class ProjectSubmissionListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        developer_name = request.query_params.get('developer_name')
        developer_id = request.query_params.get('developer_id') or request.query_params.get('developerId')
        submissions = ProjectSubmission.objects.all().order_by('-date_submitted')
        if developer_id:
            submissions = submissions.filter(Q(developer_id__iexact=developer_id) | Q(developer_name__icontains=developer_id))
        elif developer_name:
            submissions = submissions.filter(developer_name__icontains=developer_name)
        serializer = ProjectSubmissionSerializer(submissions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _send_submission_notifications(self, submission, dev_id):
        testers = Employee.objects.filter(role='Tester')
        if testers.exists():
            for tester in testers:
                Notification.objects.create(
                    recipient_email=tester.company_email,
                    recipient_name=tester.name,
                    recipient_role='Tester',
                    recipient_id=tester.employee_id,
                    notification_type='project_submitted',
                    message=f'Developer {submission.developer_name} ({dev_id}) submitted project build: "{submission.project_name}"',
                    bug_report=None,
                    project_name=submission.project_name,
                    sender_id=dev_id
                )
        else:
            Notification.objects.create(
                recipient_email='tester@bugtracker.com',
                recipient_name='Testers Team',
                recipient_role='Tester',
                recipient_id='TS001',
                notification_type='project_submitted',
                message=f'Developer {submission.developer_name} ({dev_id}) submitted project build: "{submission.project_name}"',
                bug_report=None,
                project_name=submission.project_name,
                sender_id=dev_id
            )

        Notification.objects.create(
            recipient_email='vasan11@gmail.com',
            recipient_name='Admin',
            recipient_role='Admin',
            recipient_id='ADM001',
            notification_type='project_submitted',
            message=f'Developer {submission.developer_name} ({dev_id}) submitted project build: "{submission.project_name}"',
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
        if not data.get('id'):
            data['id'] = f"BUILD-{str(int(time.time()))[-6:]}"

        dev_id = data.get('developerId') or data.get('developer_id') or 'DEV001'
        data['developer_id'] = dev_id
        
        serializer = ProjectSubmissionSerializer(data=data)
        if serializer.is_valid():
            submission = serializer.save()
            self._send_submission_notifications(submission, dev_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectSubmissionDetailView(APIView):
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

    def patch(self, request, pk):
        submission = get_object_or_404(ProjectSubmission, pk=pk)
        old_project_name = submission.project_name
        sender_id = submission.developer_id or "DEV001"

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
            project_name = submission.project_name
            sender_id = submission.developer_id or "DEV001"
            
            with transaction.atomic():
                Testing.objects.filter(project_name=project_name, sender_id=sender_id).delete()
                Notification.objects.filter(project_name=project_name, sender_id=sender_id).delete()
                submission.delete()
                
            return Response({
                "success": True,
                "message": "Project and all related records deleted successfully."
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