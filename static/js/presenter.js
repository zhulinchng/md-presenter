// Presenter JavaScript
let socket = null;
let isFullscreen = false;
let theme = localStorage.getItem('theme') || 'light';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Mermaid first
    if (window.mermaid) {
        window.mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose',
            flowchart: {
                htmlLabels: true,
                useMaxWidth: true
            }
        });
    }

    initializeWebSocket();
    initializeKeyboardShortcuts();
    initializeTheme();
    updateProgress();
    initializeCollapsibleCodeBlocks();

    // Render mermaid after a short delay to ensure everything is loaded
    setTimeout(() => {
        renderMermaidDiagrams();
    }, 100);
});

// WebSocket Connection
function initializeWebSocket() {
    socket = io();

    socket.on('connect', function() {
        console.log('Connected to server');
        // Join presentation room
        socket.emit('join_presentation', { file_id: fileId });
    });

    socket.on('content_updated', function(data) {
        // Update slides when content changes
        updateSlides(data.slides);
    });

    socket.on('page_changed', function(data) {
        // Sync page navigation
        goToSlide(data.page);
    });

    socket.on('disconnect', function() {
        console.log('Disconnected from server');
    });
}

// Slide Navigation
function nextSlide() {
    if (currentSlideIndex < totalSlides - 1) {
        currentSlideIndex++;
        showSlide(currentSlideIndex);
        socket.emit('change_page', { file_id: fileId, page: currentSlideIndex });
    }
}

function previousSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        showSlide(currentSlideIndex);
        socket.emit('change_page', { file_id: fileId, page: currentSlideIndex });
    }
}

function goToSlide(index) {
    if (index >= 0 && index < totalSlides) {
        currentSlideIndex = index;
        showSlide(currentSlideIndex);
    }
}

function showSlide(index) {
    const slides = document.querySelectorAll('.slide');
    const thumbnails = document.querySelectorAll('.thumbnail');

    // Hide all slides
    slides.forEach((slide, i) => {
        slide.classList.remove('active', 'prev');
        if (i < index) {
            slide.classList.add('prev');
        }
    });

    // Show current slide
    if (slides[index]) {
        slides[index].classList.add('active');

        // Process embedded content in the current slide
        processEmbeddedContent(slides[index]);
    }

    // Update thumbnails
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });

    // Update counter
    document.getElementById('currentSlide').textContent = index + 1;

    // Update progress
    updateProgress();

    // Update navigation buttons
    updateNavigationButtons();

    // Re-render Mermaid diagrams for current slide
    renderCurrentSlideMermaid();
}

// Process embedded content (Instagram, Twitter, etc.)
function processEmbeddedContent(slide) {
    // Re-process Instagram embeds
    if (window.instgrm && slide.querySelector('.instagram-media')) {
        window.instgrm.Embeds.process();
    }

    // Re-process Twitter embeds
    if (window.twttr && slide.querySelector('.twitter-tweet')) {
        window.twttr.widgets.load(slide);
    }

    // Re-process TikTok embeds
    if (window.TikTok && slide.querySelector('.tiktok-embed')) {
        window.TikTok.Embeds.process();
    }
}

function updateProgress() {
    const progress = ((currentSlideIndex + 1) / totalSlides) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = currentSlideIndex === 0;
    nextBtn.disabled = currentSlideIndex === totalSlides - 1;

    prevBtn.style.opacity = currentSlideIndex === 0 ? '0.5' : '1';
    nextBtn.style.opacity = currentSlideIndex === totalSlides - 1 ? '0.5' : '1';
}

// Keyboard Shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ignore if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch(e.key) {
            case 'ArrowRight':
            case ' ':
            case 'Enter':
                e.preventDefault();
                nextSlide();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                previousSlide();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                toggleFullscreen();
                break;
            case 'e':
            case 'E':
                e.preventDefault();
                window.location.href = `/edit/${fileId}`;
                break;
            case 'g':
            case 'G':
                e.preventDefault();
                showGotoModal();
                break;
            case 'Escape':
                if (isFullscreen) {
                    toggleFullscreen();
                }
                closeGotoModal();
                break;
            case 't':
            case 'T':
                e.preventDefault();
                toggleThumbnails();
                break;
            case 'Home':
                e.preventDefault();
                goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                goToSlide(totalSlides - 1);
                break;
        }

        // Number keys for quick navigation (1-9)
        if (e.key >= '1' && e.key <= '9') {
            const slideNumber = parseInt(e.key) - 1;
            if (slideNumber < totalSlides) {
                goToSlide(slideNumber);
            }
        }
    });
}

