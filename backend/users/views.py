"""
users/views.py

Employee management API endpoints.

GET   /api/users/            — List all employees (admin only)
POST  /api/users/invite/     — Add employee + generate credentials + send invite email
POST  /api/users/login/      — Employee login (sets status=Active & is_online=True)
POST  /api/users/logout/     — Employee logout (sets is_online=False)
PATCH /api/users/<pk>/status/ — Toggle employee status (Active ↔ Inactive)
"""

import secrets
from django.db.models import Q
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Employee
from .serializers import (
    EmployeeListSerializer,
    EmployeeInviteSerializer,
    EmployeeLoginSerializer,
    EmployeeUpdateSerializer,
)
from .utils import generate_company_email, generate_strong_password
from .email_service import send_invite_email_async


class EmployeeListView(APIView):
    """
    GET /api/users/
    Returns all employees for User Management and developer/tester dropdown selection.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        role = request.query_params.get('role')
        employees = Employee.objects.all().order_by('-created_at')
        if role:
            employees = employees.filter(role__iexact=role)
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(
            {
                'count': len(serializer.data),
                'results': serializer.data,
            },
            status=status.HTTP_200_OK,
        )



class EmployeeInviteView(APIView):
    """
    POST /api/users/invite/
    Creates a new employee record and triggers non-blocking email delivery.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from accounts.models import AdminUser
        if not isinstance(request.user, AdminUser):
            return Response({'detail': 'Only Admin can create users.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = EmployeeInviteSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        name = validated['name']
        company_email = validated['email']
        role = validated.get('role', 'Developer')

        # ── Step 1: Generate company credentials ─────────────────────────────
        employee_id = Employee.generate_employee_id(role)
        plain_password = generate_strong_password(length=12)
        hashed_password = make_password(plain_password)

        # ── Step 2: Save employee to database
        employee = Employee.objects.create(
            employee_id=employee_id,
            name=name,
            company_email=company_email,
            company_password_hash=hashed_password,
            role=role,
            status='Active',
            is_online=False,
            invite_sent=True,
        )

        # ── Step 3: Trigger ASYNC email delivery (non-blocking thread) ─────────
        send_invite_email_async(
            employee_name=name,
            company_email=company_email,
            plain_password=plain_password,
            role=role,
            employee_id=employee.pk,
        )

        # ── Step 4: Return instant HTTP response ──────────────────────────────
        response_serializer = EmployeeListSerializer(employee)

        return Response(
            {
                'employee': response_serializer.data,
                'email_sent': True,
                'message': f'Invite for {name} queued and sending to {company_email}!',
            },
            status=status.HTTP_201_CREATED,
        )


class EmployeeLoginView(APIView):
    """
    POST /api/users/login/
    Employee login endpoint.
    On successful login, automatically sets:
      - status = 'Active'
      - is_online = True
      - last_login = current timestamp
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmployeeLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        password = serializer.validated_data['password']

        employee = Employee.objects.filter(Q(company_email__iexact=email) | Q(employee_id__iexact=email)).first()
        if not employee:
            return Response(
                {'detail': 'Invalid company email or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        is_valid_pwd = check_password(password, employee.company_password_hash) or (employee.company_password_hash == password)
        if not is_valid_pwd:
            return Response(
                {'detail': 'Invalid company email or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Check if the account is active
        if employee.status != 'Active':
            return Response(
                {'detail': 'Your account is currently inactive. Please contact the administrator.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check temporary password expiration
        if employee.is_temporary_password:
            if employee.temp_password_expiry and timezone.now() > employee.temp_password_expiry:
                return Response(
                    {'detail': 'Temporary password has expired. Please request a new password.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # Update status to Active and set is_online to True on login
        employee.status = 'Active'
        employee.is_online = True
        employee.last_login = timezone.now()
        employee.save(update_fields=['status', 'is_online', 'last_login'])

        employee_data = EmployeeListSerializer(employee).data
        refresh = RefreshToken.for_user(employee)

        return Response(
            {
                'message': 'Login successful!',
                'employee': employee_data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'require_password_change': employee.is_temporary_password
            },
            status=status.HTTP_200_OK
        )


class EmployeeLogoutView(APIView):
    """
    POST /api/users/logout/
    Employee logout endpoint. Sets is_online = False.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        company_email = request.data.get('email', '').strip().lower()
        if company_email:
            Employee.objects.filter(company_email=company_email).update(is_online=False)
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
    
EMPLOYEE_NOT_FOUND_MSG = 'Employee not found.'

class EmployeeDetailView(APIView):

    
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
           
            employee = Employee.objects.get(pk=pk)
        except Employee.DoesNotExist:
            return Response({'detail':EMPLOYEE_NOT_FOUND_MSG}, status=status.HTTP_404_NOT_FOUND)

        serializer = EmployeeListSerializer(employee)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        try:
            employee = Employee.objects.get(pk=pk)
        except Employee.DoesNotExist:
            return Response({'detail':EMPLOYEE_NOT_FOUND_MSG}, status=status.HTTP_404_NOT_FOUND)

        old_name = employee.name
        old_role = employee.role
        old_status = employee.status

        serializer = EmployeeUpdateSerializer(employee, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        employee.refresh_from_db()

        # Build notification summary for target employee
        changes = []
        if employee.name != old_name:
            changes.append(f"Name updated to {employee.name}")
        if employee.role != old_role:
            changes.append(f"Role changed from {old_role} to {employee.role}")
        if employee.status != old_status:
            changes.append(f"Status updated to {employee.status}")
        if request.data.get('password'):
            employee.is_temporary_password = True
            employee.temp_password_expiry = timezone.now() + timezone.timedelta(days=7)
            employee.save(update_fields=['is_temporary_password', 'temp_password_expiry'])
            changes.append("Your password was updated by Admin (Temporary Password)")

        change_msg = ". ".join(changes) if changes else "Account details updated by Admin"
        notif_message = f"Account Update Alert: {change_msg}."

        try:
            from bugs.models import Notification
            Notification.objects.create(
                recipient_email=employee.company_email,
                recipient_name=employee.name,
                recipient_role=employee.role,
                recipient_id=employee.employee_id,
                notification_type='account_updated',
                message=notif_message,
            )
            if old_role and old_role.lower() != employee.role.lower():
                Notification.objects.create(
                    recipient_email=employee.company_email,
                    recipient_name=employee.name,
                    recipient_role=old_role,
                    recipient_id=employee.employee_id,
                    notification_type='account_updated',
                    message=notif_message,
                )
        except Exception as e:
            print("Failed to create account update notification:", e)

        return Response(EmployeeListSerializer(employee).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            employee = Employee.objects.get(pk=pk)
        except Employee.DoesNotExist:
            return Response({'detail':EMPLOYEE_NOT_FOUND_MSG}, status=status.HTTP_404_NOT_FOUND)

        employee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeStatusToggleView(APIView):
    """
    PATCH /api/users/<int:pk>/status/
    Admin endpoint to manually activate or deactivate an employee account.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            employee = Employee.objects.get(pk=pk)
        except Employee.DoesNotExist:
            return Response({'detail': EMPLOYEE_NOT_FOUND_MSG}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status in ['Active', 'Inactive']:
            employee.status = new_status
            if new_status == 'Inactive':
                employee.is_online = False
            employee.save(update_fields=['status', 'is_online'])

        serializer = EmployeeListSerializer(employee)
        return Response(serializer.data, status=status.HTTP_200_OK)


class EmployeeForgotPasswordView(APIView):
    """
    POST /api/users/forgot-password/
    Generates a secure temporary/random password valid for email login.
    Supports both AdminUser and Employee (Developer, Tester) accounts.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        from accounts.models import AdminUser
        from .email_service import send_temp_password_email_async

        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        temp_password = secrets.token_urlsafe(8)[:10]

        # Check AdminUser model first for Admin accounts
        admin_user = AdminUser.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first()
        if admin_user:
            admin_user.set_password(temp_password)
            admin_user.is_temporary_password = True
            admin_user.temp_password_expiry = timezone.now() + timezone.timedelta(minutes=15)
            admin_user.save(update_fields=['password', 'is_temporary_password', 'temp_password_expiry'])

            # If an Employee record also exists for this email, keep password in sync
            employee = Employee.objects.filter(company_email__iexact=email).first()
            if employee:
                employee.company_password_hash = make_password(temp_password)
                employee.is_temporary_password = True
                employee.temp_password_expiry = timezone.now() + timezone.timedelta(minutes=15)
                employee.save(update_fields=['company_password_hash', 'is_temporary_password', 'temp_password_expiry'])

            send_temp_password_email_async(
                employee_name=admin_user.username or 'Admin',
                email=admin_user.email,
                temp_password=temp_password
            )

            return Response({
                'success': True,
                'message': 'New password has been sent to your registered admin email. You can now log in using this password.'
            }, status=status.HTTP_200_OK)

        # Check Employee model for non-admin employees
        employee = Employee.objects.filter(Q(company_email__iexact=email) | Q(employee_id__iexact=email)).first()
        if employee:
            if employee.status != 'Active':
                return Response({'detail': 'This account is inactive. Please contact the administrator.'}, status=status.HTTP_403_FORBIDDEN)

            employee.company_password_hash = make_password(temp_password)
            employee.is_temporary_password = True
            employee.temp_password_expiry = timezone.now() + timezone.timedelta(minutes=15)
            employee.save(update_fields=['company_password_hash', 'is_temporary_password', 'temp_password_expiry'])

            if employee.company_email:
                send_temp_password_email_async(
                    employee_name=employee.name,
                    email=employee.company_email,
                    temp_password=temp_password
                )

            return Response({
                'success': True,
                'message': 'Temporary password has been sent to your registered email.'
            }, status=status.HTTP_200_OK)

        return Response({'detail': 'Account with this email does not exist. Please make sure your account has been added by the administrator.'}, status=status.HTTP_404_NOT_FOUND)


class EmployeeChangePasswordView(APIView):
    """
    POST /api/users/change-password/
    Updates password in database for Employee or AdminUser.
    Supports both regular password change and temporary password reset.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        from accounts.models import AdminUser

        email = request.data.get('email', '').strip().lower()
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')
        current_password = request.data.get('current_password', '')

        if not email or not new_password:
            return Response(
                {'detail': 'Email and new password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if confirm_password and new_password != confirm_password:
            return Response({'detail': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check AdminUser model FIRST for admin accounts
        admin_user = AdminUser.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first()
        if admin_user:
            if admin_user.is_temporary_password or not current_password:
                admin_user.set_password(new_password)
                admin_user.is_temporary_password = False
                admin_user.temp_password_expiry = None
                admin_user.save(update_fields=['password', 'is_temporary_password', 'temp_password_expiry'])
            else:
                if not admin_user.check_password(current_password):
                    return Response({'detail': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)

                admin_user.set_password(new_password)
                admin_user.is_temporary_password = False
                admin_user.temp_password_expiry = None
                admin_user.save(update_fields=['password', 'is_temporary_password', 'temp_password_expiry'])

            # Keep linked Employee in sync if exists
            employee = Employee.objects.filter(company_email__iexact=email).first()
            if employee:
                employee.company_password_hash = make_password(new_password)
                employee.is_temporary_password = False
                employee.temp_password_expiry = None
                employee.save(update_fields=['company_password_hash', 'is_temporary_password', 'temp_password_expiry'])

            return Response({'success': True, 'message': 'Admin password changed successfully.'}, status=status.HTTP_200_OK)

        # Check Employee model for non-admin employees
        employee = Employee.objects.filter(Q(company_email__iexact=email) | Q(employee_id__iexact=email)).first()
        if employee:
            if employee.is_temporary_password or not current_password:
                employee.company_password_hash = make_password(new_password)
                employee.is_temporary_password = False
                employee.temp_password_expiry = None
                employee.save(update_fields=['company_password_hash', 'is_temporary_password', 'temp_password_expiry'])
            else:
                is_valid_curr = check_password(current_password, employee.company_password_hash) or (employee.company_password_hash == current_password)
                if not is_valid_curr:
                    return Response({'detail': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)

                employee.company_password_hash = make_password(new_password)
                employee.is_temporary_password = False
                employee.temp_password_expiry = None
                employee.save(update_fields=['company_password_hash', 'is_temporary_password', 'temp_password_expiry'])

            return Response({'success': True, 'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)

        return Response({'detail': 'Account with this email does not exist.'}, status=status.HTTP_404_NOT_FOUND)

