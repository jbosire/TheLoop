from uuid import UUID

from fastapi import APIRouter, Query

from app.dependencies import CurrentUserDep, DBDep
from app.schemas.user import UpdateProfileRequest, UserPublicResponse, UserResponse
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(user_id: CurrentUserDep, db: DBDep) -> UserResponse:
    user = await user_service.get_by_id(user_id, db)
    return UserResponse.model_validate(user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UpdateProfileRequest, user_id: CurrentUserDep, db: DBDep
) -> UserResponse:
    user = await user_service.update_profile(user_id, data, db)
    return UserResponse.model_validate(user)


@router.get("/search", response_model=list[UserPublicResponse])
async def search_users(
    q: str = Query(min_length=1),
    _user_id: CurrentUserDep = ...,
    db: DBDep = ...,
) -> list[UserPublicResponse]:
    users = await user_service.search(q, db)
    return [UserPublicResponse.model_validate(u) for u in users]


@router.get("/{target_user_id}", response_model=UserPublicResponse)
async def get_user(
    target_user_id: UUID, _user_id: CurrentUserDep, db: DBDep
) -> UserPublicResponse:
    user = await user_service.get_by_id(target_user_id, db)
    return UserPublicResponse.model_validate(user)
