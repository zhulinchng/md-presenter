// Remote Control Client
// Drives a presentation by emitting page events into the presenter's room.
// Globals injected by templates/control.html: fileId, totalSlides, currentPage.

let socket = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    socket = io();

    socket.on('connect', function() {
        socket.emit('join_presentation', { file_id: fileId });
        socket.emit('request_sync', { file_id: fileId });
    });

    socket.on('sync_data', function(data) {
        currentPage = Math.min(data.current_page || 0, Math.max(0, totalSlides - 1));
        updateCounter();
    });

    // Server excludes the sender, so this only fires for other clients
    // (presenter or a second controller) navigating the deck.
    socket.on('page_changed', function(data) {
        currentPage = data.page;
        updateCounter();
    });

    socket.on('content_updated', function(data) {
        totalSlides = data.slides.length;
        if (currentPage >= totalSlides) {
            currentPage = Math.max(0, totalSlides - 1);
        }
        updateCounter();
    });

    initializeSwipe();
});

function updateCounter() {
    document.getElementById('ctlCurrent').textContent = currentPage + 1;
    document.getElementById('ctlTotal').textContent = totalSlides;

    const prevBtn = document.getElementById('ctlPrevBtn');
    const nextBtn = document.getElementById('ctlNextBtn');
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalSlides - 1;
}

function previousSlide() {
    if (currentPage > 0 && socket) {
        currentPage--;
        updateCounter();
        socket.emit('change_page', { file_id: fileId, page: currentPage });
    }
}

function nextSlide() {
    if (currentPage < totalSlides - 1 && socket) {
        currentPage++;
        updateCounter();
        socket.emit('change_page', { file_id: fileId, page: currentPage });
    }
}

// Touch/Swipe Support (same gesture model as presenter.js)
let touchStartX = 0;
let touchEndX = 0;

function initializeSwipe() {
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
}

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
