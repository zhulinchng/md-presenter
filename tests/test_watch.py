"""Tests for watch-mode helpers: load_markdown_file and MarkdownFileWatcher."""

from pathlib import Path

import pytest

import app as app_module


class TestLoadMarkdownFile:
    def test_stable_id_for_same_path(self, tmp_path):
        src = tmp_path / "deck.md"
        src.write_text("# Watched")
        id1 = app_module.load_markdown_file(str(src))
        id2 = app_module.load_markdown_file(str(src))
        assert id1 == id2
        assert app_module.markdown_storage[id1]["watched"] is True

    def test_missing_file_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            app_module.load_markdown_file(str(tmp_path / "nope.md"))

    def test_non_markdown_raises(self, tmp_path):
        src = tmp_path / "notes.txt"
        src.write_text("hello")
        with pytest.raises(ValueError):
            app_module.load_markdown_file(str(src))


class TestMarkdownFileWatcher:
    def _watcher(self, tmp_path, content="# v1"):
        src = tmp_path / "deck.md"
        src.write_text(content)
        file_id = app_module.load_markdown_file(str(src))
        watcher = app_module.MarkdownFileWatcher(str(src), file_id, None)
        return src, file_id, watcher

    class _FakeEvent:
        def __init__(self, src_path):
            self.src_path = src_path

    def test_processes_modification(self, tmp_path):
        src, file_id, watcher = self._watcher(tmp_path)
        src.write_text("# v2\n\nchanged")

        watcher.on_modified(self._FakeEvent(str(src)))

        assert app_module.markdown_storage[file_id]["content"] == "# v2\n\nchanged"
        assert app_module.markdown_storage[file_id]["slides"][0]["title"] == "v2"

    def test_debounces_rapid_second_call(self, tmp_path):
        src, file_id, watcher = self._watcher(tmp_path)
        src.write_text("# v2")
        watcher.on_modified(self._FakeEvent(str(src)))

        # Second modification within the debounce window is skipped
        src.write_text("# v3")
        watcher.on_modified(self._FakeEvent(str(src)))

        assert app_module.markdown_storage[file_id]["content"] == "# v2"

    def test_ignores_other_paths(self, tmp_path):
        src, file_id, watcher = self._watcher(tmp_path)
        watcher.on_modified(self._FakeEvent("/somewhere/else.md"))
        assert app_module.markdown_storage[file_id]["content"] == "# v1"
