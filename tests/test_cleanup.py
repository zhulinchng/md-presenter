"""Tests for cleanup_old_files."""

from datetime import datetime, timedelta
from pathlib import Path

from conftest import seed_storage


class TestCleanupOldFiles:
    def test_removes_old_entry_and_file(self):
        old = datetime.now() - timedelta(hours=25)
        file_id = seed_storage(created_at=old)
        filepath = Path(__import__("app").markdown_storage[file_id]["filepath"])
        assert filepath.exists()

        __import__("app").cleanup_old_files()

        assert not filepath.exists()
        assert file_id not in __import__("app").markdown_storage

    def test_keeps_recent_entries(self):
        file_id = seed_storage()  # created now

        __import__("app").cleanup_old_files()

        assert file_id in __import__("app").markdown_storage
        assert Path(__import__("app").markdown_storage[file_id]["filepath"]).exists()

    def test_watched_entries_exempt(self):
        old = datetime.now() - timedelta(hours=48)
        file_id = seed_storage(watched=True, created_at=old)

        __import__("app").cleanup_old_files()

        assert file_id in __import__("app").markdown_storage
