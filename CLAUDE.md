# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MD Presenter is a Flask-based web application that transforms Markdown files into interactive presentations with real-time editing capabilities, WebSocket synchronization, and support for Mermaid diagrams and rich media embeds.

## Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Run the development server
python app.py
```

The app runs on `http://localhost:8080` with SocketIO support using eventlet.

## Architecture

### Core Components

**Backend (app.py)**

- Flask application with Flask-SocketIO for real-time communication
- Markdown parsing happens in `parse_markdown_to_slides()` which splits content by `---` separators
- In-memory storage (`markdown_storage` dict) holds presentation data keyed by UUID file IDs
- WebSocket rooms organized by file_id for multi-client synchronization
- Automatic file cleanup after 24 hours via `cleanup_old_files()`

**Frontend Structure**

- `templates/index.html` - File upload landing page
- `templates/presenter.html` - Presentation view with navigation and WebSocket sync
- `templates/editor.html` - Live editor with split-pane preview
- `static/js/presenter.js` - Presentation navigation, keyboard shortcuts, Mermaid rendering, theme switching
- `static/js/editor.js` - Live editing with syntax highlighting, debounced updates (300ms), toolbar functions
- `static/js/uploader.js` - Drag-and-drop file upload handling
- `static/js/mermaid-controls.js` - Zoom and pan controls for Mermaid diagrams

### Key Workflows

**Slide Parsing**

- Slides are split by `\n---+\n` regex pattern
- Each slide extracts: HTML content, Mermaid diagram (if present), speaker notes (within `<!-- notes -->` tags), title
- HTML blocks (Instagram, Twitter, TikTok embeds) are preserved using placeholder system to prevent markdown escaping
- Scripts are temporarily removed during markdown processing, then restored after HTML conversion
- Media syntax is processed by `process_media_links()`: `![video](path)`, `![youtube](url)`, `![vimeo](url)`, `![svg](path)`, `![alt](url){width=50%}`

**Real-time Editing**

- Editor sends `update_content` events with debounced 300ms delay
- Server re-parses markdown and emits `content_updated` to all clients in the file_id room
- Presenter views automatically update slides without page reload
- Syntax highlighting in editor uses overlay backdrop technique for performance

**Mermaid Diagram Rendering**

- Mermaid diagrams are detected in triple-backtick code blocks: ` ```mermaid `
- Original diagram text stored in `data-mermaid-original` attribute to enable re-rendering on theme change
- Rendered asynchronously client-side using Mermaid.js v11
- Theme-aware: switches between 'default' and 'dark' themes based on user preference
- Custom zoom/pan controls available via mermaid-controls.js

### WebSocket Events

- `join_presentation` - Client joins a file_id room
- `update_content` - Editor sends new content (triggers re-parse and broadcast)
- `content_updated` - Server broadcasts updated slides to all room clients
- `change_page` - Sync slide navigation across clients
- `page_changed` - Broadcast slide changes to other viewers
- `request_sync` - Request current state (used on reconnect)

### Code Block Handling

- Code blocks are wrapped with collapsible headers showing language and line count
- Mermaid code blocks are collapsed by default
- `initializeCollapsibleCodeBlocks()` runs on slide load and after content updates

### Session Management

- File IDs are UUIDs stored in Flask session
- Uploaded files saved to `uploads/` directory with UUID-based filenames
- `markdown_storage` is in-memory (use Redis or database for production)
- Files auto-deleted after 24 hours

## Markdown Extensions

The app uses Python-Markdown with these extensions:

- `extra` - Tables, footnotes, abbreviations
- `codehilite` - Syntax highlighting with Pygments
- `fenced_code` - Triple-backtick code blocks
- `toc` - Table of contents
- `nl2br` - Newline to `<br>`
- `attr_list` - Custom attributes like `{width=50%}`
- `md_in_html` - Allow markdown inside HTML blocks

## Special Syntax

**Slide Separator**

```markdown
---
```

**Speaker Notes**

```markdown
<!-- notes -->
Your notes here
<!-- /notes -->
```

**Media Embeds**

- Videos: `![video](path.mp4)`
- YouTube: `![youtube](youtube.com/watch?v=ID)` or `![youtube](youtu.be/ID)`
- Vimeo: `![vimeo](vimeo.com/ID)`
- SVG: `![svg](path.svg)`
- Sized images: `![alt](url){width=50%}`
- Social embeds: Paste raw HTML embed codes (Instagram, Twitter, TikTok)

**Mermaid Diagrams**

```markdown
` ``mermaid
graph TD
    A[Start] --> B[End]
` ``
```

## Keyboard Shortcuts

**Presenter Mode**

- `→` / `Space` / `Enter` - Next slide
- `←` - Previous slide
- `F` - Toggle fullscreen
- `E` - Enter edit mode
- `G` - Go to specific slide
- `T` - Toggle thumbnail sidebar
- `1-9` - Jump to slide 1-9

**Editor Mode**

- `Ctrl/Cmd + S` - Save
- `Ctrl/Cmd + D` - Download markdown
- `Ctrl/Cmd + P` - Toggle preview
- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `Ctrl/Cmd + K` - Insert link
- `Ctrl/Cmd + Enter` - New slide

## Important Implementation Details

**HTML Preservation**

- HTML blocks are extracted before markdown processing using regex patterns
- Placeholders like `{{HTML_BLOCK_0}}` are inserted, then restored after conversion
- This prevents markdown parser from escaping embedded social media widgets and custom HTML

**Theme System**

- Theme stored in localStorage
- Mermaid diagrams re-rendered on theme change
- Theme attribute applied to `<body data-theme="light|dark">`

**Touch Support**

- Swipe gestures for slide navigation (50px threshold)
- Swipe left → next slide, swipe right → previous slide

**URL Structure**

- `/` - Upload page
- `/present/<file_id>` - Presentation view
- `/edit/<file_id>` - Editor view
- `/api/markdown/<file_id>` - Get markdown content (JSON)
- `/api/check/<file_id>` - Check if presentation exists

## Testing Presentations

Sample presentations are available in the `samples/` directory:

- `sample-presentation.md` - Demonstrates all features
- `media-embedding-guide.md` - Shows all media embed types
