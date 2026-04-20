import pytest
from httpx import AsyncClient

REGISTER_PAYLOAD = {
    "first_name": "Alice",
    "last_name": "Smith",
    "username": "alice",
    "email": "alice@example.com",
    "password": "securepass1",
}


async def _register(client: AsyncClient, payload: dict | None = None) -> dict:
    resp = await client.post("/api/auth/register", json=payload or REGISTER_PAYLOAD)
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_register_returns_tokens(client: AsyncClient) -> None:
    data = await _register(client)
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["username"] == "alice"
    assert data["user"]["email"] == "alice@example.com"
    assert "password" not in data["user"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    await _register(client)
    resp = await client.post(
        "/api/auth/register",
        json={**REGISTER_PAYLOAD, "username": "alice2"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient) -> None:
    await _register(client)
    resp = await client.post(
        "/api/auth/register",
        json={**REGISTER_PAYLOAD, "email": "other@example.com"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient) -> None:
    await _register(client)
    resp = await client.post(
        "/api/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient) -> None:
    await _register(client)
    resp = await client.post(
        "/api/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": "wrongpassword"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient) -> None:
    data = await _register(client)
    resp = await client.post("/api/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert resp.status_code == 200
    refreshed = resp.json()
    assert "access_token" in refreshed
    assert "refresh_token" in refreshed


@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient) -> None:
    """Old refresh token must be invalid after rotation."""
    data = await _register(client)
    old_refresh = data["refresh_token"]

    resp = await client.post("/api/auth/refresh", json={"refresh_token": old_refresh})
    assert resp.status_code == 200

    # Re-using the old token should now fail
    resp2 = await client.post("/api/auth/refresh", json={"refresh_token": old_refresh})
    assert resp2.status_code == 401


@pytest.mark.asyncio
async def test_logout(client: AsyncClient) -> None:
    data = await _register(client)
    resp = await client.post(
        "/api/auth/logout",
        json={"refresh_token": data["refresh_token"]},
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert resp.status_code == 204

    # Refresh should now fail
    resp2 = await client.post("/api/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert resp2.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_requires_token(client: AsyncClient) -> None:
    resp = await client.get("/api/users/me")
    assert resp.status_code == 403  # HTTPBearer returns 403 when header is missing


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient) -> None:
    data = await _register(client)
    resp = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["username"] == "alice"
