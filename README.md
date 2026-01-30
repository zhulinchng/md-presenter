# MD Presenter

A modern, interactive markdown-based presentation app that transforms your Markdown files into beautiful, live-editable presentations with support for Mermaid diagrams, rich media, and real-time updates.

## Features

- **Drag-and-Drop Upload**: Simply drag your markdown file onto the page
- **Live Editing**: Edit your presentation in real-time with instant preview
- **Mermaid Diagrams**: Beautiful flowcharts and diagrams rendered alongside your content
- **Rich Media Support**: Embed images, videos, and GIFs
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

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to:
```
http://localhost:8080
```

## Usage

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

- **Images**: `![alt text](image-url.jpg)`
- **Sized Images**: `![alt](url){width=50%}`
- **Videos**: `![video](video.mp4)`
- **GIFs**: `![gif](animation.gif)`

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

## Sample Presentation

A sample presentation file (`sample-presentation.md`) is included to demonstrate all features.

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

- **Backend**: Flask, Flask-SocketIO
- **Frontend**: Vanilla JavaScript, Socket.IO Client
- **Markdown Processing**: Python-Markdown with extensions
- **Diagram Rendering**: Mermaid.js
- **Styling**: Modern CSS with animations

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
- [ ] Collaborative editing
- [ ] Custom themes
- [ ] Presentation templates
- [ ] Cloud storage integration
- [ ] Presenter view with timer
- [ ] Analytics and engagement tracking