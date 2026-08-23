"""Tests for HTTP routes."""

from pathlib import Path

from conftest import seed_storage, upload_file


class TestIndex:
    def test_index_200(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert b"MD Presenter" in resp.data or b"md-presenter" in resp.data


class TestUpload:
    def test_upload_success(self, client, tmp_path):
        resp = upload_file(client, tmp_path)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert "/present/" in data["redirect"]
        # session got the file_id
        with client.session_transaction() as sess:
            assert sess["file_id"] == data["file_id"]

    def test_upload_stores_file_and_entry(self, client, tmp_path):
        data = upload_file(client, tmp_path).get_json()
        file_id = data["file_id"]
        entry = __import__("app").markdown_storage[file_id]
        assert entry["filename"] == "deck.md"
        assert "# Slide 1" in entry["content"]
        assert len(entry["slides"]) == 2
        assert Path(entry["filepath"]).exists()

    def test_upload_no_file_part(self, client):
        resp = client.post("/upload", data={}, content_type="multipart/form-data")
        assert resp.status_code == 400

    def test_upload_empty_filename(self, client):
        resp = client.post("/upload", data={
            "file": (b"", ""),
        }, content_type="multipart/form-data")
        assert resp.status_code == 400

    def test_upload_bad_extension(self, client, tmp_path):
        src = tmp_path / "notes.txt"
        src.write_text("hello")
        with open(src, "rb") as f:
            resp = client.post("/upload", data={
                "file": (f, "notes.txt"),
            }, content_type="multipart/form-data")
        assert resp.status_code == 400


class TestPresentAndEdit:
    def test_present_unknown_redirects(self, client):
        resp = client.get("/present/nonexistent")
        assert resp.status_code == 302
        assert resp.headers["Location"].endswith("/")

    def test_present_known_renders(self, client, tmp_path):
        data = upload_file(client, tmp_path).get_json()
        resp = client.get(f"/present/{data['file_id']}")
        assert resp.status_code == 200
        assert b"Slide 1" in resp.data

    def test_edit_known_renders_textarea(self, client, tmp_path):
        data = upload_file(client, tmp_path).get_json()
        resp = client.get(f"/edit/{data['file_id']}")
        assert resp.status_code == 200
        assert b"<textarea" in resp.data
        assert b"# Slide 1" in resp.data


class TestApiMarkdown:
    def test_missing_404(self, client):
        assert client.get("/api/markdown/nope").status_code == 404

    def test_found_shape(self, client, tmp_path):
        data = upload_file(client, tmp_path).get_json()
        resp = client.get(f"/api/markdown/{data['file_id']}")
        assert resp.status_code == 200
        body = resp.get_json()
        assert set(body.keys()) == {"content", "slides"}
        assert body["slides"][0]["title"] == "Slide 1"


class TestApiCheck:
    def test_missing(self, client):
        assert client.get("/api/check/nope").get_json() == {"exists": False}

    def test_found(self, client, tmp_path):
        data = upload_file(client, tmp_path).get_json()
        body = client.get(f"/api/check/{data['file_id']}").get_json()
        assert body["exists"] is True
        assert body["filename"] == "deck.md"
        assert body["slideCount"] == 2


def test_seed_helper_watched_flag(tmp_path):
    fid = seed_storage(watched=True)
    entry = __import__("app").markdown_storage[fid]
    assert entry["watched"] is True


class TestDownload:
    def test_downloads_raw_markdown(self, client):
        fid = seed_storage(content="# A\n\n---\n\n# B", filename="deck.md")
        resp = client.get(f"/download/{fid}")
        assert resp.status_code == 200
        assert resp.mimetype == "text/markdown"
        assert "attachment" in resp.headers["Content-Disposition"]
        assert b"# B" in resp.data

    def test_download_sanitizes_filename(self, client):
        fid = seed_storage(filename="my deck.md")
        disp = client.get(f"/download/{fid}").headers["Content-Disposition"]
        assert "my_deck.md" in disp

    def test_missing_404(self, client):
        assert client.get("/download/nope").status_code == 404


class TestControl:
    def test_control_renders_pad(self, client):
        fid = seed_storage()
        resp = client.get(f"/control/{fid}")
        assert resp.status_code == 200
        assert b"ctlNextBtn" in resp.data

    def test_unknown_redirects(self, client):
        resp = client.get("/control/nope")
        assert resp.status_code == 302


class TestQr:
    def test_returns_svg(self, client):
        fid = seed_storage()
        resp = client.get(f"/qr/{fid}")
        assert resp.status_code == 200
        assert resp.content_type.startswith("image/svg+xml")
        assert b"<svg" in resp.data[:300] or resp.data.lstrip().startswith(b"<?xml")

    def test_missing_404(self, client):
        assert client.get("/qr/nope").status_code == 404
