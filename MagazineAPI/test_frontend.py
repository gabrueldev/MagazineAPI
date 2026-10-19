import pytest


@pytest.mark.parametrize("path, content_type", [
    pytest.param("/", "text/html", id="pagina"),
    pytest.param("/app/app.js", "javascript", id="script"),
    pytest.param("/app/style.css", "text/css", id="estilo"),
])
def test_frontend_e_servido_pelo_django(client, path, content_type):
    response = client.get(path)
    assert response.status_code == 200
    assert content_type in response["Content-Type"]
