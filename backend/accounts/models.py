
from django.contrib.auth.models import AbstractUser
from django.db import models


class AdminUser(AbstractUser):
   
    email = models.EmailField(unique=True, verbose_name='Email Address')
    is_temporary_password = models.BooleanField(default=False)
    temp_password_expiry = models.DateTimeField(null=True, blank=True)

    # Use email as the login field instead of username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'Admin User'
        verbose_name_plural = 'Admin Users'

    def __str__(self):
        return self.email
