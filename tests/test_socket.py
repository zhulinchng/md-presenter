"""Tests for WebSocket event handlers via the Flask-SocketIO test client."""

import pytest

import app as app_module
from conftest import seed_storage


@pytest.fixture()
def socket_client(app):
    flask_client = app.test_client()
    sio = app_module.socketio.test_client(app, flask_test_client=flask_client)
    assert sio.is_connected()
    return sio


def join(socket_client, file_id):
    socket_client.emit("join_presentation", {"file_id": file_id})
    return socket_client.get_received()


class TestConnect:
    def test_connect_accepted(self, socket_client):
        assert socket_client.is_connected()


class TestJoinPresentation:
    def test_join_emits_joined(self, socket_client):
        received = join(socket_client, "abc123")
        joined = [r for r in received if r["name"] == "joined"]
        assert len(joined) == 1
        assert joined[0]["args"][0] == {"file_id": "abc123"}


class TestUpdateContent:
    def test_broadcasts_to_room_and_updates_storage(self, app, socket_client):
        file_id = seed_storage()
        join(socket_client, file_id)

        # Second client in the same room
        peer = app_module.socketio.test_client(app)
        peer.emit("join_presentation", {"file_id": file_id})
        peer.get_received()

        new_content = "# Updated\n\nfresh body"
        socket_client.emit("update_content", {"file_id": file_id, "content": new_content})

        sender_events = [e["name"] for e in socket_client.get_received()]
        assert "content_updated" in sender_events

        peer_events = [e for e in peer.get_received() if e["name"] == "content_updated"]
        assert len(peer_events) == 1
        payload = peer_events[0]["args"][0]
        assert payload["content"] == new_content
        assert payload["slides"][0]["title"] == "Updated"

        entry = app_module.markdown_storage[file_id]
        assert entry["content"] == new_content
        with open(entry["filepath"], encoding="utf-8") as f:
            assert f.read() == new_content

    def test_non_string_content_ignored(self, socket_client):
        file_id = seed_storage()
        join(socket_client, file_id)

        before = app_module.markdown_storage[file_id]["content"]
        socket_client.emit("update_content", {"file_id": file_id, "content": None})
        socket_client.emit("update_content", {"file_id": file_id, "content": 42})
        socket_client.emit("update_content", {"file_id": file_id})  # content missing

        events = [e["name"] for e in socket_client.get_received()]
        assert "content_updated" not in events
        assert app_module.markdown_storage[file_id]["content"] == before

    def test_unknown_file_ignored(self, socket_client):
        join(socket_client, "ghost")
        socket_client.emit("update_content", {"file_id": "ghost", "content": "# x"})
        events = [e["name"] for e in socket_client.get_received()]
        assert "content_updated" not in events


class TestChangePage:
    def test_page_changed_excludes_sender(self, app, socket_client):
        file_id = seed_storage()
        join(socket_client, file_id)

        peer = app_module.socketio.test_client(app)
        peer.emit("join_presentation", {"file_id": file_id})
        peer.get_received()

        socket_client.emit("change_page", {"file_id": file_id, "page": 3})

        # Sender gets nothing (include_self=False)
        assert "page_changed" not in [e["name"] for e in socket_client.get_received()]
        peer_events = [e for e in peer.get_received() if e["name"] == "page_changed"]
        assert len(peer_events) == 1
        assert peer_events[0]["args"][0] == {"page": 3}

    def test_invalid_page_ignored(self, app, socket_client):
        file_id = seed_storage()
        join(socket_client, file_id)

        peer = app_module.socketio.test_client(app)
        peer.emit("join_presentation", {"file_id": file_id})
        peer.get_received()

        socket_client.emit("change_page", {"file_id": file_id, "page": "three"})
        socket_client.emit("change_page", {"file_id": file_id, "page": -1})
        socket_client.emit("change_page", {"file_id": file_id})

        assert "page_changed" not in [e["name"] for e in peer.get_received()]


class TestRequestSync:
    def test_returns_sync_data(self, socket_client):
        file_id = seed_storage(content="# Sync\n\nbody")
        join(socket_client, file_id)
        socket_client.get_received()  # drain joined

        socket_client.emit("request_sync", {"file_id": file_id})
        sync = [e for e in socket_client.get_received() if e["name"] == "sync_data"]
        assert len(sync) == 1
        payload = sync[0]["args"][0]
        assert payload["content"] == "# Sync\n\nbody"
        assert payload["slides"][0]["title"] == "Sync"


class TestLeavePresentation:
    def test_leave_stops_room_delivery(self, app, socket_client):
        file_id = seed_storage()
        join(socket_client, file_id)

        peer = app_module.socketio.test_client(app)
        peer.emit("join_presentation", {"file_id": file_id})
        peer.get_received()
        peer.emit("leave_presentation", {"file_id": file_id})

        socket_client.emit("update_content", {"file_id": file_id, "content": "# after"})
        names = [e["name"] for e in peer.get_received()]
        assert "content_updated" not in names


class TestChangePageTracking:
    def test_change_page_stores_current_page(self, app, socket_client):
        fid = seed_storage()
        join(socket_client, fid)
        socket_client.emit("change_page", {"file_id": fid, "page": 2})
        assert app_module.markdown_storage[fid]["current_page"] == 2


class TestRequestSyncCurrentPage:
    def test_sync_defaults_to_first_page(self, socket_client):
        fid = seed_storage()
        join(socket_client, fid)
        socket_client.emit("request_sync", {"file_id": fid})
        received = socket_client.get_received()
        assert received[0]["name"] == "sync_data"
        assert received[0]["args"][0]["current_page"] == 0
