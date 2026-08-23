# Maintenance Guide

Repository layout, how to develop and test, and the invariants to preserve when
changing the code.

## Repository Layout

```
md-presenter/
├── app.py                     # Entire backend: routes, socket events, parsing, watcher, cleanup, CLI
├── requirements.txt           # Runtime dependencies
├── requirements-dev.txt       # pytest
├── samples/                   # Demo presentations
├── templates/                 # Jinja2 templates (index, presenter, editor)
├── static/
│   ├── css/style.css          # Main styles + theme variables
│   ├── css/mermaid-controls.css
│   └── js/{uploader,presenter,editor,mermaid-controls}.js
├── tests/                     # pytest suite (see below)
├── docs/                      # These guides
└── uploads/                   # Ephemeral upload storage (created at import time)
```

The whole backend is one file (`app.py`, ~600 lines). Sections in order: imports/config,
parsing helpers (`extract_slide_title`, `parse_markdown_to_slides`,
`process_media_links`), HTTP routes, WebSocket handlers, cleanup, file watcher,
CLI (`parse_args`), `__main__`.

## Running Tests

```bash
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest tests/ -v          # full suite (~55 tests, < 1s)
python -m pytest tests/test_socket.py -v   # one area only
```

Test layout:

| File | Covers |
|------|--------|
| `tests/conftest.py` | Fixtures: app with tmp `uploads/`, per-test empty `markdown_storage`, `seed_storage()` helper |
| `tests/test_parsing.py` | Slide splitting (incl. CRLF regression), notes, mermaid capture, HTML/script placeholders, media links, titles |
| `tests/test_routes.py` | Upload validation and success, present/edit rendering, `/api/markdown`, `/api/check`, `/download`, `/control`, `/qr` |
| `tests/test_socket.py` | All socket events via `socketio.test_client`, room isolation, payload validation |
| `tests/test_cleanup.py` | 24h expiry deletes file+entry; watched entries exempt |
| `tests/test_watch.py` | Stable md5-derived ids, error cases, 300ms debounce |

Conventions: tests seed `markdown_storage` directly or use real multipart uploads
against a tmp upload folder; no network access is needed.

## Extending the Markdown Pipeline

Add python-markdown extensions in `parse_markdown_to_slides()` (`md_extensions` list).
If an extension emits raw HTML that must survive conversion verbatim (like social
embeds do), extend the placeholder extraction before `md.convert()` — see the
invariants below.

To add a new media syntax, add a regex substitution in `process_media_links()` and a
matching test in `tests/test_parsing.py::TestProcessMediaLinks`.

## Parsing Invariants

1. **CRLF normalization first** — content is normalized with
   `content.replace("\r\n", "\n")` before splitting; don't remove this.
2. **Separator regex** `\n---+\n` requires blank-line-adjacent separators. It does NOT
   respect ` ``` ` fences: a bare `---` inside a code block starts a new slide
   (known limitation, covered by a test documenting current behavior).
3. **Placeholder naming**: `{{HTML_BLOCK_N}}` for instagram/twitter/tiktok blockquote
   blocks (optionally followed by their `<script>`), `{{SCRIPT_PLACEHOLDER_N}}` for all
   remaining scripts. Placeholders are restored after `md.convert()`; if you introduce
   new placeholder kinds, keep names brace-wrapped so markdown leaves them untouched.
4. **Slide dict shape** `{html, mermaid, notes, raw, scripts, title}` is consumed by
   both templates and JS (`updateSlides` in presenter.js reads `html`, `mermaid`,
   `notes`). Changing keys breaks both sides plus the test suite.
5. **Socket payload validation** — `update_content` requires string `content`;
   `change_page` requires non-negative int `page`. Invalid payloads must be ignored
   silently (tests assert no event and no state change).

## Frontend Notes

- `presenter.js` owns slide DOM rebuilds. `updateSlides()` clamps
  `currentSlideIndex` when a live edit shrinks the deck; keep that clamp when touching
  navigation.
- Fullscreen state syncs from `fullscreenchange` / `webkitfullscreenchange` events;
  never set `isFullscreen` optimistically around `requestFullscreen()`.
- `mermaid-controls.js` tracks controllers in a module-level `WeakMap`
  (`mermaidControllers`). `initializeMermaidZoom()` is called repeatedly (after every
  slide update) and must stay idempotent per container — re-adding controllers would
  stack MutationObservers and document-level listeners.
- The editor's client-side mini-parser (`editor.js: parseMarkdownToSlides`) is a
  simplified duplicate of the server pipeline used only for the local preview strip.
  Known divergence: it does not run media-link processing or HTML-block preservation.
  If server parsing changes in visible ways, update the mini-parser to match.

## Security Posture

- Markdown HTML renders verbatim by design (`{{ slide.html|safe }}`) — social embeds
  depend on it. Do not "fix" XSS by escaping without removing the embed feature; the
  accepted mitigation is operational trust (see README Security Considerations).
- Keep upload validation: extension allowlist + `secure_filename` + 10MB cap.
- Secret key and CORS come from environment variables; defaults are safe-ish for LAN
  use but documented in operations.md.

## Release Checklist

1. `python -m pytest tests/ -v` green.
2. Manual smoke: upload mode round-trip (upload → present → edit → see presenter update).
3. Watch-mode smoke: `python app.py -m samples/sample-presentation.md`, edit the file,
   confirm browsers update.
4. Update README/docs if behavior, flags, or env vars changed.
