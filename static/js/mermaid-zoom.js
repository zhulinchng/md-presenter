// Mermaid Zoom Manager - Shared zoom functionality
class MermaidZoomManager {
  constructor() {
    this.originalDimensions = new WeakMap();
    this.defaultZoom = 1; // Default zoom is 200% (displayed as 100%)
    this.initializeEventListeners();
  }

  // Store original dimensions of the SVG when first rendered
  storeOriginalDimensions(wrapper) {
    const svg = wrapper.querySelector("svg");
    if (!svg || this.originalDimensions.has(wrapper)) return;

    const rect = svg.getBoundingClientRect();
    // Store the actual SVG dimensions
    this.originalDimensions.set(wrapper, {
      width: rect.width,
      height: rect.height,
    });

    // Set initial wrapper dimensions at default zoom (200%)
    wrapper.style.width = `${rect.width * this.defaultZoom}px`;
    wrapper.style.height = `${rect.height * this.defaultZoom}px`;
    wrapper.dataset.zoom = this.defaultZoom.toString();
    wrapper.style.transform = `scale(${this.defaultZoom})`;

    // Update zoom display
    const container = wrapper.closest(".slide-mermaid, .preview-mermaid");
    if (container) {
      const zoomLevel = container.querySelector(".zoom-level");
      if (zoomLevel) {
        zoomLevel.textContent = "100%"; // Display 200% as 100%
      }
    }
  }

  // Get original dimensions for a wrapper
  getOriginalDimensions(wrapper) {
    return this.originalDimensions.get(wrapper) || { width: 0, height: 0 };
  }

  // Update zoom level
  updateZoom(container, newZoom) {
    const wrapper = container.querySelector(".mermaid-wrapper");
    const mermaidContainer = container.querySelector(".mermaid-container");
    const zoomLevel = container.querySelector(".zoom-level");

    if (!wrapper || !mermaidContainer) return;

    // Get original dimensions
    const original = this.getOriginalDimensions(wrapper);
    if (original.width === 0 || original.height === 0) {
      console.warn(
        "Original dimensions not set. Call storeOriginalDimensions first.",
      );
      return;
    }

    // Store current scroll position as percentage
    const scrollLeftPercent =
      mermaidContainer.scrollLeft /
      Math.max(1, mermaidContainer.scrollWidth - mermaidContainer.clientWidth);
    const scrollTopPercent =
      mermaidContainer.scrollTop /
      Math.max(
        1,
        mermaidContainer.scrollHeight - mermaidContainer.clientHeight,
      );

    // Apply zoom
    wrapper.dataset.zoom = newZoom;
    wrapper.style.transform = `scale(${newZoom})`;

    // Update wrapper dimensions for proper scrolling
    wrapper.style.width = `${original.width * newZoom}px`;
    wrapper.style.height = `${original.height * newZoom}px`;

    // Update zoom level display (calibrated: 200% = 100%)
    if (zoomLevel) {
      const displayZoom = Math.round((newZoom / this.defaultZoom) * 100);
      zoomLevel.textContent = `${displayZoom}%`;
    }

    // Restore scroll position
    requestAnimationFrame(() => {
      const newScrollWidth = Math.max(
        1,
        mermaidContainer.scrollWidth - mermaidContainer.clientWidth,
      );
      const newScrollHeight = Math.max(
        1,
        mermaidContainer.scrollHeight - mermaidContainer.clientHeight,
      );

      if (!isNaN(scrollLeftPercent) && isFinite(scrollLeftPercent)) {
        mermaidContainer.scrollLeft = scrollLeftPercent * newScrollWidth;
      }
      if (!isNaN(scrollTopPercent) && isFinite(scrollTopPercent)) {
        mermaidContainer.scrollTop = scrollTopPercent * newScrollHeight;
      }
    });
  }

  // Zoom in
  zoomIn(button) {
    const container = button.closest(".slide-mermaid, .preview-mermaid");
    if (!container) return;

    const wrapper = container.querySelector(".mermaid-wrapper");
    if (!wrapper) return;

    let currentZoom = parseFloat(wrapper.dataset.zoom) || this.defaultZoom;
    // Increment by 0.5 (25% of default zoom)
    currentZoom = Math.min(currentZoom + 0.5, 10); // Max 500% (10 / 2 = 500%)
    this.updateZoom(container, currentZoom);
  }

  // Zoom out
  zoomOut(button) {
    const container = button.closest(".slide-mermaid, .preview-mermaid");
    if (!container) return;

    const wrapper = container.querySelector(".mermaid-wrapper");
    if (!wrapper) return;

    let currentZoom = parseFloat(wrapper.dataset.zoom) || this.defaultZoom;
    // Decrement by 0.5 (25% of default zoom)
    currentZoom = Math.max(currentZoom - 0.5, 0.5); // Min 25% (0.5 / 2 = 25%)
    this.updateZoom(container, currentZoom);
  }