// Fullscreen Mode
function toggleFullscreen() {
    const container = document.querySelector('.presentation-container');

    if (!isFullscreen) {
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
            container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        }
        container.classList.add('fullscreen');
        isFullscreen = true;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        container.classList.remove('fullscreen');
        isFullscreen = false;
    }

    // Update button icon
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    fullscreenBtn.innerHTML = isFullscreen ?
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg> Exit' :
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg> Fullscreen';
}

// Theme Toggle
function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update Mermaid theme
    if (window.mermaid) {
        window.mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose',
            flowchart: {
                htmlLabels: true,
                useMaxWidth: true
            }
        });
        renderMermaidDiagrams();
    }
}

function initializeTheme() {
    document.body.setAttribute('data-theme', theme);
}

// Go to Slide Modal
function showGotoModal() {
    const modal = document.getElementById('gotoModal');
    const input = document.getElementById('gotoInput');
    modal.style.display = 'flex';
    input.value = currentSlideIndex + 1;
    input.focus();
    input.select();

    // Handle Enter key in input
    input.onkeydown = function(e) {
        if (e.key === 'Enter') {
            gotoSlide();
        } else if (e.key === 'Escape') {
            closeGotoModal();
        }
    };
}

function closeGotoModal() {
    const modal = document.getElementById('gotoModal');
    modal.style.display = 'none';
}

function gotoSlide() {
    const input = document.getElementById('gotoInput');
    const slideNumber = parseInt(input.value);

    if (slideNumber >= 1 && slideNumber <= totalSlides) {
        goToSlide(slideNumber - 1);
        closeGotoModal();
    } else {
        alert(`Please enter a number between 1 and ${totalSlides}`);
    }
}

// Thumbnail Sidebar
function toggleThumbnails() {
    const sidebar = document.getElementById('thumbnailSidebar');
    const isVisible = sidebar.style.display !== 'none';

    if (isVisible) {
        sidebar.style.display = 'none';
    } else {
        sidebar.style.display = 'block';
        sidebar.classList.add('show');
    }
}

// Mermaid Diagram Rendering
async function renderMermaidDiagrams() {
    if (!window.mermaid) {
        console.error('Mermaid not loaded');
        return;
    }

    // Re-render all Mermaid diagrams
    const mermaidElements = document.querySelectorAll('.mermaid');

    for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i];

        // Store original diagram text if not already stored
        if (!element.dataset.mermaidOriginal) {
            const originalText = element.textContent.trim();
            if (originalText && !originalText.startsWith('<svg') && !originalText.startsWith('#mermaid-graph')) {
                element.dataset.mermaidOriginal = originalText;
            }
        }

        // Get the original diagram definition
        const graphDefinition = element.dataset.mermaidOriginal || element.textContent.trim();

        if (!graphDefinition || graphDefinition.startsWith('<svg') || graphDefinition.startsWith('#mermaid-graph')) {
            continue;
        }

        try {
            const graphId = `mermaid-graph-${Date.now()}-${i}`;
            const { svg } = await window.mermaid.render(graphId, graphDefinition);
            element.innerHTML = svg;

            // Initialize zoom dimensions
            const wrapper = element.closest('.mermaid-wrapper');
            if (wrapper && window.mermaidZoomManager) {
                window.mermaidZoomManager.storeOriginalDimensions(wrapper);
            }
        } catch (e) {
            console.error('Mermaid rendering error:', e);
            element.innerHTML = `<div style="color: red; padding: 1rem; border: 1px solid red; border-radius: 4px;">
                <strong>Error rendering diagram:</strong><br>
                ${e.message || e}
            </div>`;
        }
    }
}

