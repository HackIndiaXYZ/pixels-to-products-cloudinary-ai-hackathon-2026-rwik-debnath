from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from app.db.models import AssetModel
from app.models.schemas import MediaAssetResponse

class AssetRepository:
    @staticmethod
    async def get_all(session: AsyncSession, include_archived: bool = True) -> List[MediaAssetResponse]:
        """Retrieves all assets ordered by creation time descending."""
        stmt = select(AssetModel)
        if not include_archived:
            stmt = stmt.where(AssetModel.is_archived == False)
        stmt = stmt.order_by(AssetModel.created_at.desc())
        
        result = await session.execute(stmt)
        models = result.scalars().all()
        return [m.to_pydantic() for m in models]

    @staticmethod
    async def get_by_id(session: AsyncSession, public_id: str) -> Optional[MediaAssetResponse]:
        """Retrieves an individual asset by its public_id."""
        stmt = select(AssetModel).where(AssetModel.public_id == public_id)
        result = await session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_pydantic() if model else None

    @staticmethod
    async def upsert(session: AsyncSession, asset: MediaAssetResponse) -> MediaAssetResponse:
        """Inserts or updates an asset in the database."""
        stmt = select(AssetModel).where(AssetModel.public_id == asset.public_id)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        new_model = AssetModel.from_pydantic(asset)
        if existing:
            # Update fields
            for column in AssetModel.__table__.columns:
                setattr(existing, column.name, getattr(new_model, column.name))
        else:
            session.add(new_model)

        await session.commit()
        return asset

    @staticmethod
    async def delete(session: AsyncSession, public_id: str) -> bool:
        """Deletes an asset by its public_id."""
        stmt = delete(AssetModel).where(AssetModel.public_id == public_id)
        result = await session.execute(stmt)
        await session.commit()
        return (result.rowcount or 0) > 0

    @staticmethod
    async def batch_delete(session: AsyncSession, public_ids: List[str]) -> int:
        """Deletes multiple assets by their public_ids."""
        if not public_ids:
            return 0
        stmt = delete(AssetModel).where(AssetModel.public_id.in_(public_ids))
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount or 0

    @staticmethod
    async def clear(session: AsyncSession) -> int:
        """Clears all assets from the database."""
        stmt = delete(AssetModel)
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount or 0

    @staticmethod
    async def count(session: AsyncSession) -> int:
        """Returns total number of stored assets."""
        stmt = select(func.count(AssetModel.public_id))
        result = await session.execute(stmt)
        return result.scalar() or 0
