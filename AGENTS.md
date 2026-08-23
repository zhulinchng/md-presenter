# Repository Guidelines

## Project Overview

MD Presenter turns Markdown files into web presentations. Single-file Flask + Flask-SocketIO backend (`app.py`, ~680 lines) with a vanilla-JS frontend (no build system, no bundler). Two run modes:

- **Upload mode** — POST a `.md` file; stored as `uploads/<uuid4>.md`; auto-deleted after 24h.
- **Watch mode** (`python app.py -m file.md`) — file lives anywhere; stable URL derived from `md5(abs_path)[:12]`; on-disk edits broadcast live via watchdog.

## Architecture & Data Flow

State is an **in-memory dict `markdown_storage`** in `app.py` (`file_id -> {filename, content, slides, created_at, filepath, watched?, current_page}`) — single-process only, lost on restart (watch mode re-derives IDs from the path). `current_page` tracks the deck's active slide server-side so remote controllers can sync.

```
Markdown text
  └─ parse_markdown_to_slides(content)      # CRLF→LF, split on \n---+\n
       ├─ extract ```mermaid blocks → slide["mermaid"]
       ├─ extract <!-- notes -->…<!-- /notes --> → slide["notes"]
       ├─ process_media_links()              # ![video]/![svg]/![youtube]/![vimeo] syntax
       ├─ hoist social embeds/scripts → {{HTML_BLOCK_N}} / {{SCRIPT_PLACEHOLDER_N}}
       ├─ python-Markdown convert (md_extensions in app.py)
       └─ restore placeholders in reverse order
Slide dicts: {html, mermaid, notes, raw, scripts, title}   ← invariant, consumed by templates AND presenter.js
```

Socket.IO events (async_mode="threading", not eventlet): editor emits `update_content` → server validates (must be str), re-parses, **rewrites the file on disk**, broadcasts `content_updated {slides, content}` to the room; presenter emits `change_page` → `page_changed` (sender excluded); `join_presentation`/`leave_presentation`/`request_sync`→`sync_data`. Live-edit flow: editor keystroke → 300ms debounce → socket → broadcast → `presenter.js updateSlides()` rebuilds DOM, clamps `currentSlideIndex`, calls `showSlide()`.

Watch mode replaces keystrokes with `MarkdownFileWatcher.on_modified` (watchdog, 0.3s debounce) → same broadcast.

Cleanup: `cleanup_loop()` runs hourly (`CLEANUP_INTERVAL_SECONDS = 3600`) via `socketio.start_background_task`; `cleanup_old_files()` removes uploads older than 24h but skips entries with `watched: True`.

## Key Directories

| Path | Purpose |
|---|---|
| `app.py` | Entire backend: routes, parsing pipeline, Socket.IO handlers, cleanup, watcher, CLI |
| `static/js/presenter.js` | Presentation view: navigation, fullscreen sync, themes, live updates, Mermaid rendering, print/PDF mode, `#N` deep links |
| `static/js/controller.js` | Remote control page (`/control/<id>`): emits `change_page`, follows `page_changed`/`sync_data` |
| `static/js/uploader.js` | Upload page only: XHR drag-drop, localStorage recent-docs carousel validated via `/api/check/<id>` |
| `static/js/mermaid-controls.js` | `MermaidZoomController` zoom/pan; module-scope `WeakMap` guards duplicate controllers |
| `templates/` | Jinja templates; inject JS globals before script load |
| `tests/` | pytest suite (~64 tests) |
| `docs/` | architecture / operations / maintenance / support docs |
| `samples/` | Demo decks used for smoke tests |

## Development Commands

```bash
# Setup (Python 3.14 via Homebrew)
python3.14 -m venv .venv && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt

# Run — upload mode (default port 8080, host 0.0.0.0, debug ON unless --no-debug)
.venv/bin/python app.py --port 8091

# Run — watch mode (live-reload from disk, stable URL)
.venv/bin/python app.py -m samples/sample-presentation.md --port 8092

# Tests (no config file; default pytest discovery)
.venv/bin/python -m pytest tests/ -v        # ~64 tests, <1s
```

No build step, no linter/formatter configured, no CI.

## Code Conventions & Common Patterns

**Python**
- snake_case functions; docstrings on public functions; UPPER_SNAKE module constants; config through `app.config[...]`.
- Logging: `app.logger.info/warning/error` with %-style args. Bare `print(..., flush=True)` is reserved for pre-server startup banners in `__main__` only.
- Env overrides: `os.environ.get("X") or default`. Two env vars, both read at **import time**: `MD_PRESENTER_SECRET_KEY`, `MD_PRESENTER_CORS_ORIGINS` (comma-split).
- Socket handlers validate with guard clauses and silently ignore invalid payloads (`isinstance` checks).
- Targeted `except OSError`; broad `except Exception as e:` only in the watcher, always with `logger.error`.

