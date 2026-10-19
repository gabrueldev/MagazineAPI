import pytest
from Logs.models import Log

CREDENCIAIS = {"username": "joao", "email": "joao@example.com", "password": "senhaforte123"}

@pytest.mark.django_db
def test_cadastro_devolve_token(client):
    response = client.post("/api/auth/cadaster/", CREDENCIAIS)
    assert response.status_code == 201
    assert "token" in response.data
    assert Log.objects.filter(text__contains="joao").exists()

@pytest.mark.django_db
def test_login_e_logout(client):
    client.post("/api/auth/cadaster/", CREDENCIAIS)

    response = client.post("/api/auth/login/", {"username": "joao", "password": "senhaforte123"})
    assert response.status_code == 200
    token = response.data["token"]

    client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    assert client.post("/api/auth/logout/").status_code == 200

    # Depois do logout o token antigo não vale mais
    assert client.post("/api/auth/logout/").status_code == 401

@pytest.mark.django_db
def test_login_senha_errada(client):
    client.post("/api/auth/cadaster/", CREDENCIAIS)
    response = client.post("/api/auth/login/", {"username": "joao", "password": "errada"})
    assert response.status_code == 400
