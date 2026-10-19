from rest_framework import serializers
from .models import Room

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Room
        fields = ["id", "name", "capacity", "objective"]

    def validate_capacity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Capacity must be greater than zero.")
        return value
