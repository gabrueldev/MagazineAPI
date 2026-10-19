from django.urls import path

from .views import ListScheduleView, CreateScheduleView, EditScheduleView, DeleteScheduleView

urlpatterns = [
    path('', ListScheduleView.as_view(), name="list-schedules"),
    path('create/', CreateScheduleView.as_view(), name="create-schedule"),
    path('edit/<int:id>/', EditScheduleView.as_view(), name="edit-schedule"),
    path('remove/<int:id>/', DeleteScheduleView.as_view(), name="delete-schedule"),
]
