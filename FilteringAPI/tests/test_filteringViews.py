import pytest

@pytest.mark.django_db
def test_filtrar_sala_por_nome(client, room):
    response = client.get(f"/api/filter/rooms/{room.name}/")
    assert response.status_code == 200
    assert response.data["capacity"] == room.capacity

@pytest.mark.django_db
def test_filtrar_agendamentos_da_sala(auth_client, room):
    auth_client.post("/api/schedules/create/", {
        "room": room.id, "start_time": "2026-01-10T15:00:00Z", "end_time": "2026-01-10T16:00:00Z"
    })
    response = auth_client.get(f"/api/filter/schedules/{room.name}/")
    assert response.status_code == 200
    assert len(response.data) == 1

@pytest.mark.django_db
def test_listar_tabela(client, room):
    response = client.get("/api/list/rooms/")
    assert response.status_code == 200
    assert len(response.data) == 1

@pytest.mark.django_db
def test_tabela_inexistente(client):
    assert client.get("/api/list/usuarios/").status_code == 404
    assert client.get("/api/filter/rooms/naoexiste/").status_code == 404
