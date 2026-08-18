"""
accounts/urls.py

URL routes for admin authentication.
"""

from django.urls import path
from .views import LoginView, LogoutView, MeView, AdminChangePasswordView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('change-password/', AdminChangePasswordView.as_view(), name='auth-change-password'),
]
