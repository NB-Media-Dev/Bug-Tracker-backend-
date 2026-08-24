"""
accounts/views.py

Admin authentication endpoints.

POST /api/auth/login/   — returns JWT access + refresh tokens
POST /api/auth/logout/  — client-side token removal (stateless JWT)
GET  /api/auth/me/      — returns current admin profile
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, AdminProfileSerializer


from django.utils import timezone

class LoginView(APIView):
    """
    POST /api/auth/login/
    Authenticates the admin and returns JWT tokens + profile data.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']

        # Check temporary password expiration
        if user.is_temporary_password:
            if user.temp_password_expiry and timezone.now() > user.temp_password_expiry:
                return Response(
                    {'detail': 'Temporary password has expired. Please request a new password.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Build the admin profile payload
        profile = AdminProfileSerializer({
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
        })

        return Response(
            {
                'access': access_token,
                'refresh': refresh_token,
                'user': profile.data,
                'require_password_change': user.is_temporary_password,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token (stateless JWT logout).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            # Even if blacklisting fails, respond success — client clears storage
            pass

        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class MeView(APIView):
    """
    GET /api/auth/me/
    Returns the currently authenticated admin's profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = AdminProfileSerializer({
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
        })
        return Response(profile.data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        name = request.data.get('name') or request.data.get('username')
        if name:
            user.username = name
            user.first_name = name
            user.save()
        profile = AdminProfileSerializer({
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
        })
        return Response(profile.data, status=status.HTTP_200_OK)


class AdminChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Updates the admin or employee user's password in database.
    Verifies current password and updates password hash.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not new_password:
            return Response(
                {'detail': 'New password is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from accounts.models import AdminUser
        from users.models import Employee
        from django.contrib.auth.hashers import make_password, check_password
        from django.db.models import Q

        # Check AdminUser model
        admin_user = None
        if email:
            admin_user = AdminUser.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first()

        if admin_user:
            if current_password and not (admin_user.check_password(current_password) or admin_user.password == current_password):
                return Response(
                    {'detail': 'Incorrect current password.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            admin_user.set_password(new_password)
            admin_user.is_temporary_password = False
            admin_user.temp_password_expiry = None
            admin_user.save()

            # Keep linked Employee record in sync if exists
            Employee.objects.filter(
                Q(company_email__iexact=admin_user.email) | Q(company_email__iexact=email)
            ).update(
                company_password_hash=make_password(new_password),
                is_temporary_password=False,
                temp_password_expiry=None
            )

            return Response(
                {'message': 'Password updated successfully.'},
                status=status.HTTP_200_OK
            )

        # Check Employee model
        if email:
            employee = Employee.objects.filter(Q(company_email__iexact=email) | Q(employee_id__iexact=email)).first()
            if employee:
                if current_password:
                    is_valid = check_password(current_password, employee.company_password_hash) or (employee.company_password_hash == current_password)
                    if not is_valid:
                        return Response(
                            {'detail': 'Incorrect current password.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                employee.company_password_hash = make_password(new_password)
                employee.is_temporary_password = False
                employee.temp_password_expiry = None
                employee.save()

                return Response(
                    {'message': 'Password updated successfully.'},
                    status=status.HTTP_200_OK
                )

        return Response(
            {'detail': 'User account not found. Please check your email.'},
            status=status.HTTP_404_NOT_FOUND
        )

