

from django.contrib import admin
from .models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('name', 'company_email', 'role', 'invite_sent', 'created_at')
    list_filter = ('role', 'invite_sent')
    search_fields = ('name', 'company_email')
    ordering = ('-created_at',)
    readonly_fields = ('company_password_hash', 'created_at')
