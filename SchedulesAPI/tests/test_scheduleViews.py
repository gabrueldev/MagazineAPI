import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User

from SchedulesAPI.models import Schedules

def horario(room, inicio, fim):
    return {"room": room.id, "start_time": f"2026-01-10T{inicio}:00Z", "end_time": f"2026-01-10T{fim}:00Z"}

@pytest.mark.django_db
def test_criar_agendamento(auth_client, room, user):
    response = auth_client.post("/api/schedules/create/", horario(room, "15:00", "16:00"))
    assert response.status_code == 201
    assert response.data["created_by"] == user.username

@pytest.mark.django_db
def test_agendamento_sem_login(client, room):
    response = client.post("/api/schedules/create/", horario(room, "15:00", "16:00"))
    assert response.status_code == 401

@pytest.mark.django_db
def test_fim_antes_do_inicio(auth_client, room):
    response = auth_client.post("/api/schedules/create/", horario(room, "16:00", "15:00"))
    assert response.status_code == 400

@pytest.mark.django_db
@pytest.mark.parametrize("inicio, fim", [
    pytest.param("15:30", "16:30", id="comeca-no-meio-do-existente"),
    pytest.param("14:30", "15:30", id="termina-no-meio-do-existente"),
    pytest.param("15:15", "15:45", id="fica-dentro-do-existente"),
    pytest.param("14:00", "17:00", id="engloba-o-existente"),
])
def test_conflito_de_horario(auth_client, room, inicio, fim):
    auth_client.post("/api/schedules/create/", horario(room, "15:00", "16:00"))
    response = auth_client.post("/api/schedules/create/", horario(room, inicio, fim))
    assert response.status_code == 400

@pytest.mark.django_db
def test_horarios_encostados_nao_conflitam(auth_client, room):
    auth_client.post("/api/schedules/create/", horario(room, "15:00", "16:00"))
    response = auth_client.post("/api/schedules/create/", horario(room, "16:00", "17:00"))
    assert response.status_code == 201

@pytest.mark.django_db
def test_listar_com_filtros(auth_client, room):
    auth_client.post("/api/schedules/create/", horario(room, "15:00", "16:00"))

    assert len(auth_client.get(f"/api/schedules/?room={room.id}").data) == 1
    assert len(auth_client.get("/api/schedules/?date=2026-01-10").data) == 1
    assert len(auth_client.get("/api/schedules/?date=2026-01-11").data) == 0
    assert auth_client.get("/api/schedules/?date=ontem").status_code == 400

@pytest.mark.django_db
def test_editar_agendamento(auth_client, room):
    criado = auth_client.post("/api/schedules/create/", horario(room, "15:00", "16:00")).data
    response = auth_client.patch(f"/api/schedules/edit/{criado['id']}/", {"end_time": "2026-01-10T17:00:00Z"})
    assert response.status_code == 200

@pytest.mark.django_db
def test_so_o_dono_remove(auth_client, room):
    criado = auth_client.post("/api/schedules/create/", horario(room, "15:00", "16:00")).data

    outro = APIClient()
    outro.force_authenticate(user=User.objects.create_user(username="outro", password="senhaforte123"))
    assert outro.delete(f"/api/schedules/remove/{criado['id']}/").status_code == 403

    assert auth_client.delete(f"/api/schedules/remove/{criado['id']}/").status_code == 204
    assert not Schedules.objects.exists()
