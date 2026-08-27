from django.db import models

class BugReport(models.Model):
    id = models.BigAutoField(primary_key=True)
    bug_id = models.CharField(max_length=20)
    title = models.CharField(max_length=300)
    description = models.TextField()
    severity = models.CharField(max_length=20)
    bug_type = models.CharField(max_length=30)
    status = models.CharField(max_length=20, default='Open')
    dev_status = models.CharField(max_length=50, default='In Progress', blank=True)
    module = models.CharField(max_length=200)
    steps_text = models.TextField(blank=True)
    files = models.JSONField(default=list, blank=True, null=True)
    tester_email = models.EmailField(max_length=254)
    tester_name = models.CharField(max_length=150)
    tester_id = models.CharField(max_length=50, blank=True,  verbose_name='Tester Employee ID')
    developer_name = models.CharField(max_length=150, default='Unassigned')
    developer_id = models.CharField(max_length=50, blank=True,  verbose_name='Developer Employee ID')
    due_date = models.DateField(blank=True, null=True)
    tester_edited = models.BooleanField(default=False)
    dev_resolved = models.BooleanField(default=False)
    assigned_on = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bugs_bugreport'
        verbose_name = 'Bug Report'
        verbose_name_plural = 'Bug Reports'

    def __str__(self):
        return f"{self.bug_id}: {self.title}"


class Notification(models.Model):
    id = models.BigAutoField(primary_key=True)
    recipient_email = models.EmailField(max_length=254)
    recipient_name = models.CharField(max_length=150)
    recipient_role = models.CharField(max_length=20) # 'Admin', 'Developer', 'Tester'
    recipient_id = models.CharField(max_length=50, blank=True,  verbose_name='Recipient Employee ID')
    notification_type = models.CharField(max_length=30) # e.g. 'bug_created', 'bug_updated', etc.
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    bug_report = models.ForeignKey(BugReport, on_delete=models.SET_NULL, blank=True, null=True)
    project_name = models.CharField(max_length=200, blank=True,verbose_name='Project Name')
    sender_id = models.CharField(max_length=50, blank=True,verbose_name='Sender ID')

    class Meta:
        db_table = 'bugs_notification'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'

    def __str__(self):
        return f"{self.recipient_name} ({self.recipient_role}): {self.message[:40]}"


class Testing(models.Model):
    id = models.BigAutoField(primary_key=True)
    project_name = models.CharField(max_length=200, verbose_name='Project Name')
    sender_id = models.CharField(max_length=50, verbose_name='Sender ID')
    status = models.CharField(max_length=50, default='Pending')
    assigned_tester = models.CharField(max_length=150, blank=True,)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bugs_testing'
        verbose_name = 'Testing'
        verbose_name_plural = 'Testings'

    def __str__(self):
        return f"Testing for {self.project_name}"


class ProjectSubmission(models.Model):
    id = models.CharField(max_length=50, primary_key=True) # e.g. "BUILD-123456"
    project_name = models.CharField(max_length=200)
    developer_name = models.CharField(max_length=150) # e.g. "Vasanthan (DEV001)"
    developer_id = models.CharField(max_length=50, blank=True,  verbose_name='Developer Employee ID')
    version = models.CharField(max_length=50, default='v0.1', blank=True, verbose_name='Build Version')
    subject = models.CharField(max_length=300)
    date_submitted = models.DateTimeField(auto_now_add=True)
    project_link = models.CharField(max_length=500, blank=True,  verbose_name='Project Link / URL')
    status = models.CharField(max_length=20, default='Unread') # 'Unread' | 'Read' | 'Accepted'
    downloaded = models.BooleanField(default=False)
    claimed_by = models.CharField(max_length=150, blank=True) # e.g. "Kamatchi"
    claimed_by_id = models.CharField(max_length=50, blank=True) # e.g. "TS001"

    class Meta:
        db_table = 'bugs_projectsubmission'
        verbose_name = 'Project Submission'
        verbose_name_plural = 'Project Submissions'

    def __str__(self):
        return f"{self.project_name} by {self.developer_name}"

