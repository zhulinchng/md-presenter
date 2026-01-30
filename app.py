import os
import re
import uuid
import json
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename
import markdown
from datetime import datetime, timedelta

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max file size
app.config['ALLOWED_EXTENSIONS'] = {'md', 'markdown'}

# Initialize SocketIO with eventlet
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Store markdown content in memory (in production, use Redis or database)
markdown_storage = {}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def parse_markdown_to_slides(content):
    """Parse markdown content and split into slides by --- separator"""
    # Split by horizontal rule (---)
    slides_raw = re.split(r'\n---+\n', content)

    slides = []
    md_extensions = [
        'extra',           # Tables, footnotes, abbreviations
        'codehilite',      # Syntax highlighting
        'fenced_code',     # Code blocks with ```
        'toc',             # Table of contents
        'nl2br',           # Newline to break
        'attr_list',       # Custom attributes
        'md_in_html'       # Markdown inside HTML
    ]

    # Configure markdown with HTML allowed
    md = markdown.Markdown(
        extensions=md_extensions,
        extension_configs={
            'codehilite': {
                'css_class': 'highlight',
                'linenums': False
            }
        }
    )

    for slide_content in slides_raw:
        slide_content = slide_content.strip()
        if not slide_content:
            continue

        # Check for mermaid diagrams
        mermaid_pattern = r'```mermaid\n(.*?)\n```'
        mermaid_matches = re.findall(mermaid_pattern, slide_content, re.DOTALL)

        # Extract speaker notes
        notes = ""
        notes_pattern = r'<!-- notes -->(.*?)(?=<!-- /notes -->|$)'
        notes_match = re.search(notes_pattern, slide_content, re.DOTALL)
        if notes_match:
            notes = notes_match.group(1).strip()
            # Remove notes from slide content
            slide_content = re.sub(r'<!-- notes -->.*?(?:<!-- /notes -->|$)', '', slide_content, flags=re.DOTALL)

        # Process media links
        slide_content = process_media_links(slide_content)

        # Extract and preserve HTML blocks (Instagram, Twitter, etc.)
        # This pattern matches blockquotes and their associated scripts
        html_blocks = []
        html_block_pattern = r'(<blockquote[^>]*(?:instagram-media|twitter-tweet|tiktok-embed)[^>]*>.*?</blockquote>(?:\s*<script[^>]*>.*?</script>)?)'
        html_blocks_found = re.findall(html_block_pattern, slide_content, re.DOTALL | re.IGNORECASE)

        # Replace HTML blocks with placeholders
        for i, block in enumerate(html_blocks_found):
            placeholder = f'{{{{HTML_BLOCK_{i}}}}}'
            slide_content = slide_content.replace(block, placeholder)
            html_blocks.append(block)

        # Extract remaining scripts
        script_pattern = r'<script[^>]*>.*?</script>'
        scripts = re.findall(script_pattern, slide_content, re.DOTALL | re.IGNORECASE)

        # Temporarily remove scripts to prevent markdown from escaping them
        for i, script in enumerate(scripts):
            slide_content = slide_content.replace(script, f'{{{{SCRIPT_PLACEHOLDER_{i}}}}}')

        # Convert markdown to HTML
        html_content = md.convert(slide_content)

        # Restore HTML blocks
        for i, block in enumerate(html_blocks):
            html_content = html_content.replace(f'{{{{HTML_BLOCK_{i}}}}}', block)

        # Restore scripts
        for i, script in enumerate(scripts):
            html_content = html_content.replace(f'{{{{SCRIPT_PLACEHOLDER_{i}}}}}', script)

        md.reset()  # Reset for next slide

        slides.append({
            'html': html_content,
            'mermaid': mermaid_matches[0] if mermaid_matches else None,
            'notes': notes,
            'raw': slide_content,
            'scripts': scripts  # Store scripts for later injection
        })

    return slides

def process_media_links(content):
    """Process custom media syntax in markdown"""
    # Video links: ![video](path.mp4) -> HTML5 video
    video_pattern = r'!\[video\]\((.*?)\)'
    content = re.sub(video_pattern, r'<video controls class="embedded-video"><source src="\1" type="video/mp4"></video>', content)

    # SVG images: ![svg](path.svg) -> img tag with SVG support
    svg_pattern = r'!\[svg\]\((.*?\.svg)\)'
    content = re.sub(svg_pattern, r'<img src="\1" class="embedded-svg" alt="SVG Image">', content)

    # Images with size: ![alt](path){width=50%} -> img with style
    img_size_pattern = r'!\[(.*?)\]\((.*?)\)\{width=(.*?)\}'
    content = re.sub(img_size_pattern, r'<img alt="\1" src="\2" style="width: \3">', content)

    # YouTube embeds: ![youtube](youtube.com/watch?v=VIDEO_ID) or ![youtube](youtu.be/VIDEO_ID)
    youtube_patterns = [
        (r'!\[youtube\]\((?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+).*?\)', r'<div class="video-embed"><iframe src="https://www.youtube.com/embed/\1" frameborder="0" allowfullscreen></iframe></div>'),
        (r'!\[youtube\]\((?:https?://)?youtu\.be/([a-zA-Z0-9_-]+).*?\)', r'<div class="video-embed"><iframe src="https://www.youtube.com/embed/\1" frameborder="0" allowfullscreen></iframe></div>')
    ]
    for pattern, replacement in youtube_patterns:
        content = re.sub(pattern, replacement, content)

    # Vimeo embeds: ![vimeo](vimeo.com/VIDEO_ID)
    vimeo_pattern = r'!\[vimeo\]\((?:https?://)?(?:www\.)?vimeo\.com/([0-9]+).*?\)'
    content = re.sub(vimeo_pattern, r'<div class="video-embed"><iframe src="https://player.vimeo.com/video/\1" frameborder="0" allowfullscreen></iframe></div>', content)

    return content

