from rest_framework import serializers

from .models import Schedules

class SchedulesSerializers(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Schedules
        fields = ['id', 'room', 'created_by', 'start_time', 'end_time']
    
    def validate(self, data):
        start = data.get('start_time', getattr(self.instance, 'start_time', None))
        end   = data.get('end_time', getattr(self.instance, 'end_time', None))
        room  = data.get('room', getattr(self.instance, 'room', None))

        if end <= start:
            raise serializers.ValidationError("End time must be after start time.")

        starts_before_the_other_ends = dict(start_time__lt=end, end_time__gt=start)
        conflicts = Schedules.objects.filter(room=room, **starts_before_the_other_ends)

        if self.instance:
            conflicts = conflicts.exclude(pk=self.instance.pk)
        if conflicts.exists():
            raise serializers.ValidationError("Time conflict: the room is already reserved in this range.")
        return data
