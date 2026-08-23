# Support Guide

Troubleshooting and FAQ for MD Presenter.

## Troubleshooting

### The app won't start: "Address already in use" / port busy

Another process is bound to the port. Run on a different one:

```bash
python app.py -p 8081
```

Or find and stop the existing instance (`lsof -i :8080` on macOS/Linux).

### Slides are not splitting at my `---`

The separator must be `---` (three or more dashes) **on its own line**, with a blank
line before it. The split happens on `\n---+\n`. Also note:

- Files with Windows line endings (CRLF) are supported — they are normalized before
  splitting.
- A `---` inside a ``` code fence is *not* protected and will still start a new slide
  (known limitation). Use `***` or a longer fence context if you need a literal
  horizontal rule inside code.

### My presentation URL stopped working after a restart (upload mode)

Upload metadata lives in memory; restarting clears it, so old `/present/<file_id>`
URLs stop resolving even though files remain on disk in `uploads/`. Re-upload, or use
watch mode (`python app.py -m file.md`) whose URLs are stable across restarts.

### Recent-files cards on the home page do nothing

Recent-document entries in the browser's localStorage point to uploads that may have
expired (24h cleanup) or been wiped by a server restart. The card fetches `/api/check/`
and shows "missing" state; clear them via the remove button on each card.

### Live edits from the editor don't reach presenters

Checklist:

1. Both tabs must be open on the same `file_id` (same presentation URL).
2. The editor debounces 300ms after your last keystroke — wait a beat.
3. Look at the browser console: if the Socket.IO connection failed (e.g. reverse proxy
   without WebSocket upgrade headers), see operations.md for nginx settings.
4. If you edited the markdown file on disk directly while in upload mode, that file is
   a snapshot — upload mode does not watch files. Use watch mode instead.

### Mermaid diagrams render as plain text or code blocks

Mermaid.js v11 is loaded from the jsDelivr CDN. The presenting machine needs internet
access to `cdn.jsdelivr.net`. Check the browser console for blocked requests (offline,
ad-blockers, strict CSP).

### Diagram zoom controls missing

Zoom controls appear once an SVG exists in a `.mermaid-container` and
`initializeMermaidZoom()` runs (on load and ~200ms after each live update). If a slide
was updated and controls vanish, reload the page; persistent failures indicate a JS
error upstream — check the console.

### Upload rejected

- Only `.md` and `.markdown` files are accepted.
- Maximum size is 10MB.
- If the server was started by a different user, verify write permission on `uploads/`
  (the directory is created automatically at startup).

### Watch mode doesn't react to file changes

1. Confirm the terminal printed `Watching:` and the URL — otherwise the path was
   invalid (must be `.md`/`.markdown`, must exist).
2. Rapid successive saves within 300ms are debounced; only the last one applies.
3. Some editors save via rename/replace; watchdog watches the containing directory, so
   this normally still triggers. If your editor writes to a temp dir first, save into
   place.

## FAQ

**Where are my uploaded files stored?**
In `uploads/` next to `app.py`, plus an in-memory metadata entry. Uploaded
presentations are deleted (file + metadata) after 24 hours by the hourly cleanup task.

**Can several people present/edit at once?**
Yes within one server process: everyone viewing the same presentation joins the same
Socket.IO room; page navigation and content updates sync live. The storage model is
single-process — see operations.md before deploying multiple workers.

**Is markdown HTML sanitized?**
No — raw HTML renders verbatim so Instagram/X/TikTok embed codes work. Only present
content you trust.

**How do I reset the theme?**
Use the sun/moon toggle in the presenter header; the choice persists in
`localStorage`.

**Which browsers are supported?**
Chrome (recommended), Firefox, Safari, Edge — anything modern with WebSocket support.

## Reporting Issues

When filing a bug, include:

1. Start command (exact flags) and port.
2. Browser + OS.
3. Console output from the server terminal and the browser dev tools.
4. A minimal markdown snippet reproducing rendering issues (or attach the `.md`).

Feature requests are tracked in the README "Future Enhancements" list.
