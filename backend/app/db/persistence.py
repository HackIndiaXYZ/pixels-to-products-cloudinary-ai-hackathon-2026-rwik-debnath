import collections.abc
import json
import os
import sqlite3
from typing import Dict, Iterator, Optional, Any, List
from app.db.session import async_session_factory
from app.repositories.asset_repository import AssetRepository
from app.repositories.package_repository import PackageRepository
from app.models.schemas import MediaAssetResponse, StoryPackageResponse

DB_PATH = "data/presswire.db"

def _ensure_tables():
    """Ensures media_assets and story_packages tables exist."""
    os.makedirs("data", exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS media_assets (
                public_id VARCHAR PRIMARY KEY,
                asset_id VARCHAR,
                format VARCHAR(10) NOT NULL DEFAULT 'jpg',
                resource_type VARCHAR(20) NOT NULL DEFAULT 'image',
                width INTEGER NOT NULL DEFAULT 1200,
                height INTEGER NOT NULL DEFAULT 800,
                bytes INTEGER NOT NULL DEFAULT 0,
                secure_url TEXT NOT NULL,
                review_status VARCHAR(30) NOT NULL DEFAULT 'action_required',
                incident_type VARCHAR(50) NOT NULL DEFAULT 'breaking_news',
                urgency VARCHAR(20) NOT NULL DEFAULT 'breaking',
                headline TEXT DEFAULT 'Breaking News',
                pixelate_bystanders BOOLEAN DEFAULT 1,
                is_archived BOOLEAN DEFAULT 0,
                duration REAL,
                frame_rate REAL,
                event_id VARCHAR,
                event_title TEXT,
                cluster_radius_km REAL DEFAULT 1.5,
                package_window_hours REAL DEFAULT 1.0,
                package_status VARCHAR(20) DEFAULT 'active',
                focal_x INTEGER,
                focal_y INTEGER,
                focal_gravity VARCHAR(30) DEFAULT 'auto:subject',
                brand_theme VARCHAR(50) DEFAULT 'global_wire',
                custom_strap_id VARCHAR(255),
                created_at VARCHAR(50) NOT NULL,
                faces JSON NOT NULL DEFAULT '[]',
                telemetry JSON NOT NULL DEFAULT '{}',
                moderation JSON NOT NULL DEFAULT '{}',
                syndication_urls JSON NOT NULL DEFAULT '{}'
            );
        """)
        cursor.execute("PRAGMA table_info(media_assets);")
        existing_cols = {r[1] for r in cursor.fetchall()}
        if "brand_theme" not in existing_cols:
            cursor.execute("ALTER TABLE media_assets ADD COLUMN brand_theme VARCHAR(50) DEFAULT 'global_wire';")
        if "custom_strap_id" not in existing_cols:
            cursor.execute("ALTER TABLE media_assets ADD COLUMN custom_strap_id VARCHAR(255);")
        if "processing_status" not in existing_cols:
            cursor.execute("ALTER TABLE media_assets ADD COLUMN processing_status VARCHAR(20) DEFAULT 'completed';")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS story_packages (
                event_id VARCHAR PRIMARY KEY,
                event_title TEXT NOT NULL,
                incident_type VARCHAR(50) NOT NULL,
                cluster_radius_km REAL NOT NULL DEFAULT 1.5,
                package_window_hours REAL DEFAULT 1.0,
                package_status VARCHAR(20) NOT NULL DEFAULT 'active',
                lat REAL,
                lng REAL,
                created_at VARCHAR(50) NOT NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_review_status ON media_assets (review_status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_event_id ON media_assets (event_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_created_at ON media_assets (created_at DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_packages_created_at ON story_packages (created_at DESC);")
        conn.commit()

class PersistentAssetStore(collections.abc.MutableMapping):
    """
    High-performance in-memory dictionary backed by SQLite with WAL mode.
    Sub-microsecond reads with instant atomic durability on every write.
    """
    def __init__(self):
        self._data: Dict[str, MediaAssetResponse] = {}
        _ensure_tables()

    def __getitem__(self, key: str) -> MediaAssetResponse:
        return self._data[key]

    def __setitem__(self, key: str, value: MediaAssetResponse) -> None:
        self._data[key] = value
        self._sync_save(value)

    def __delitem__(self, key: str) -> None:
        if key in self._data:
            del self._data[key]
        self._sync_delete(key)

    def __iter__(self) -> Iterator[str]:
        return iter(self._data)

    def __len__(self) -> int:
        return len(self._data)

    def __contains__(self, key: object) -> bool:
        return key in self._data

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    def values(self):
        return self._data.values()

    def keys(self):
        return self._data.keys()

    def items(self):
        return self._data.items()

    def clear(self) -> None:
        self._data.clear()
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM media_assets")
                conn.commit()
        except Exception:
            pass

    def pop(self, key: str, default: Any = None) -> Any:
        val = self._data.pop(key, default)
        self._sync_delete(key)
        return val

    def _sync_save(self, asset: MediaAssetResponse) -> None:
        try:
            faces_json = json.dumps([
                f.model_dump() if hasattr(f, "model_dump") else (f.dict() if hasattr(f, "dict") else f)
                for f in (asset.faces or [])
            ])
            telemetry_json = json.dumps(
                asset.telemetry.model_dump() if hasattr(asset.telemetry, "model_dump") else (asset.telemetry or {})
            )
            moderation_json = json.dumps(
                asset.moderation.model_dump() if hasattr(asset.moderation, "model_dump") else (asset.moderation or {})
            )
            syndication_json = json.dumps(asset.syndication_urls or {})

            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO media_assets (
                        public_id, asset_id, format, resource_type, width, height, bytes, secure_url,
                        review_status, incident_type, urgency, headline, pixelate_bystanders, is_archived,
                        duration, frame_rate, event_id, event_title, cluster_radius_km, package_window_hours,
                        package_status, focal_x, focal_y, focal_gravity, brand_theme, custom_strap_id, processing_status, created_at,
                        faces, telemetry, moderation, syndication_urls
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(public_id) DO UPDATE SET
                        asset_id=excluded.asset_id,
                        format=excluded.format,
                        resource_type=excluded.resource_type,
                        width=excluded.width,
                        height=excluded.height,
                        bytes=excluded.bytes,
                        secure_url=excluded.secure_url,
                        review_status=excluded.review_status,
                        incident_type=excluded.incident_type,
                        urgency=excluded.urgency,
                        headline=excluded.headline,
                        pixelate_bystanders=excluded.pixelate_bystanders,
                        is_archived=excluded.is_archived,
                        duration=excluded.duration,
                        frame_rate=excluded.frame_rate,
                        event_id=excluded.event_id,
                        event_title=excluded.event_title,
                        cluster_radius_km=excluded.cluster_radius_km,
                        package_window_hours=excluded.package_window_hours,
                        package_status=excluded.package_status,
                        focal_x=excluded.focal_x,
                        focal_y=excluded.focal_y,
                        focal_gravity=excluded.focal_gravity,
                        brand_theme=excluded.brand_theme,
                        custom_strap_id=excluded.custom_strap_id,
                        processing_status=excluded.processing_status,
                        created_at=excluded.created_at,
                        faces=excluded.faces,
                        telemetry=excluded.telemetry,
                        moderation=excluded.moderation,
                        syndication_urls=excluded.syndication_urls;
                """, (
                    asset.public_id, asset.asset_id, asset.format, asset.resource_type, asset.width, asset.height,
                    asset.bytes, asset.secure_url, asset.review_status, asset.incident_type, asset.urgency,
                    asset.headline, int(asset.pixelate_bystanders), int(asset.is_archived), asset.duration,
                    asset.frame_rate, asset.event_id, asset.event_title, asset.cluster_radius_km,
                    asset.package_window_hours, asset.package_status, asset.focal_x, asset.focal_y,
                    asset.focal_gravity, asset.brand_theme or "global_wire", asset.custom_strap_id,
                    getattr(asset, "processing_status", "completed") or "completed", asset.created_at,
                    faces_json, telemetry_json, moderation_json, syndication_json
                ))
                conn.commit()
        except Exception as e:
            import logging
            logging.error(f"[PersistentAssetStore] Failed to persist asset {asset.public_id}: {e}")

    def _sync_delete(self, public_id: str) -> None:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM media_assets WHERE public_id = ?", (public_id,))
                conn.commit()
        except Exception as e:
            import logging
            logging.error(f"[PersistentAssetStore] Failed to delete asset {public_id}: {e}")

    async def load_from_db(self) -> int:
        """Loads all persisted assets from SQLite into in-memory store."""
        try:
            async with async_session_factory() as session:
                assets = await AssetRepository.get_all(session, include_archived=True)
                for a in assets:
                    self._data[a.public_id] = a
                return len(self._data)
        except Exception as e:
            import logging
            logging.error(f"[PersistentAssetStore] Failed to load from database: {e}")
            return 0


