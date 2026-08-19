import re
from rest_framework import serializers
from .models import BugReport, Notification, ProjectSubmission
from users.models import Employee

class BugReportSerializer(serializers.ModelSerializer):
    bugId = serializers.CharField(source='bug_id', required=False)
    bugType = serializers.CharField(source='bug_type', required=False, allow_blank=True)
    devStatus = serializers.CharField(source='dev_status', required=False, allow_blank=True, allow_null=True)
    stepsText = serializers.CharField(source='steps_text', required=False, allow_blank=True)
    testerName = serializers.CharField(source='tester_name', required=False, allow_blank=True)
    testerEmail = serializers.CharField(source='tester_email', required=False, allow_blank=True)
    testerId = serializers.SerializerMethodField()
    developerName = serializers.CharField(source='developer_name', required=False, allow_blank=True)
    developerId = serializers.SerializerMethodField()
    dueDate = serializers.DateField(source='due_date', required=False, allow_null=True)
    assignedOn = serializers.SerializerMethodField()
    testerEdited = serializers.BooleanField(source='tester_edited', required=False)
    devResolved = serializers.BooleanField(source='dev_resolved', required=False)
    class Meta:
        model = BugReport
        fields = [
            'id', 'bug_id', 'bugId', 'title', 'description', 'severity',
            'bug_type', 'bugType', 'status', 'dev_status', 'devStatus', 'module',
            'steps_text', 'stepsText',
            'files', 'tester_email', 'testerEmail', 'tester_name', 'testerName',
            'tester_id', 'testerId', 'developer_name', 'developerName', 'developer_id', 'developerId',
            'due_date', 'dueDate', 'assigned_on', 'assignedOn', 'created_at', 'updated_at',
            'tester_edited', 'testerEdited', 'dev_resolved', 'devResolved'
        ]
        extra_kwargs = {
            'bug_id': {'required': False},
            'files': {'required': False},
            'bug_type': {'required': False, 'allow_blank': True},
            'dev_status': {'required': False, 'allow_blank': True},
            'steps_text': {'required': False, 'allow_blank': True},
            'tester_email': {'required': False, 'allow_blank': True},
            'tester_name': {'required': False, 'allow_blank': True},
            'tester_id': {'required': False, 'allow_blank': True},
            'developer_name': {'required': False, 'allow_blank': True},
            'developer_id': {'required': False, 'allow_blank': True},
        }
    def to_internal_value(self, data):
        data = data.copy()
        data.pop('expectedResult', None)
        data.pop('expected_result', None)

        field_mappings = [
            ('bugId', 'bug_id'),
            ('developerId', 'developer_id'),
            ('developerName', 'developer_name'),
            ('testerId', 'tester_id'),
            ('testerName', 'tester_name'),
            ('testerEmail', 'tester_email'),
            ('testerEdited', 'tester_edited'),
            ('devResolved', 'dev_resolved'),
        ]
        for camel_key, snake_key in field_mappings:
            if camel_key in data and snake_key not in data:
                data[snake_key] = data[camel_key]

        new_status = (
            data.get('status') or 
            data.get('testerStatus') or 
            data.get('devStatus') or 
            data.get('dev_status')
        )
        if new_status:
            data['status'] = new_status
            data['dev_status'] = new_status

        data.pop('testerStatus', None)
        data.pop('devStatus', None)

        return super().to_internal_value(data)
    
    def get_assignedOn(self, obj):
        if not obj.assigned_on:
            return ''
        return obj.assigned_on.strftime('%d %b %Y')
    def get_developerId(self, obj):
        if obj.developer_id and obj.developer_id != 'N/A':
            return obj.developer_id
        if not obj.developer_name or obj.developer_name == 'Unassigned':
            return 'N/A'
        match = re.search(r'\((DEV\d+|EMP\d+)\)', obj.developer_name, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        return 'DEV001'

    def get_testerId(self, obj):
        if obj.tester_id and obj.tester_id != 'N/A':
            return obj.tester_id
        if not obj.tester_name:
            return 'N/A'
        match = re.search(r'\((TS\d+|TST\d+)\)', obj.tester_name, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        return 'TS001'
class NotificationSerializer(serializers.ModelSerializer):
    bugReportId = serializers.IntegerField(source='bug_report_id', required=False, allow_null=True)
    recipientId = serializers.CharField(source='recipient_id', required=False, allow_blank=True, allow_null=True)
    severity = serializers.SerializerMethodField()
    bug_id = serializers.SerializerMethodField()
    bug_title = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient_email', 'recipient_name', 'recipient_role',
            'recipient_id', 'recipientId', 'notification_type', 'message',
            'is_read', 'created_at', 'bug_report', 'bugReportId',
            'project_name', 'sender_id', 'severity', 'bug_id', 'bug_title'
        ]

    def get_severity(self, obj):
        if obj.bug_report:
            return obj.bug_report.severity
        return 'Medium'

    def get_bug_id(self, obj):
        if obj.bug_report:
            return obj.bug_report.bug_id
        return ''

    def get_bug_title(self, obj):
        if obj.bug_report:
            return obj.bug_report.title
        return ''

    def to_internal_value(self, data):
        data = data.copy()
        if 'recipientId' in data and 'recipient_id' not in data:
            data['recipient_id'] = data['recipientId']
        return super().to_internal_value(data)


class ProjectSubmissionSerializer(serializers.ModelSerializer):
    projectName = serializers.CharField(source='project_name', required=False, allow_blank=True)
    developerName = serializers.CharField(source='developer_name', required=False, allow_blank=True)
    developerId = serializers.CharField(source='developer_id', required=False, allow_blank=True, allow_null=True)
    projectLink = serializers.CharField(source='project_link', required=False, allow_blank=True, allow_null=True)
    claimedBy = serializers.CharField(source='claimed_by', required=False, allow_blank=True, allow_null=True)
    claimedById = serializers.CharField(source='claimed_by_id', required=False, allow_blank=True, allow_null=True)
    date = serializers.SerializerMethodField()

    class Meta:
        model = ProjectSubmission
        fields = [
            'id', 'project_name', 'projectName', 'developer_name', 'developerName',
            'developer_id', 'developerId', 'version', 'subject', 'project_link', 'projectLink',
            'status', 'downloaded', 'claimed_by', 'claimedBy', 'claimed_by_id', 'claimedById',
            'date', 'date_submitted'
        ]

    def to_internal_value(self, data):
        data = data.copy()
        if 'projectName' in data and 'project_name' not in data:
            data['project_name'] = data['projectName']
        if 'developerName' in data and 'developer_name' not in data:
            data['developer_name'] = data['developerName']
        if 'developerId' in data and 'developer_id' not in data:
            data['developer_id'] = data['developerId']
        if 'projectLink' in data and 'project_link' not in data:
            data['project_link'] = data['projectLink']
        if 'apkFile' in data and 'apk_file' not in data:
            data['apk_file'] = data['apkFile']
        if 'claimedBy' in data and 'claimed_by' not in data:
            data['claimed_by'] = data['claimedBy']
        if 'claimedById' in data and 'claimed_by_id' not in data:
            data['claimed_by_id'] = data['claimedById']
        return super().to_internal_value(data)

    def get_date(self, obj):
        if not obj.date_submitted:
            return ''
        return obj.date_submitted.strftime('%d %b %Y, %I:%M %p').lstrip('0')
