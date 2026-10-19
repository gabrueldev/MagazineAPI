from django.urls import path
from .views import ListRoomView, CreateRoomView, EditRoomView, DeleteRoomView

urlpatterns = [
    path('', ListRoomView.as_view(), name="listRooms"),
    path('create/', CreateRoomView.as_view(), name="createRoom"),
    path('edit/<int:id>/', EditRoomView.as_view(), name="editRoom"),
    path('delete/<int:id>/', DeleteRoomView.as_view(), name="deleteRoom"),
]
