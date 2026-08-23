# Operations Guide

How to run, configure, and monitor MD Presenter.

## Requirements

- Python 3.10+ (developed and tested on 3.14)
- Dependencies: `pip install -r requirements.txt` (Flask, Flask-SocketIO, python-markdown,
  Werkzeug, Pygments, watchdog)

## Run Modes

### Upload mode (default)

```bash
python app.py
```

Serves the drag-and-drop upload page at `/`. Uploaded presentations are parsed once at
upload and stored in memory + `uploads/`.

### Watch mode

```bash
python app.py -m path/to/presentation.md
# equivalent:
python app.py --md-path path/to/presentation.md
```

Loads the file immediately (URL printed to the terminal), then watches it with watchdog.
Edits to the file appear in all connected browsers within ~300ms of saving. The
presentation URL is stable across restarts (derived from the file's absolute path).

## Command-Line Options

```
python app.py [OPTIONS]

Options:
  -m, --md-path PATH    Path to markdown file to watch for changes
  --host HOST           Host to bind to (default: 0.0.0.0)
  -p, --port PORT       Port to run on (default: 8080)
  --no-debug            Disable debug mode
  -h, --help            Show help message
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MD_PRESENTER_SECRET_KEY` | random per process | Flask session signing key. Unset, sessions do not survive restarts — set it in any semi-permanent deployment. |
| `MD_PRESENTER_CORS_ORIGINS` | `*` | Comma-separated origins allowed for Socket.IO connections, e.g. `https://present.example.com,https://edit.example.com`. Same-origin browser clients are unaffected by this setting. |

Example:

```bash
MD_PRESENTER_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')" \
MD_PRESENTER_CORS_ORIGINS="*" \
python app.py -p 8080 --no-debug
```

## What Runs in the Background

- **Hourly cleanup** (`cleanup_loop`, started only via `python app.py`): every 3600s,
  uploaded presentations older than 24 hours have their file deleted from `uploads/`
  and their entry dropped from memory. Watched files (`-m` mode) are never deleted.
  Failures to unlink are logged as warnings and retried next cycle.
- **Socket.IO client monitor**: Flask-SocketIO's built-in inactive-client monitoring is on
  (default).

## Logs

The app logs through Flask's logger (`app.logger`):

- Client connect/disconnect events (info)
- Watched-file updates: `File updated: <name>` (info)
- File-read failures in the watcher (error) and cleanup unlink failures (warning)

Debug mode (default when not passing `--no-debug`) additionally enables the Werkzeug
debugger and verbose request logging.

## Production Considerations

- **Single process only.** Presentation metadata lives in a process-local dict
  (`markdown_storage`). Running multiple workers (gunicorn sync workers, uwsgi
  processes) splits state across processes and breaks live sync. Scale vertically or
  add a shared store (Redis/DB) first — that requires code changes.
- **Dev server.** The app runs via `socketio.run(...)` on Werkzeug with
  `allow_unsafe_werkzeug=True`. This is fine for LAN presentations and development;
  for hardened deployments front it with a reverse proxy (nginx/Caddy) handling TLS,
  and keep the app bound to localhost (`--host 127.0.0.1`) where possible.
- **WebSocket proxying.** Behind nginx, set `proxy_http_version 1.1`,
  `proxy_set_header Upgrade $http_upgrade`, and `proxy_set_header Connection "upgrade"`
  for the Socket.IO endpoint.
- **Trust model.** Markdown HTML renders verbatim (that is what enables social embeds).
  Only expose uploads to people you trust; see Security Considerations in the README.
- **Restart semantics.** A restart clears `markdown_storage`: upload-mode URLs stop
  resolving even though files remain in `uploads/`. Watch-mode URLs keep working after
  re-running with the same `-m` path (stable id).

## Health Checks

```bash
# App up?
curl -f http://localhost:8080/ >/dev/null && echo OK

# Specific presentation exists?
curl -s http://localhost:8080/api/check/<file_id>
# → {"exists": true, "filename": "...", "slideCount": N}
```

## Backup / Data Durability

Nothing needs backing up by design: source-of-truth markdown lives either in the
watched file (watch mode) or was uploaded by users (ephemeral). `uploads/` can be
deleted wholesale when the server is stopped; the cleanup task will not miss it.
