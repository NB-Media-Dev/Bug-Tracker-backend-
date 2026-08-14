from django.urls import path
from .views import (
    BugReportListCreateView,
    BugReportDetailView,
    NotificationListCreateView,
    NotificationDetailView,
    ProjectSubmissionListCreateView,
    ProjectSubmissionDetailView,
)

urlpatterns = [
    path('bugs/', BugReportListCreateView.as_view(), name='bug-list-create'),
    path('bugs/notifications/', NotificationListCreateView.as_view(), name='notification-list-create'),
    path('bugs/notifications/<int:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('bugs/submissions/', ProjectSubmissionListCreateView.as_view(), name='submission-list-create'),
    path('bugs/submissions/<str:pk>/', ProjectSubmissionDetailView.as_view(), name='submission-detail'),
    path('bugs/<str:pk>/', BugReportDetailView.as_view(), name='bug-detail'),
]
