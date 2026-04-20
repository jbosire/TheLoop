from fastapi import APIRouter

from app.dependencies import CurrentUserDep, DBDep
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserInAuthResponse,
)
from app.services import auth_service
from app.utils.redis import get_redis

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201, response_model=AuthResponse)
async def register(data: RegisterRequest, db: DBDep) -> AuthResponse:
    user, access_token, refresh_token = await auth_service.register(data, db, get_redis())
    return AuthResponse(
        user=UserInAuthResponse.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: DBDep) -> AuthResponse:
    user, access_token, refresh_token = await auth_service.login(data, db, get_redis())
    return AuthResponse(
        user=UserInAuthResponse.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest) -> TokenResponse:
    access_token, refresh_token = await auth_service.refresh_tokens(data.refresh_token, get_redis())
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=204)
async def logout(data: LogoutRequest, _user_id: CurrentUserDep) -> None:
    await auth_service.logout(data.refresh_token, get_redis())
