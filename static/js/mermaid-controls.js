/**
 * Mermaid Diagram Zoom & Pan Controls
 * Technical precision interaction system for SVG diagrams
 */

class MermaidZoomController {
    constructor(container) {
        this.container = container;
        this.svg = null;
        this.viewBox = { x: 0, y: 0, width: 0, height: 0 };
        this.originalViewBox = null;
        this.scale = 1;
        this.minScale = 0.1;
        this.maxScale = 10;
        this.isPanning = false;
        this.startPoint = { x: 0, y: 0 };
        this.controlsElement = null;

        this.initialize();
    }

    initialize() {
        // Wait for SVG to be rendered
        const observer = new MutationObserver(() => {
            const svg = this.container.querySelector('svg');
            if (svg && !this.svg) {
                this.setupSVG(svg);
                this.createControls();
                this.attachEventListeners();
            }
        });

        observer.observe(this.container, {
            childList: true,
            subtree: true
        });

        // Try immediate setup in case SVG already exists
        const svg = this.container.querySelector('svg');
        if (svg) {
            this.setupSVG(svg);
            this.createControls();
            this.attachEventListeners();
        }
    }

    setupSVG(svg) {
        this.svg = svg;

        // Ensure SVG has proper attributes for zooming
        if (!this.svg.hasAttribute('viewBox')) {
            const bbox = this.svg.getBBox();
            const padding = 20;
            this.viewBox = {
                x: bbox.x - padding,
                y: bbox.y - padding,
                width: bbox.width + padding * 2,
                height: bbox.height + padding * 2
            };
            this.svg.setAttribute('viewBox',
                `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
        } else {
            const vb = this.svg.getAttribute('viewBox').split(' ').map(Number);
            this.viewBox = { x: vb[0], y: vb[1], width: vb[2], height: vb[3] };
        }

        // Store original viewBox
        this.originalViewBox = { ...this.viewBox };

        // Ensure SVG is responsive
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.svg.style.cursor = 'grab';
    }

    createControls() {
        // Remove existing controls if any
        const existing = this.container.querySelector('.mermaid-zoom-controls');
        if (existing) existing.remove();
        const existingInstructions = this.container.querySelector('.zoom-instructions');
        if (existingInstructions) existingInstructions.remove();

        // Create control panel
        const controls = document.createElement('div');
        controls.className = 'mermaid-zoom-controls';
        controls.innerHTML = `
            <div class="zoom-control-group">
                <button class="zoom-btn zoom-in" title="Zoom In (Ctrl/Cmd +)" data-action="zoom-in">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </button>
                <button class="zoom-btn zoom-reset" title="Reset Zoom (Ctrl/Cmd 0)" data-action="reset">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 4v6h6"></path>
                        <path d="M23 20v-6h-6"></path>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                    </svg>
                </button>
                <button class="zoom-btn zoom-out" title="Zoom Out (Ctrl/Cmd -)" data-action="zoom-out">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </button>
            </div>
            <div class="zoom-indicator">
                <span class="zoom-value">100%</span>
            </div>
        `;

        // Create instructions separately (top-left)
        const instructions = document.createElement('div');
        instructions.className = 'zoom-instructions';
        instructions.innerHTML = '<kbd>Ctrl</kbd>+<kbd>Wheel</kbd> to zoom • <kbd>Drag</kbd> to pan';

        this.container.style.position = 'relative';
        this.container.appendChild(controls);
        this.container.appendChild(instructions);
        this.controlsElement = controls;

        // Attach button listeners
        controls.querySelector('[data-action="zoom-in"]').addEventListener('click', () => this.zoomIn());
        controls.querySelector('[data-action="zoom-out"]').addEventListener('click', () => this.zoomOut());
        controls.querySelector('[data-action="reset"]').addEventListener('click', () => this.resetZoom());
    }

    attachEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));

        // Mouse wheel zoom
        this.container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

        // Pan with mouse drag
        this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Touch support
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Pinch to zoom on touch devices
        this.lastTouchDistance = null;
    }

    handleKeyboard(e) {
        // Only handle if this diagram's container is visible
        if (!this.isVisible()) return;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? e.metaKey : e.ctrlKey;

        if (modKey) {
            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                this.zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                this.resetZoom();
            }
        }
    }

    handleWheel(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? e.metaKey : e.ctrlKey;

        if (modKey) {
            e.preventDefault();

            // Get mouse position relative to SVG
            const rect = this.svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Convert to SVG coordinates
            const svgX = this.viewBox.x + (mouseX / rect.width) * this.viewBox.width;
            const svgY = this.viewBox.y + (mouseY / rect.height) * this.viewBox.height;

            // Zoom in or out
            const delta = e.deltaY > 0 ? -1 : 1;
            this.zoomAtPoint(svgX, svgY, delta);
        }
    }

    handleMouseDown(e) {
        if (e.button !== 0) return; // Only left click

        this.isPanning = true;
        this.startPoint = { x: e.clientX, y: e.clientY };
        this.svg.style.cursor = 'grabbing';
        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.isPanning) return;

        const dx = e.clientX - this.startPoint.x;
        const dy = e.clientY - this.startPoint.y;

        // Calculate pan in SVG coordinates
        const rect = this.svg.getBoundingClientRect();
        const scaleX = this.viewBox.width / rect.width;
        const scaleY = this.viewBox.height / rect.height;

        this.viewBox.x -= dx * scaleX;
        this.viewBox.y -= dy * scaleY;

        this.updateViewBox();

        this.startPoint = { x: e.clientX, y: e.clientY };
    }

    handleMouseUp() {
        if (this.isPanning) {
            this.isPanning = false;
            this.svg.style.cursor = 'grab';
        }
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            // Single touch - pan
            this.isPanning = true;
            this.startPoint = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            e.preventDefault();
        } else if (e.touches.length === 2) {
            // Two touches - prepare for pinch zoom
            this.lastTouchDistance = this.getTouchDistance(e.touches);
            e.preventDefault();
        }
    }

    handleTouchMove(e) {
        if (e.touches.length === 1 && this.isPanning) {
            // Pan
            const dx = e.touches[0].clientX - this.startPoint.x;
            const dy = e.touches[0].clientY - this.startPoint.y;

            const rect = this.svg.getBoundingClientRect();
            const scaleX = this.viewBox.width / rect.width;
            const scaleY = this.viewBox.height / rect.height;

            this.viewBox.x -= dx * scaleX;
            this.viewBox.y -= dy * scaleY;

            this.updateViewBox();

            this.startPoint = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            e.preventDefault();
        } else if (e.touches.length === 2) {
            // Pinch zoom
            const currentDistance = this.getTouchDistance(e.touches);

            if (this.lastTouchDistance) {
                const scale = currentDistance / this.lastTouchDistance;
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                const rect = this.svg.getBoundingClientRect();
                const svgX = this.viewBox.x + ((centerX - rect.left) / rect.width) * this.viewBox.width;
                const svgY = this.viewBox.y + ((centerY - rect.top) / rect.height) * this.viewBox.height;

                this.zoomAtPoint(svgX, svgY, (scale - 1) * 5);
            }

            this.lastTouchDistance = currentDistance;
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        if (e.touches.length === 0) {
            this.isPanning = false;
            this.lastTouchDistance = null;
        } else if (e.touches.length === 1) {
            this.lastTouchDistance = null;
        }
    }

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    zoomIn() {
        const centerX = this.viewBox.x + this.viewBox.width / 2;
        const centerY = this.viewBox.y + this.viewBox.height / 2;
        this.zoomAtPoint(centerX, centerY, 1);
    }

    zoomOut() {
        const centerX = this.viewBox.x + this.viewBox.width / 2;
        const centerY = this.viewBox.y + this.viewBox.height / 2;
        this.zoomAtPoint(centerX, centerY, -1);
    }

    zoomAtPoint(svgX, svgY, delta) {
        const zoomFactor = 1.2;
        const newScale = delta > 0 ? this.scale * zoomFactor : this.scale / zoomFactor;

        // Clamp scale
        if (newScale < this.minScale || newScale > this.maxScale) return;

        // Calculate new viewBox
        const ratio = delta > 0 ? 1 / zoomFactor : zoomFactor;

        const newWidth = this.viewBox.width * ratio;
        const newHeight = this.viewBox.height * ratio;

        // Keep zoom centered on point
        const relX = (svgX - this.viewBox.x) / this.viewBox.width;
        const relY = (svgY - this.viewBox.y) / this.viewBox.height;

        this.viewBox.width = newWidth;
        this.viewBox.height = newHeight;
        this.viewBox.x = svgX - relX * newWidth;
        this.viewBox.y = svgY - relY * newHeight;

        this.scale = newScale;
        this.updateViewBox();
        this.updateZoomIndicator();
    }

    resetZoom() {
        this.viewBox = { ...this.originalViewBox };
        this.scale = 1;
        this.updateViewBox();
        this.updateZoomIndicator();

        // Visual feedback
        if (this.controlsElement) {
            this.controlsElement.classList.add('reset-flash');
            setTimeout(() => {
                this.controlsElement.classList.remove('reset-flash');
            }, 300);
        }
    }

    updateViewBox() {
        if (this.svg) {
            this.svg.setAttribute('viewBox',
                `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
        }
    }

    updateZoomIndicator() {
        if (this.controlsElement) {
            const indicator = this.controlsElement.querySelector('.zoom-value');
            if (indicator) {
                const percent = Math.round(this.scale * 100);
                indicator.textContent = `${percent}%`;

                // Visual feedback for zoom limits
                const zoomInBtn = this.controlsElement.querySelector('.zoom-in');
                const zoomOutBtn = this.controlsElement.querySelector('.zoom-out');

                zoomInBtn.disabled = this.scale >= this.maxScale;
                zoomOutBtn.disabled = this.scale <= this.minScale;
            }
        }
    }

    isVisible() {
        return this.container &&
               this.container.offsetParent !== null &&
               this.container.closest('.slide.active') !== null;
    }

    destroy() {
        if (this.controlsElement) {
            this.controlsElement.remove();
        }
        // Remove instructions element
        const instructions = this.container.querySelector('.zoom-instructions');
        if (instructions) {
            instructions.remove();
        }
        // Note: We don't remove document-level event listeners as they check isVisible()
    }
}

// Auto-initialize for all mermaid containers
function initializeMermaidZoom() {
    const containers = document.querySelectorAll('.mermaid-container');
    const controllers = new Map();

    containers.forEach(container => {
        if (!controllers.has(container)) {
            const controller = new MermaidZoomController(container);
            controllers.set(container, controller);
        }
    });

    return controllers;
}

// Export for use in presenter.js
if (typeof window !== 'undefined') {
    window.MermaidZoomController = MermaidZoomController;
    window.initializeMermaidZoom = initializeMermaidZoom;
}
