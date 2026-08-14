
from django.urls import path
from .views import (
    EmployeeListView,
    EmployeeInviteView,
    EmployeeLoginView,
    EmployeeLogoutView,
    EmployeeDetailView,
    EmployeeStatusToggleView,
    EmployeeChangePasswordView,
    EmployeeForgotPasswordView,
)

urlpatterns = [
    path('', EmployeeListView.as_view(), name='employee-list-root'),
    path('employee/', EmployeeListView.as_view(), name='employee-list'),
    path('invite/', EmployeeInviteView.as_view(), name='employee-invite'),
    path('login/', EmployeeLoginView.as_view(), name='employee-login'),
    path('logout/', EmployeeLogoutView.as_view(), name='employee-logout'),
    path('forgot-password/', EmployeeForgotPasswordView.as_view(), name='employee-forgot-password'),
    path('change-password/', EmployeeChangePasswordView.as_view(), name='employee-change-password'),
    path('<int:pk>/', EmployeeDetailView.as_view(), name='employee-detail'),
    path('<int:pk>/status/', EmployeeStatusToggleView.as_view(), name='employee-status-toggle'),
]