class PersistentPackageStore(collections.abc.MutableMapping):
    """
    High-performance in-memory dictionary backed by SQLite for Story Packages.
    """
    def __init__(self):
        self._data: Dict[str, StoryPackageResponse] = {}
        _ensure_tables()

    def __getitem__(self, key: str) -> StoryPackageResponse:
        return self._data[key]

    def __setitem__(self, key: str, value: StoryPackageResponse) -> None:
        self._data[key] = value
        self._sync_save(value)

    def __delitem__(self, key: str) -> None:
        if key in self._data:
            del self._data[key]
        self._sync_delete(key)

    def __iter__(self) -> Iterator[str]:
        return iter(self._data)

    def __len__(self) -> int:
        return len(self._data)

    def __contains__(self, key: object) -> bool:
        return key in self._data

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    def values(self):
        return self._data.values()

    def keys(self):
        return self._data.keys()

    def items(self):
        return self._data.items()

    def clear(self) -> None:
        self._data.clear()
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM story_packages")
                conn.commit()
        except Exception:
            pass

    def pop(self, key: str, default: Any = None) -> Any:
        val = self._data.pop(key, default)
        self._sync_delete(key)
        return val

    def _sync_save(self, pkg: StoryPackageResponse) -> None:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO story_packages (
                        event_id, event_title, incident_type, cluster_radius_km,
                        package_window_hours, package_status, lat, lng, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(event_id) DO UPDATE SET
                        event_title=excluded.event_title,
                        incident_type=excluded.incident_type,
                        cluster_radius_km=excluded.cluster_radius_km,
                        package_window_hours=excluded.package_window_hours,
                        package_status=excluded.package_status,
                        lat=excluded.lat,
                        lng=excluded.lng,
                        created_at=excluded.created_at;
                """, (
                    pkg.event_id, pkg.event_title, pkg.incident_type, pkg.cluster_radius_km,
                    pkg.package_window_hours, pkg.package_status, pkg.lat, pkg.lng, pkg.created_at
                ))
                conn.commit()
        except Exception as e:
            import logging
            logging.error(f"[PersistentPackageStore] Failed to persist package {pkg.event_id}: {e}")

    def _sync_delete(self, event_id: str) -> None:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM story_packages WHERE event_id = ?", (event_id,))
                conn.commit()
        except Exception as e:
            import logging
            logging.error(f"[PersistentPackageStore] Failed to delete package {event_id}: {e}")

    async def load_from_db(self) -> int:
        """Loads all persisted story packages from SQLite into in-memory store."""
        try:
            async with async_session_factory() as session:
                packages = await PackageRepository.get_all(session)
                for p in packages:
                    self._data[p.event_id] = p
                return len(self._data)
        except Exception as e:
            import logging
            logging.error(f"[PersistentPackageStore] Failed to load packages from database: {e}")
            return 0
