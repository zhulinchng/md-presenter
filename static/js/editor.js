// Editor JavaScript
let socket = null;
let editor = null;
let updateTimeout = null;
let isSaving = false;
let currentSlideIndex = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeEditor();
    initializeWebSocket();
    initializeKeyboardShortcuts();
});

// Initialize Editor
function initializeEditor() {
    editor = document.getElementById('markdownEditor');

    // Auto-resize textarea
    editor.addEventListener('input', function() {
        autoResize();
        handleContentChange();
    });

    // Tab key support
    editor.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const value = this.value;

            // Insert tab character
            this.value = value.substring(0, start) + '  ' + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 2;
        }
    });

    // Initial resize
    autoResize();
}

// Auto-resize textarea
function autoResize() {
    editor.style.height = 'auto';
    editor.style.height = editor.scrollHeight + 'px';
}

// Initialize WebSocket
function initializeWebSocket() {
    socket = io();

    socket.on('connect', function() {
        console.log('Connected to server');
        // Join presentation room
        socket.emit('join_presentation', { file_id: fileId });
        // Request sync
        socket.emit('request_sync', { file_id: fileId });
    });

    socket.on('content_updated', function(data) {
        // Update preview with new slides
        updatePreview(data.slides);
        updateStatus('saved', 'Saved');
    });

    socket.on('sync_data', function(data) {
        // Sync editor content
        if (data.content && editor.value !== data.content) {
            editor.value = data.content;
            autoResize();
        }
        if (data.slides) {
            updatePreview(data.slides);
        }
    });

    socket.on('disconnect', function() {
        console.log('Disconnected from server');
        updateStatus('error', 'Disconnected');
    });
}

// Handle content changes
function handleContentChange() {
    // Clear existing timeout
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    // Update status
    updateStatus('editing', 'Editing...');

    // Debounce updates (300ms)
    updateTimeout = setTimeout(function() {
        sendUpdate();
    }, 300);
}

// Send content update to server
function sendUpdate() {
    if (isSaving) return;

    isSaving = true;
    updateStatus('saving', 'Saving...');

    const content = editor.value;

    socket.emit('update_content', {
        file_id: fileId,
        content: content
    });

    // Reset saving flag after a short delay
    setTimeout(() => {
        isSaving = false;
    }, 100);
}

