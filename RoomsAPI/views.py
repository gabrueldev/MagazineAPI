from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, DestroyAPIView, UpdateAPIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .serializers import RoomSerializer
from .models import Room
from Logs.models import logger

class ListRoomView(ListAPIView):
    queryset = Room.objects.all().order_by("name")
    serializer_class = RoomSerializer

class CreateRoomView(APIView):
    def post(self, request):
        serializer = RoomSerializer(data=request.data)
        if serializer.is_valid():
            room = serializer.save()
            logger('success_room_create', none_room=room.name)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DeleteRoomView(DestroyAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    lookup_field = 'id'

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        room_id = instance.id

        self.perform_destroy(instance)
        logger('success_room_delete', none_id=room_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EditRoomView(UpdateAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    lookup_field = 'id'

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            response = super().update(request, *args, **kwargs)
        except ValidationError as e:
            logger("failed_room_edit", none_id=instance.id)
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

        logger("success_room_edited", none_id=instance.id)
        return response