  // Reset zoom to default (200% actual, displayed as 100%)
  resetZoom(button) {
    const container = button.closest(".slide-mermaid, .preview-mermaid");
    if (!container) return;

    const mermaidContainer = container.querySelector(".mermaid-container");
    if (!mermaidContainer) return;

    this.updateZoom(container, this.defaultZoom);

    // Center the diagram
    requestAnimationFrame(() => {
      const scrollWidth = Math.max(
        0,
        mermaidContainer.scrollWidth - mermaidContainer.clientWidth,
      );
      const scrollHeight = Math.max(
        0,
        mermaidContainer.scrollHeight - mermaidContainer.clientHeight,
      );
      mermaidContainer.scrollLeft = scrollWidth / 2;
      mermaidContainer.scrollTop = scrollHeight / 2;
    });
  }

  // Fit diagram to screen
  fitToScreen(button) {
    const container = button.closest(".slide-mermaid, .preview-mermaid");
    if (!container) return;

    const wrapper = container.querySelector(".mermaid-wrapper");
    const mermaidContainer = container.querySelector(".mermaid-container");
    if (!wrapper || !mermaidContainer) return;

    // Get original dimensions
    const original = this.getOriginalDimensions(wrapper);
    if (original.width === 0 || original.height === 0) {
      console.warn("Original dimensions not set");
      return;
    }

    // Calculate available space (with some padding)
    const padding = 20;
    const availableWidth = mermaidContainer.clientWidth - padding * 2;
    const availableHeight = mermaidContainer.clientHeight - padding * 2;

    // Calculate scale to fit
    const scaleX = availableWidth / original.width;
    const scaleY = availableHeight / original.height;
    // Don't zoom in beyond default zoom (200% actual, 100% display)
    const scale = Math.min(scaleX, scaleY, this.defaultZoom);

    this.updateZoom(container, scale);

    // Center the diagram
    requestAnimationFrame(() => {
      const scrollWidth = Math.max(
        0,
        mermaidContainer.scrollWidth - mermaidContainer.clientWidth,
      );
      const scrollHeight = Math.max(
        0,
        mermaidContainer.scrollHeight - mermaidContainer.clientHeight,
      );
      mermaidContainer.scrollLeft = scrollWidth / 2;
      mermaidContainer.scrollTop = scrollHeight / 2;
    });
  }

  // Initialize event listeners
  initializeEventListeners() {
    // Mouse wheel zoom
    document.addEventListener(
      "wheel",
      (e) => {
        const mermaidContainer = e.target.closest(".mermaid-container");
        if (!mermaidContainer) return;

        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();

          const container = mermaidContainer.closest(
            ".slide-mermaid, .preview-mermaid",
          );
          const wrapper = mermaidContainer.querySelector(".mermaid-wrapper");
          if (!container || !wrapper) return;

          let currentZoom =
            parseFloat(wrapper.dataset.zoom) || this.defaultZoom;
          const delta = e.deltaY > 0 ? -0.2 : 0.2; // Adjusted for calibrated scale
          currentZoom = Math.max(0.5, Math.min(10, currentZoom + delta)); // 25% to 500%

          this.updateZoom(container, currentZoom);
        }
      },
      { passive: false },
    );

    // Pan functionality
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;

    document.addEventListener("mousedown", (e) => {
      const wrapper = e.target.closest(".mermaid-wrapper");
      if (!wrapper) return;

      const container = wrapper.closest(".mermaid-container");
      if (!container) return;

      isDragging = true;
      wrapper.classList.add("dragging");

      startX = e.pageX - container.offsetLeft;
      startY = e.pageY - container.offsetTop;
      scrollLeft = container.scrollLeft;
      scrollTop = container.scrollTop;

      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const wrapper = document.querySelector(".mermaid-wrapper.dragging");
      if (!wrapper) return;

      const container = wrapper.closest(".mermaid-container");
      if (!container) return;

      const x = e.pageX - container.offsetLeft;
      const y = e.pageY - container.offsetTop;
      const walkX = (x - startX) * 1.5;
      const walkY = (y - startY) * 1.5;

      container.scrollLeft = scrollLeft - walkX;
      container.scrollTop = scrollTop - walkY;

      e.preventDefault();
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      const wrapper = document.querySelector(".mermaid-wrapper.dragging");
      if (wrapper) {
        wrapper.classList.remove("dragging");
      }
    });

    // Double-click to reset
    document.addEventListener("dblclick", (e) => {
      const wrapper = e.target.closest(".mermaid-wrapper");
      if (!wrapper) return;

      const container = wrapper.closest(".slide-mermaid, .preview-mermaid");
      if (!container) return;

      const resetBtn = container.querySelector(
        '.mermaid-control-btn[title="Reset Zoom"]',
      );
      if (resetBtn) {
        this.resetZoom(resetBtn);
      }
    });
  }

  // Initialize all mermaid diagrams on the page
  initializeAll() {
    const wrappers = document.querySelectorAll(".mermaid-wrapper");
    wrappers.forEach((wrapper) => {
      const svg = wrapper.querySelector("svg");
      if (svg) {
        this.storeOriginalDimensions(wrapper);
      }
    });
  }
}

// Create global instance
window.mermaidZoomManager = new MermaidZoomManager();

// Global functions for onclick handlers
window.zoomIn = (button) => window.mermaidZoomManager.zoomIn(button);
window.zoomOut = (button) => window.mermaidZoomManager.zoomOut(button);
window.resetZoom = (button) => window.mermaidZoomManager.resetZoom(button);
window.fitToScreen = (button) => window.mermaidZoomManager.fitToScreen(button);
