"""
accounts/management/commands/seed_admin.py

Management command to create the default admin user from .env settings.
Run with: python manage.py seed_admin

This is idempotent — safe to run multiple times.
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from accounts.models import AdminUser


class Command(BaseCommand):
    help = 'Seeds the default admin user from .env configuration'

    def handle(self, *args, **options):
        email = getattr(settings, 'ADMIN_EMAIL', 'admin@company.com')
        password = getattr(settings, 'ADMIN_PASSWORD', 'admin123')

        if AdminUser.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'Admin user "{email}" already exists. Skipping.')
            )
            return

        AdminUser.objects.create_superuser(
            username=email.split('@')[0],   # e.g. "vasan11" from "vasan11@gmail.com"
            email=email,
            password=password,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'[OK] Admin user created successfully!\n'
                f'   Email    : {email}\n'
                f'   Password : {password}\n'
                f'   (Change your password after first login!)'
            )
        )
