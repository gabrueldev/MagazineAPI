from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Room

class RoomSerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        max_length=20,
        validators=[UniqueValidator(queryset=Room.objects.all(), message="Já existe uma sala com esse nome.")],
    )

    class Meta:
        model  = Room
        fields = ["id", "name", "capacity", "objective"]

    def validate_capacity(self, value):
        if value <= 0:
            raise serializers.ValidationError("A capacidade precisa ser maior que zero.")
        return value
