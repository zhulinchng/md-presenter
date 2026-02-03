# MD Presenter

A modern, interactive markdown-based presentation app that transforms your Markdown files into beautiful, live-editable presentations with support for Mermaid diagrams, rich media, and real-time updates.

## Features

- **Drag-and-Drop Upload**: Simply drag your markdown file onto the page
- **File Watching Mode**: Monitor markdown files and auto-reload on changes
- **Live Editing**: Edit your presentation in real-time with instant preview
- **Mermaid Diagrams**: Beautiful flowcharts and diagrams rendered alongside your content
- **Rich Media Support**: Embed images, videos, YouTube, Vimeo, and social media posts
- **Keyboard Navigation**: Professional presentation controls
- **Dark Mode**: Toggle between light and dark themes
- **WebSocket Sync**: Real-time updates across all connected clients
- **Speaker Notes**: Hidden notes for presenters
- **Export Options**: Download your markdown anytime

## Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd md-presenter
```

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

1. Run the application:

**Option A: Upload Mode** (drag-and-drop interface)

```bash
python app.py
```

**Option B: File Watch Mode** (monitor a specific markdown file)

```bash
python app.py -m path/to/your-presentation.md
# or
python app.py --md-path path/to/your-presentation.md
```

1. Open your browser and navigate to:

```
http://localhost:8080
```

### Command-Line Options

```bash
python app.py [OPTIONS]

Options:
  -m, --md-path PATH    Path to markdown file to watch for changes
  --host HOST           Host to bind to (default: 0.0.0.0)
  -p, --port PORT       Port to run on (default: 8080)
  --no-debug            Disable debug mode
  -h, --help            Show help message
```

## Usage

### Two Ways to Use MD Presenter

**1. Upload Mode** - Perfect for sharing presentations

- Drag and drop markdown files onto the web interface
- Edit presentations in the browser
- Share the generated URL with others
- Files are stored temporarily (auto-deleted after 24 hours)

**2. File Watch Mode** - Ideal for development and live presentations

- Point the app to a local markdown file
- Edit the file in your favorite editor
- Changes automatically appear in all connected browsers
- Use a stable URL based on the file path
- Perfect for iterating on presentations quickly

### Creating Presentations

1. Write your presentation in Markdown
2. Use `---` (three dashes) to separate slides
3. Add Mermaid diagrams with ` ```mermaid ` code blocks
4. Include speaker notes with `<!-- notes -->` comments

### Markdown Syntax

```markdown
# Slide Title

Your content here

---

## Next Slide

- Bullet points
- **Bold text**
- *Italic text*
- `Code snippets`

---

## Mermaid Diagram

` ``mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
` ``
```

### Media Embedding

**Images**

```markdown
![alt text](image-url.jpg)
![alt](url){width=50%}  # Sized images
```

**Videos**

```markdown
![video](path/to/video.mp4)
```

**YouTube**

```markdown
![youtube](https://www.youtube.com/watch?v=VIDEO_ID)
![youtube](https://youtu.be/VIDEO_ID)
```

**Vimeo**

```markdown
![vimeo](https://vimeo.com/VIDEO_ID)
```

**SVG**

```markdown
![svg](path/to/diagram.svg)
```

**Social Media Embeds**

```markdown
<!-- Paste raw HTML embed codes from Instagram, Twitter/X, TikTok, etc. -->
<blockquote class="instagram-media">...</blockquote>
<blockquote class="twitter-tweet">...</blockquote>
```

### File Watch Mode Details

When running with the `-m` flag:

- The app monitors the specified markdown file for changes
- Any edits to the file automatically update all connected browsers in real-time
- The URL is generated based on the file path hash (stable across restarts)
- Perfect for:
  - Editing in your preferred editor (VS Code, Vim, etc.)
  - Live presentations with last-minute changes
  - Rapid iteration during development
  - Multiple presenters viewing the same file

Example workflow:

```bash
# Terminal 1: Start the app in watch mode
python app.py -m my-presentation.md

# Terminal 2: Edit the file
vim my-presentation.md

# All browsers viewing http://localhost:8080/present/STABLE_ID
# will update automatically as you save changes
```

### Keyboard Shortcuts

#### Presentation Mode

- `→` / `Space` / `Enter` - Next slide
- `←` - Previous slide
- `F` - Toggle fullscreen
- `E` - Enter edit mode
- `G` - Go to specific slide
- `T` - Toggle thumbnail sidebar
- `ESC` - Exit fullscreen
- `1-9` - Jump to slide 1-9

#### Editor Mode

- `Ctrl/Cmd + S` - Save
- `Ctrl/Cmd + D` - Download markdown
- `Ctrl/Cmd + P` - Toggle preview
- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `Ctrl/Cmd + K` - Insert link
- `Ctrl/Cmd + Enter` - New slide

## Sample Presentations

Sample presentation files are included in the `samples/` directory:

- `sample-presentation.md` - Demonstrates all features
- `media-embedding-guide.md` - Shows all media embed types

Try them in watch mode:

```bash
python app.py -m samples/sample-presentation.md
```

## Architecture

```
md-presenter/
├── app.py                 # Flask application with WebSocket support
├── templates/
│   ├── index.html        # Upload page
│   ├── presenter.html    # Presentation view
│   └── editor.html       # Live editor
├── static/
│   ├── css/
│   │   └── style.css     # Styling
│   ├── js/
│   │   ├── uploader.js   # File upload handler
│   │   ├── presenter.js  # Presentation logic
│   │   └── editor.js     # Editor functionality
│   └── lib/
│       └── mermaid.min.js
└── uploads/              # Temporary file storage
```

## Technologies Used

- **Backend**: Flask, Flask-SocketIO (with standard library threading)
- **Frontend**: Vanilla JavaScript, Socket.IO Client
- **Markdown Processing**: Python-Markdown with extensions (extra, codehilite, fenced_code, toc, nl2br, attr_list, md_in_html)
- **Diagram Rendering**: Mermaid.js v11
- **File Watching**: Python watchdog library
- **Styling**: Modern CSS with animations and theme support

## Security Considerations

- File validation (only .md/.markdown files)
- Secure filename handling
- File size limits (10MB max)
- Session-based file management
- XSS prevention in markdown rendering

## Performance Features

- Debounced live updates (300ms)
- Lazy loading for media
- Markdown caching
- Efficient WebSocket communication
- Optimized animations and transitions

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Future Enhancements

- [ ] PDF export functionality
- [ ] Collaborative editing with multiple cursors
- [ ] Custom theme creator
- [ ] Presentation templates library
- [ ] Cloud storage integration (Google Drive, Dropbox)
- [ ] Presenter view with timer and speaker notes display
- [ ] Slide transitions and animations
- [ ] Remote control via mobile device
- [ ] Recording and playback functionality
- [ ] Analytics and engagement tracking
