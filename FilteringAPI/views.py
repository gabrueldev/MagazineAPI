from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from RoomsAPI.models import Room
from RoomsAPI.serializers import RoomSerializer
from SchedulesAPI.models import Schedules
from SchedulesAPI.serializers import SchedulesSerializers

MODEL_SERIALIZER_MAP = {
    'rooms': (Room, RoomSerializer),
    'schedules': (Schedules, SchedulesSerializers),
}

class DbListAPI(APIView):
    def get(self, request, dbname):
        model_info = MODEL_SERIALIZER_MAP.get(dbname)
        if not model_info:
            return Response({"detail": "Table not found."}, status=status.HTTP_404_NOT_FOUND)
        model, serializer_class = model_info
        queryset = model.objects.all()
        serializer = serializer_class(queryset, many=True)
        return Response(serializer.data)

def find_room_by_name(room_name):
    room = Room.objects.filter(name=room_name).first()
    if not room:
        return Response({"detail": "Object not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(RoomSerializer(room).data)

def list_schedules_of_room(room_name):
    schedules = Schedules.objects.filter(room__name=room_name)
    return Response(SchedulesSerializers(schedules, many=True).data)

FILTER_BY_TABLE = {
    'rooms': find_room_by_name,
    'schedules': list_schedules_of_room,
}

class FilterAPI(APIView):
    def get(self, request, dbname, objname):
        filter_function = FILTER_BY_TABLE.get(dbname)
        if not filter_function:
            return Response({"detail": "Table not found."}, status=status.HTTP_404_NOT_FOUND)
        return filter_function(objname)
