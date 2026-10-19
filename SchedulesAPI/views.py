from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import ListAPIView, UpdateAPIView, DestroyAPIView
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.exceptions import ValidationError
from django.utils.dateparse import parse_date

from .serializers import SchedulesSerializers
from .models import Schedules
from .permissions import IsOwnerOrReadOnly
from Logs.models import logger

class ListScheduleView(ListAPIView):
    serializer_class = SchedulesSerializers

    def get_queryset(self):
        queryset = Schedules.objects.select_related('room', 'created_by')
        optional_filters = self.request.query_params

        if optional_filters.get('room'):
            queryset = queryset.filter(room_id=optional_filters['room'])
        if optional_filters.get('date'):
            date = parse_date(optional_filters['date'])
            if not date:
                raise ValidationError({"date": "Use the format YYYY-MM-DD."})
            queryset = queryset.filter(start_time__date=date)
        if optional_filters.get('mine') == 'true' and self.request.user.is_authenticated:
            queryset = queryset.filter(created_by=self.request.user)
        return queryset

class CreateScheduleView(APIView):
    def post(self, request):
        serializer = SchedulesSerializers(data=request.data)
        if serializer.is_valid():
            schedule = serializer.save(created_by=request.user)
            logger("success_schedule_create", none_id=schedule.room_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EditScheduleView(UpdateAPIView):
    queryset = Schedules.objects.all()
    serializer_class = SchedulesSerializers
    lookup_field = 'id'
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_update(self, serializer):
        schedule = serializer.save()
        logger("success_schedule_edited", none_id=schedule.id)

class DeleteScheduleView(DestroyAPIView):
    queryset = Schedules.objects.all()
    serializer_class = SchedulesSerializers
    lookup_field = 'id'
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        schedule_id = instance.id

        self.perform_destroy(instance)
        logger('success_schedule_delete', none_id=schedule_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
