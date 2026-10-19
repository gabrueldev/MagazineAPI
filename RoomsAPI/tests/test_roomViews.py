import pytest

from RoomsAPI.models import Room

SALA = {"name": "Sala 2", "capacity": 8, "objective": "Treinamento"}

@pytest.mark.django_db
def test_criar_sala(auth_client):
    response = auth_client.post("/api/rooms/create/", SALA)
    assert response.status_code == 201
    assert response.data["name"] == "Sala 2"
    assert Room.objects.count() == 1

@pytest.mark.django_db
def test_criar_sala_sem_login(client):
    response = client.post("/api/rooms/create/", SALA)
    assert response.status_code == 401

@pytest.mark.django_db
def test_nome_de_sala_repetido(auth_client, room):
    response = auth_client.post("/api/rooms/create/", {**SALA, "name": room.name})
    assert response.status_code == 400

@pytest.mark.django_db
def test_capacidade_invalida(auth_client):
    response = auth_client.post("/api/rooms/create/", {**SALA, "capacity": 0})
    assert response.status_code == 400

@pytest.mark.django_db
def test_listar_salas_sem_login(client, room):
    response = client.get("/api/rooms/")
    assert response.status_code == 200
    assert response.data[0]["name"] == room.name

@pytest.mark.django_db
def test_editar_sala(auth_client, room):
    response = auth_client.patch(f"/api/rooms/edit/{room.id}/", {"capacity": 20})
    assert response.status_code == 200
    room.refresh_from_db()
    assert room.capacity == 20

@pytest.mark.django_db
def test_deletar_sala(auth_client, room):
    response = auth_client.delete(f"/api/rooms/delete/{room.id}/")
    assert response.status_code == 204
    assert not Room.objects.exists()

@pytest.mark.django_db
def test_deletar_sala_inexistente(auth_client):
    response = auth_client.delete("/api/rooms/delete/999/")
    assert response.status_code == 404