**JavaScript (ES5-style globals — no modules)**
- Global functions because templates' `onclick=` attributes call them directly (`nextSlide()`, `toggleCodeBlock()`). Mutable top-level state uses `let` — **never `const`** for values reassigned at runtime (`totalSlides`, `currentSlideIndex` are reassigned by `updateSlides()`).
- One `function initializeX()` per concern, invoked from a single `DOMContentLoaded` handler.
- Templates inject globals in an inline `<script>` before loading the JS file (`presenter.html`: `fileId`, `let totalSlides`, `let currentSlideIndex`; `editor.html`: `fileId`, `fileName`).
- Idempotency pattern for repeated init: module-scope `WeakMap` of controllers (see `mermaid-controls.js`).
- try/catch around `localStorage` and `mermaid.render` with `console.error`.

**Security posture (do not change without reading README "Security Considerations")**
- Markdown HTML renders **verbatim by design** (social embeds feature) — do NOT add sanitization.
- CORS defaults to `"*"` intentionally for LAN presenting.
- Keep upload validation: extension whitelist `{md, markdown}`, 10MB `MAX_CONTENT_LENGTH`.

**Known limitation (tested as-is)** — the slide separator regex `\n---+\n` is not fence-aware: `---` inside a code fence splits slides. Pinned by `test_separator_inside_code_fence_splits_known_limitation`; changing this changes parsing behavior and docs claims.

## Important Files

- `app.py` — entry point and everything server-side. Landmarks: `parse_markdown_to_slides` (~82), `process_media_links` (~188), routes (~235+, incl. `/control`, `/qr`, `/download`), socket handlers (~402+), `cleanup_old_files` (~491), `MarkdownFileWatcher` (~511), `load_markdown_file` (~565), `parse_args` (~609), `__main__`.
- `templates/presenter.html` — template↔JS contract (injected globals, slide loop with `{{ slide.html|safe }}`).
- `static/js/vendor/socket.io.min.js` — vendored Socket.IO client (4.5.4); all templates load it locally instead of from a CDN so LAN/offline presenting works.
- `requirements.txt` — floor-pinned ranges only (Flask>=3.0, Flask-SocketIO>=5.3.5, markdown>=3.5, qrcode>=8.0, watchdog>=4.0, …); no lockfile exists.
- `.gitignore` — already covers `uploads/*.md`; smoke-test artifacts there should be cleaned manually.
- `CLAUDE.md` + `docs/maintenance.md` — deeper component maps and release checklist.

## Runtime/Tooling Preferences

- Python **3.14** in `.venv/` (Homebrew); always invoke via `.venv/bin/python` — never system python.
- pip-only dependency management; no pyproject.toml/setup.py/Dockerfile/CI.
- Frontend has zero toolchain: edit vanilla JS/Jinja directly; no npm, bundler, or transpile step.
- Werkzeug dev server via `socketio.run(..., allow_unsafe_werkzeug=True, use_reloader=False)` — single process required (in-memory storage breaks under workers).

## Testing & QA

Framework: **pytest ≥ 8** (`requirements-dev.txt`). Run `.venv/bin/python -m pytest tests/ -v`.

Conventions new tests must follow:
- Import as `import app as app_module`; mutate `app_module.app.config` / `app_module.markdown_storage` — never construct a second Flask app.
- Fixtures from `tests/conftest.py`: `client` (Flask test client), autouse `clean_storage` (clears `markdown_storage` around every test), plus plain helpers imported directly: `seed_storage(...)`, `upload_file(client, tmp_path, ...)`.
- Socket.IO tests use a locally defined `socket_client` fixture in `test_socket.py` (Flask-SocketIO test client), not conftest.
- No mocking of server loops: call `cleanup_old_files()` and watcher `on_modified()` synchronously with hand-rolled event objects exposing `src_path`.
- Assertions favor exact shapes (`set(body.keys()) == {...}`) over truthiness.

Coverage map: `test_parsing.py` (pipeline incl. CRLF regression, media links), `test_routes.py` (HTTP + validation 400s), `test_socket.py` (live-update events incl. invalid-payload rejection), `test_cleanup.py` (24h expiry, watched exemption), `test_watch.py` (stable md5-derived IDs, debounced reload).

Manual verification workflow (used for frontend changes): start server, then exercise the real surface — upload via `curl -F "file=@samples/sample-presentation.md" http://localhost:<port>/upload` and check `/api/check/<id>` for `slideCount`; browser-drive `/present/<id>` for slide rendering, theme toggle, and live-editor sync.
