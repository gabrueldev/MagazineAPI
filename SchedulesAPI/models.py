from django.db import models
from RoomsAPI.models import Room
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

class Schedules(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    class Meta:
        ordering = ["-start_time"]
    
    def __str__(self):
        return f"{self.room} - {self.start_time} at {self.end_time}."

    def clean(self):
        if self.end_time <= self.start_time:
            raise ValidationError("O horário de término precisa ser depois do início.")
        conflicts = Schedules.objects.filter(
            room           = self.room,
            start_time__lt = self.end_time,
            end_time__gt   = self.start_time
        )
        if self.pk:
            conflicts = conflicts.exclude(pk=self.pk)
        if conflicts.exists():
            raise ValidationError({"__all__": "Conflito de horário: a sala já está reservada nesse intervalo."})
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)