@app.route('/')
def index():
    """Landing page with file upload"""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_id = str(uuid.uuid4())

        # Save file
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.md")
        file.save(filepath)

        # Read and store content
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Parse slides
        slides = parse_markdown_to_slides(content)

        # Store in memory
        markdown_storage[file_id] = {
            'filename': filename,
            'content': content,
            'slides': slides,
            'created_at': datetime.now(),
            'filepath': filepath
        }

        # Store file_id in session
        session['file_id'] = file_id

        return jsonify({
            'success': True,
            'file_id': file_id,
            'redirect': url_for('presenter', file_id=file_id)
        })

    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/present/<file_id>')
def presenter(file_id):
    """Presentation view"""
    if file_id not in markdown_storage:
        flash('Presentation not found')
        return redirect(url_for('index'))

    data = markdown_storage[file_id]
    return render_template('presenter.html',
                         file_id=file_id,
                         filename=data['filename'],
                         slides=data['slides'],
                         total_slides=len(data['slides']))

@app.route('/edit/<file_id>')
def editor(file_id):
    """Live editor view"""
    if file_id not in markdown_storage:
        flash('Presentation not found')
        return redirect(url_for('index'))

    data = markdown_storage[file_id]
    return render_template('editor.html',
                         file_id=file_id,
                         filename=data['filename'],
                         content=data['content'],
                         slides=data['slides'])

@app.route('/api/markdown/<file_id>')
def get_markdown(file_id):
    """API endpoint to get markdown content"""
    if file_id not in markdown_storage:
        return jsonify({'error': 'Not found'}), 404

    return jsonify({
        'content': markdown_storage[file_id]['content'],
        'slides': markdown_storage[file_id]['slides']
    })

@app.route('/api/check/<file_id>')
def check_presentation(file_id):
    """API endpoint to check if a presentation exists"""
    if file_id not in markdown_storage:
        return jsonify({'exists': False})

    data = markdown_storage[file_id]
    return jsonify({
        'exists': True,
        'filename': data['filename'],
        'slideCount': len(data['slides'])
    })

# WebSocket events
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f"Client disconnected: {request.sid}")

@socketio.on('join_presentation')
def handle_join_presentation(data):
    """Join a presentation room for live updates"""
    file_id = data.get('file_id')
    if file_id:
        join_room(file_id)
        emit('joined', {'file_id': file_id})

@socketio.on('leave_presentation')
def handle_leave_presentation(data):
    """Leave a presentation room"""
    file_id = data.get('file_id')
    if file_id:
        leave_room(file_id)

@socketio.on('update_content')
def handle_update_content(data):
    """Handle live content updates from editor"""
    file_id = data.get('file_id')
    content = data.get('content')

    if file_id and file_id in markdown_storage:
        # Update content
        markdown_storage[file_id]['content'] = content

        # Re-parse slides
        slides = parse_markdown_to_slides(content)
        markdown_storage[file_id]['slides'] = slides

        # Save to file
        filepath = markdown_storage[file_id]['filepath']
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        # Broadcast update to all clients in the room
        emit('content_updated', {
            'slides': slides,
            'content': content
        }, room=file_id, include_self=True)

@socketio.on('change_page')
def handle_change_page(data):
    """Handle page navigation events"""
    file_id = data.get('file_id')
    page = data.get('page')

    if file_id:
        emit('page_changed', {'page': page}, room=file_id, include_self=False)

@socketio.on('request_sync')
def handle_request_sync(data):
    """Sync current state with a client"""
    file_id = data.get('file_id')

    if file_id and file_id in markdown_storage:
        emit('sync_data', {
            'content': markdown_storage[file_id]['content'],
            'slides': markdown_storage[file_id]['slides']
        })

# Clean up old files periodically
def cleanup_old_files():
    """Remove files older than 24 hours"""
    cutoff = datetime.now() - timedelta(hours=24)
    to_remove = []

    for file_id, data in markdown_storage.items():
        if data['created_at'] < cutoff:
            to_remove.append(file_id)
            # Remove file
            try:
                os.remove(data['filepath'])
            except:
                pass

    for file_id in to_remove:
        del markdown_storage[file_id]

if __name__ == '__main__':
    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Run with SocketIO
    socketio.run(app, debug=True, host='0.0.0.0', port=8080)