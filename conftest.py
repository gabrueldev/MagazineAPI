import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User

from RoomsAPI.models import Room

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def user(db):
    return User.objects.create_user(username="gabruel", password="senhaforte123")

@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client

@pytest.fixture
def room(db):
    return Room.objects.create(name="Sala 1", capacity=10, objective="Reuniões")