async function renderCurrentSlideMermaid() {
    if (!window.mermaid) {
        console.error('Mermaid not loaded');
        return;
    }

    const currentSlide = document.querySelector('.slide.active');
    if (currentSlide) {
        const mermaidElement = currentSlide.querySelector('.mermaid');
        if (mermaidElement && !mermaidElement.querySelector('svg')) {
            // Store original diagram text if not already stored
            if (!mermaidElement.dataset.mermaidOriginal) {
                const originalText = mermaidElement.textContent.trim();
                if (originalText && !originalText.startsWith('<svg') && !originalText.startsWith('#mermaid-graph')) {
                    mermaidElement.dataset.mermaidOriginal = originalText;
                }
            }

            // Get the original diagram definition
            const graphDefinition = mermaidElement.dataset.mermaidOriginal || mermaidElement.textContent.trim();

            if (!graphDefinition || graphDefinition.startsWith('<svg') || graphDefinition.startsWith('#mermaid-graph')) return;

            try {
                const graphId = `mermaid-current-${Date.now()}`;
                const { svg } = await window.mermaid.render(graphId, graphDefinition);
                mermaidElement.innerHTML = svg;

                // Initialize zoom dimensions
                const wrapper = mermaidElement.closest('.mermaid-wrapper');
                if (wrapper && window.mermaidZoomManager) {
                    window.mermaidZoomManager.storeOriginalDimensions(wrapper);
                }
            } catch (e) {
                console.error('Mermaid rendering error:', e);
                mermaidElement.innerHTML = `<div style="color: red; padding: 1rem; border: 1px solid red; border-radius: 4px;">
                    <strong>Error rendering diagram:</strong><br>
                    ${e.message || e}
                </div>`;
            }
        }
    }
}

// Update Slides (for live editing)
function updateSlides(slides) {
    const container = document.getElementById('slidesContainer');
    const currentIndex = currentSlideIndex;

    // Clear existing slides
    container.innerHTML = '';

    // Add updated slides
    slides.forEach((slide, index) => {
        const slideDiv = document.createElement('div');
        slideDiv.className = 'slide';
        slideDiv.setAttribute('data-slide', index);

        if (index === currentIndex) {
            slideDiv.classList.add('active');
        } else if (index < currentIndex) {
            slideDiv.classList.add('prev');
        }

        const layoutClass = slide.mermaid ? 'has-mermaid' : '';
        let slideHTML = `
            <div class="slide-layout ${layoutClass}">
                <div class="slide-content">
                    ${slide.html}
                </div>
        `;

        if (slide.mermaid) {
            slideHTML += `
                <div class="slide-mermaid">
                    <div class="mermaid-container">
                        <div class="mermaid-wrapper" data-zoom="2">
                            <div class="mermaid">${slide.mermaid}</div>
                        </div>
                    </div>
                    <div class="mermaid-controls">
                        <button class="mermaid-control-btn" onclick="zoomOut(this)" title="Zoom Out">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                                <line x1="8" y1="11" x2="14" y2="11"></line>
                            </svg>
                        </button>
                        <span class="zoom-level">100%</span>
                        <button class="mermaid-control-btn" onclick="zoomIn(this)" title="Zoom In">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                                <line x1="11" y1="8" x2="11" y2="14"></line>
                                <line x1="8" y1="11" x2="14" y2="11"></line>
                            </svg>
                        </button>
                        <button class="mermaid-control-btn" onclick="resetZoom(this)" title="Reset Zoom">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                <path d="M3 3v5h5"></path>
                            </svg>
                        </button>
                        <button class="mermaid-control-btn" onclick="fitToScreen(this)" title="Fit to Screen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }

        slideHTML += '</div>';

        if (slide.notes) {
            slideHTML += `
                <div class="speaker-notes" style="display: none;">
                    ${slide.notes}
                </div>
            `;
        }

        slideDiv.innerHTML = slideHTML;
        container.appendChild(slideDiv);
    });

    // Update total slides
    totalSlides = slides.length;
    document.getElementById('totalSlides').textContent = totalSlides;

    // Re-render Mermaid diagrams
    renderMermaidDiagrams();

    // Initialize collapsible code blocks for new content
    initializeCollapsibleCodeBlocks();

    // Update progress
    updateProgress();
}

// Touch/Swipe Support
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - next slide
            nextSlide();
        } else {
            // Swipe right - previous slide
            previousSlide();
        }
    }
}

// Mouse wheel navigation is disabled - users can scroll within slides freely
// Slide navigation is done via arrow keys, buttons, or swipe gestures

// Collapsible Code Blocks
function initializeCollapsibleCodeBlocks() {
    // Find all code blocks (both plain pre and highlighted)
    const codeBlocks = document.querySelectorAll('.slide-content pre, .slide-content .highlight');

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

// Zoom functions are now handled by mermaid-zoom.js

// Mermaid interactions are now handled by mermaid-zoom.js

