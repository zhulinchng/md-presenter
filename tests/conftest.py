import sys
from pathlib import Path

import pytest

# Make the project root importable regardless of where pytest is invoked from
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app as app_module  # noqa: E402


@pytest.fixture()
def app(tmp_path):
    app_module.app.config.update(
        TESTING=True,
        UPLOAD_FOLDER=str(tmp_path / "uploads"),
    )
    Path(app_module.app.config["UPLOAD_FOLDER"]).mkdir(exist_ok=True)
    return app_module.app


@pytest.fixture(autouse=True)
def clean_storage():
    """Each test starts with empty in-memory storage."""
    app_module.markdown_storage.clear()
    yield
    app_module.markdown_storage.clear()


@pytest.fixture()
def client(app):
    return app.test_client()


def make_md_file(directory, name="test.md", content="# Title\n\nHello"):
    path = directory / name
    path.write_text(content, encoding="utf-8")
    return path


def upload_file(client, tmp_path, content="# Slide 1\n\nBody\n\n---\n\n# Slide 2", name="deck.md"):
    src = make_md_file(tmp_path, name, content)
    with open(src, "rb") as f:
        return client.post("/upload", data={
            "file": (f, name),
        }, content_type="multipart/form-data")


def seed_storage(content="# A\n\n---\n\n# B", filename="seed.md", watched=False,
                created_at=None, write_file=True):
    """Seed markdown_storage directly and return the file_id."""
    import uuid
    from datetime import datetime

    file_id = str(uuid.uuid4())
    filepath = str(Path(app_module.app.config["UPLOAD_FOLDER"]) / f"{file_id}.md")
    if write_file:
        Path(filepath).write_text(content, encoding="utf-8")
    app_module.markdown_storage[file_id] = {
        "filename": filename,
        "content": content,
        "slides": app_module.parse_markdown_to_slides(content),
        "created_at": created_at or datetime.now(),
        "filepath": filepath,
    }
    if watched:
        app_module.markdown_storage[file_id]["watched"] = True
    return file_id
