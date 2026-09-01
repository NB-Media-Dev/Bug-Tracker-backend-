from django.db import models


class Employee(models.Model):
    ROLE_CHOICES = [
        ('Developer', 'Developer'),
        ('Tester', 'Tester'),
        ('CTO', 'CTO'),
    ]

    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ]

    ROLE_PREFIX = {
        'Tester': 'Ts',
        'Developer': 'Dev',
        'CTO': 'Cto',
    }

    employee_id = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        verbose_name='Employee ID'
    )
    name = models.CharField(max_length=150, verbose_name='Full Name')
    company_email = models.EmailField(unique=True, db_index=True, verbose_name='Company Email')
    company_password_hash = models.CharField(max_length=255, verbose_name='Company Password (hashed)')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Developer')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Inactive', db_index=True, verbose_name='Account Status')
    is_online = models.BooleanField(default=False, verbose_name='Is Online')
    last_login = models.DateTimeField(null=True, blank=True, verbose_name='Last Login')
    invite_sent = models.BooleanField(default=False, verbose_name='Invite Email Sent')
    is_deleted = models.BooleanField(default=False, db_index=True, verbose_name='Is Deleted (Soft Delete)')
    is_temporary_password = models.BooleanField(default=False, verbose_name='Is Temporary Password')
    temp_password_expiry = models.DateTimeField(null=True, blank=True, verbose_name='Temporary Password Expiry')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='Created At')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Employee'
        verbose_name_plural = 'Employees'

    @classmethod
    def generate_employee_id(cls, role='Developer'):
        import re
        max_num = 0
        for emp in cls.objects.all():
            if emp.employee_id:
                match = re.match(r'^[A-Za-z]+(\d+)$', emp.employee_id)
                if match:
                    num = int(match.group(1))
                    if num > max_num:
                        max_num = num
        
        prefix = cls.ROLE_PREFIX.get(role, 'Dev')
        return f"{prefix}{max_num + 1:03d}"

    def save(self, *args, **kwargs):
        if not self.employee_id:
            self.employee_id = Employee.generate_employee_id(self.role)
        else:
            import re
            match = re.match(r'^[A-Za-z]+(\d+)$', self.employee_id)
            if match:
                num_str = match.group(1)
                prefix = self.ROLE_PREFIX.get(self.role, 'Dev')
                self.employee_id = f"{prefix}{num_str}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [{self.employee_id}] ({self.company_email})"
