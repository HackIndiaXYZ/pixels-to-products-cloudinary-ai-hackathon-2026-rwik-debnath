import asyncio
import json
import logging
from typing import Set, Any

logger = logging.getLogger("presswire.broadcaster")

class WireBroadcaster:
    """
    High-throughput async event broadcaster for Server-Sent Events (SSE).
    Distributes real-time ingest, triage, and packaging events to all connected newsroom consoles.
    """
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        """Registers a new SSE client queue."""
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(q)
        logger.info(f"[SSE] Client connected. Active subscribers: {len(self._subscribers)}")
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        """Removes a disconnected SSE client queue."""
        self._subscribers.discard(q)
        logger.info(f"[SSE] Client disconnected. Active subscribers: {len(self._subscribers)}")

    def broadcast(self, event_type: str, data: Any) -> None:
        """Broadcasts an event to all active subscribers."""
        if not self._subscribers:
            return

        # Ensure payload is serialized
        if hasattr(data, "model_dump"):
            payload_data = data.model_dump()
        elif hasattr(data, "dict"):
            payload_data = data.dict()
        else:
            payload_data = data

        raw_msg = f"event: {event_type}\ndata: {json.dumps(payload_data)}\n\n"

        stale = set()
        for q in list(self._subscribers):
            try:
                q.put_nowait(raw_msg)
            except asyncio.QueueFull:
                stale.add(q)
            except Exception:
                stale.add(q)

        for q in stale:
            self._subscribers.discard(q)

# Global singleton broadcaster
broadcaster = WireBroadcaster()
