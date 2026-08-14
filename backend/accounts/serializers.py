"""
accounts/serializers.py

Serializers for admin authentication.
"""

from rest_framework import serializers
from django.contrib.auth import authenticate


class LoginSerializer(serializers.Serializer):
    """
    Validates admin login credentials.
    Returns the authenticated user object on success.
    """
    email = serializers.EmailField(
        required=True,
        error_messages={'required': 'Email is required.', 'invalid': 'Enter a valid email address.'}
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        error_messages={'required': 'Password is required.'}
    )

    def validate(self, data):
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        # Authenticate using email as username (Django's authenticate uses USERNAME_FIELD)
        user = authenticate(username=email, password=password)

        if user is None:
            raise serializers.ValidationError(
                {'detail': 'Invalid email or password. Please try again.'}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {'detail': 'This account has been deactivated. Contact support.'}
            )

        data['user'] = user
        return data


class AdminProfileSerializer(serializers.Serializer):
    """
    Returns basic admin profile info embedded in the login response.
    """
    id = serializers.IntegerField()
    email = serializers.EmailField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    is_staff = serializers.BooleanField()
