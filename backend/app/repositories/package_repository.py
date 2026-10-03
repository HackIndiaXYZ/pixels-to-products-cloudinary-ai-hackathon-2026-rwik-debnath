from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from app.db.models import PackageModel
from app.models.schemas import StoryPackageResponse

class PackageRepository:
    @staticmethod
    async def get_all(session: AsyncSession) -> List[StoryPackageResponse]:
        """Retrieves all registered story packages ordered by creation time descending."""
        stmt = select(PackageModel).order_by(PackageModel.created_at.desc())
        result = await session.execute(stmt)
        models = result.scalars().all()
        return [m.to_pydantic() for m in models]

    @staticmethod
    async def get_by_id(session: AsyncSession, event_id: str) -> Optional[StoryPackageResponse]:
        """Retrieves a single package by event_id."""
        stmt = select(PackageModel).where(PackageModel.event_id == event_id)
        result = await session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_pydantic() if model else None

    @staticmethod
    async def upsert(session: AsyncSession, package: StoryPackageResponse) -> StoryPackageResponse:
        """Inserts or updates a story package."""
        stmt = select(PackageModel).where(PackageModel.event_id == package.event_id)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        new_model = PackageModel.from_pydantic(package)
        if existing:
            for column in PackageModel.__table__.columns:
                setattr(existing, column.name, getattr(new_model, column.name))
        else:
            session.add(new_model)

        await session.commit()
        return package

    @staticmethod
    async def delete(session: AsyncSession, event_id: str) -> bool:
        """Deletes a package by event_id."""
        stmt = delete(PackageModel).where(PackageModel.event_id == event_id)
        result = await session.execute(stmt)
        await session.commit()
        return (result.rowcount or 0) > 0

    @staticmethod
    async def clear(session: AsyncSession) -> int:
        """Clears all packages from the database."""
        stmt = delete(PackageModel)
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount or 0

    @staticmethod
    async def count(session: AsyncSession) -> int:
        """Returns total number of packages."""
        stmt = select(func.count(PackageModel.event_id))
        result = await session.execute(stmt)
        return result.scalar() or 0
