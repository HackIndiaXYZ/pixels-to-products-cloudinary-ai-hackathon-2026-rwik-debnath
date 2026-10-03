import pytest
import asyncio
from unittest.mock import AsyncMock
from app.services.broadcaster import WireBroadcaster, broadcaster
from app.api.v1.endpoints.editorial import editorial_event_stream

@pytest.mark.asyncio
async def test_wire_broadcaster_pubsub():
    """Verifies that WireBroadcaster correctly fans out events to subscribed queues."""
    test_broadcaster = WireBroadcaster()

    q1 = test_broadcaster.subscribe()
    q2 = test_broadcaster.subscribe()

    assert len(test_broadcaster._subscribers) == 2

    # Broadcast an event
    test_broadcaster.broadcast("test:event", {"headline": "Breaking Unit Test", "count": 42})

    # Both subscribers should receive formatted SSE string
    msg1 = await asyncio.wait_for(q1.get(), timeout=2.0)
    msg2 = await asyncio.wait_for(q2.get(), timeout=2.0)

    assert msg1 == msg2
    assert msg1.startswith("event: test:event\n")
    assert '"headline": "Breaking Unit Test"' in msg1
    assert msg1.endswith("\n\n")

    # Unsubscribe
    test_broadcaster.unsubscribe(q1)
    assert len(test_broadcaster._subscribers) == 1

    test_broadcaster.unsubscribe(q2)
    assert len(test_broadcaster._subscribers) == 0

@pytest.mark.asyncio
async def test_editorial_stream_sse_endpoint():
    """Verifies that editorial_event_stream yields initial connected event and live broadcasts."""
    mock_request = AsyncMock()
    response = await editorial_event_stream(mock_request)

    assert response.media_type == "text/event-stream"
    assert response.headers["Cache-Control"] == "no-cache"

    iterator = response.body_iterator

    # 1. Initial event should be connected
    first_chunk = await iterator.__anext__()
    assert "event: connected" in first_chunk
    assert '"status": "connected"' in first_chunk

    # 2. Broadcast live asset:ingested event
    test_payload = {"public_id": "presswire/breaking_123", "headline": "Breaking Unit Test Asset"}
    broadcaster.broadcast("asset:ingested", test_payload)

    second_chunk = await iterator.__anext__()
    assert "event: asset:ingested" in second_chunk
    assert '"headline": "Breaking Unit Test Asset"' in second_chunk

    # 3. Clean close
    await iterator.aclose()