// Update preview
function updatePreview(slides) {
    const previewContent = document.getElementById('previewContent');
    const slideSelector = document.getElementById('slideSelector');

    // Clear existing preview
    previewContent.innerHTML = '';

    // Update slide selector
    slideSelector.innerHTML = '';

    if (slides && slides.length > 0) {
        // Create slide previews
        slides.forEach((slide, index) => {
            // Add option to selector
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Slide ${index + 1}`;
            if (index === currentSlideIndex) {
                option.selected = true;
            }
            slideSelector.appendChild(option);
        });

        // Show current slide preview
        showSlidePreview(slides[currentSlideIndex]);
    } else {
        previewContent.innerHTML = '<p style="color: #999; text-align: center;">No slides yet. Start typing!</p>';
    }
}

// Show specific slide preview
function showSlidePreview(slide) {
    const previewContent = document.getElementById('previewContent');

    let html = '<div class="slide-preview active">';
    html += '<div class="preview-slide-content">';
    html += slide.html;
    html += '</div>';

    if (slide.mermaid) {
        html += `
            <div class="preview-mermaid">
                <div class="mermaid-container">
                    <div class="mermaid">${slide.mermaid}</div>
                </div>
            </div>
        `;
    }

    html += '</div>';

    previewContent.innerHTML = html;

    // Re-render Mermaid diagrams
    if (slide.mermaid) {
        renderMermaidDiagrams();
    }

    // Initialize collapsible code blocks
    initializeCollapsibleCodeBlocks();
}

// Jump to selected slide
function jumpToSlide() {
    const slideSelector = document.getElementById('slideSelector');
    currentSlideIndex = parseInt(slideSelector.value);

    // Parse current content to get slides
    const content = editor.value;
    const slides = parseMarkdownToSlides(content);

    if (slides[currentSlideIndex]) {
        showSlidePreview(slides[currentSlideIndex]);
    }
}

// Parse markdown to slides (client-side)
function parseMarkdownToSlides(content) {
    const slideTexts = content.split(/\n---+\n/);
    const slides = [];

    slideTexts.forEach(slideText => {
        const trimmed = slideText.trim();
        if (!trimmed) return;

        // Check for mermaid
        const mermaidMatch = trimmed.match(/```mermaid\n([\s\S]*?)\n```/);
        const mermaid = mermaidMatch ? mermaidMatch[1] : null;

        // Simple markdown to HTML (basic conversion)
        let html = trimmed;

        // Remove mermaid blocks from HTML
        if (mermaid) {
            html = html.replace(/```mermaid\n[\s\S]*?\n```/, '');
        }

        // Convert headers
        html = html.replace(/^### (.*)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*)/gm, '<h1>$1</h1>');

        // Convert bold and italic
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Convert lists
        html = html.replace(/^- (.*)/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // Convert code blocks
        html = html.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Convert line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';

        slides.push({
            html: html,
            mermaid: mermaid,
            raw: trimmed
        });
    });

    return slides;
}

// Update status indicator
function updateStatus(state, text) {
    const statusIcon = document.querySelector('.status-icon');
    const statusText = document.querySelector('.status-text');

    statusText.textContent = text;

    // Update icon color based on state
    switch(state) {
        case 'editing':
            statusIcon.style.background = '#f59e0b'; // Yellow
            break;
        case 'saving':
            statusIcon.style.background = '#3b82f6'; // Blue
            break;
        case 'saved':
            statusIcon.style.background = '#10b981'; // Green
            break;
        case 'error':
            statusIcon.style.background = '#ef4444'; // Red
            break;
        default:
            statusIcon.style.background = '#6b7280'; // Gray
    }
}

// Toolbar functions
function insertMarkdown(before, after) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const selectedText = value.substring(start, end);

    const newText = before + selectedText + after;
    editor.value = value.substring(0, start) + newText + value.substring(end);

    // Set cursor position
    if (selectedText) {
        editor.selectionStart = start;
        editor.selectionEnd = start + newText.length;
    } else {
        editor.selectionStart = editor.selectionEnd = start + before.length;
    }

    editor.focus();
    handleContentChange();
}

function insertSlideBreak() {
    const position = editor.selectionEnd;
    const value = editor.value;

    const slideBreak = '\n\n---\n\n';
    editor.value = value.substring(0, position) + slideBreak + value.substring(position);
    editor.selectionStart = editor.selectionEnd = position + slideBreak.length;
    editor.focus();
    handleContentChange();
}

// Toggle preview pane
function togglePreview() {
    const previewPane = document.getElementById('previewPane');
    const editorPane = document.querySelector('.editor-pane');

    if (previewPane.style.display === 'none') {
        previewPane.style.display = 'flex';
        editorPane.style.gridColumn = '1';
    } else {
        previewPane.style.display = 'none';
        editorPane.style.gridColumn = '1 / -1';
    }
}

// Download markdown file
function downloadMarkdown() {
    const content = editor.value;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'presentation.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    updateStatus('saved', 'Downloaded');
}

// Keyboard shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            sendUpdate();
        }

        // Ctrl/Cmd + D to download
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            downloadMarkdown();
        }

        // Ctrl/Cmd + P to toggle preview
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            togglePreview();
        }

        // Ctrl/Cmd + B for bold
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            insertMarkdown('**', '**');
        }

        // Ctrl/Cmd + I for italic
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            insertMarkdown('*', '*');
        }

        // Ctrl/Cmd + K for link
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            insertMarkdown('[', '](url)');
        }

        // Ctrl/Cmd + Enter for new slide
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            insertSlideBreak();
        }
    });
}

// Mermaid rendering
async function renderMermaidDiagrams() {
    if (!window.beautifulMermaid) {
        console.error('beautiful-mermaid not loaded');
        return;
    }

    const { renderMermaid, THEMES } = window.beautifulMermaid;

    const mermaidElements = document.querySelectorAll('.mermaid');

    for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i];

        // Store original diagram text if not already stored
        if (!element.dataset.mermaidOriginal) {
            const originalText = element.textContent.trim();
            if (originalText && !originalText.startsWith('<svg')) {
                element.dataset.mermaidOriginal = originalText;
            }
        }

        // Get the original diagram definition
        const graphDefinition = element.dataset.mermaidOriginal || element.textContent.trim();

        if (!graphDefinition || graphDefinition.startsWith('<svg')) {
            continue;
        }

        try {
            // Use github-light theme for editor preview
            const svg = await renderMermaid(graphDefinition, THEMES['github-light']);
            element.innerHTML = svg;
        } catch (e) {
            console.error('Mermaid rendering error:', e);
            element.innerHTML = `<div style="color: red; padding: 1rem; border: 1px solid red; border-radius: 4px;">
                <strong>Error rendering diagram:</strong><br>
                ${e.message || e}
            </div>`;
        }
    }
}

// Auto-save indicator
setInterval(function() {
    if (!isSaving && !updateTimeout) {
        const statusText = document.querySelector('.status-text');
        if (statusText.textContent === 'Saved') {
            const lastSaved = new Date().toLocaleTimeString();
            statusText.textContent = `Saved at ${lastSaved}`;
        }
    }
}, 60000); // Update every minute

// Collapsible Code Blocks
function initializeCollapsibleCodeBlocks() {
    // Find all code blocks (both plain pre and highlighted)
    const codeBlocks = document.querySelectorAll('.preview-slide-content pre, .preview-slide-content .highlight');

    codeBlocks.forEach((block, index) => {
        // Skip if already wrapped
        if (block.closest('.code-block-wrapper')) return;

        // Skip if it's a pre inside a highlight (already handled)
        if (block.tagName === 'PRE' && block.closest('.highlight')) return;

        // Get language from class if available
        let language = 'code';
        const codeElement = block.querySelector('code') || block;
        const classList = codeElement.className || '';
        const langMatch = classList.match(/language-(\w+)|highlight-(\w+)|(\w+)/);
        if (langMatch) {
            language = langMatch[1] || langMatch[2] || langMatch[3] || 'code';
        }

        // Check if this is a mermaid code block (check content for mermaid syntax)
        const text = block.textContent || '';
        const isMermaid = language.toLowerCase() === 'mermaid' ||
                          text.trim().match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|quadrantChart|requirementDiagram|gitGraph|mindmap|timeline)\s/i);

        // Count lines
        const lines = text.split('\n').filter(line => line.trim() !== '').length;

        // Create wrapper - collapse mermaid by default
        const wrapper = document.createElement('div');
        wrapper.className = isMermaid ? 'code-block-wrapper collapsed' : 'code-block-wrapper';

        // Create header
        const header = document.createElement('div');
        header.className = 'code-block-header';
        header.innerHTML = `
            <div class="code-info">
                <span class="code-language">${isMermaid ? 'mermaid' : language}</span>
                <span class="code-lines">${lines} line${lines !== 1 ? 's' : ''}</span>
            </div>
            <button class="code-collapse-btn" onclick="toggleCodeBlock(this)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                <span>${isMermaid ? 'Expand' : 'Collapse'}</span>
            </button>
        `;

        // Create content wrapper
        const content = document.createElement('div');
        content.className = 'code-block-content';

        // Wrap the original block
        block.parentNode.insertBefore(wrapper, block);
        content.appendChild(block);
        wrapper.appendChild(header);
        wrapper.appendChild(content);
    });
}

function toggleCodeBlock(button) {
    const wrapper = button.closest('.code-block-wrapper');
    const isCollapsed = wrapper.classList.toggle('collapsed');
    const buttonText = button.querySelector('span');
    buttonText.textContent = isCollapsed ? 'Expand' : 'Collapse';
}