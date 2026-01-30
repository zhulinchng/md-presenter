// File Upload Handler with Recent Documents
document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const recentSection = document.getElementById('recentSection');
    const recentCarousel = document.getElementById('recentCarousel');
    const clearRecentBtn = document.getElementById('clearRecentBtn');

    const STORAGE_KEY = 'md_presenter_recent';
    const MAX_RECENT = 10;

    // Initialize recent documents
    loadRecentDocuments();

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    // Handle file selection
    fileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Click to select file
    dropZone.addEventListener('click', function(e) {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
            fileInput.click();
        }
    });

    // Clear recent documents
    if (clearRecentBtn) {
        clearRecentBtn.addEventListener('click', clearRecentDocuments);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropZone.classList.add('dragover');
    }

    function unhighlight(e) {
        dropZone.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFile(file) {
        // Validate file type
        const validExtensions = ['md', 'markdown'];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
            showNotification('Please upload a Markdown file (.md or .markdown)', 'error');
            return;
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showNotification('File size must be less than 10MB', 'error');
            return;
        }

        // Upload file
        uploadFile(file);
    }

    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        // Show progress
        uploadProgress.style.display = 'block';
        dropZone.style.display = 'none';

        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressFill.style.width = percentComplete + '%';
                progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
            }
        });

        // Handle completion
        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    progressText.textContent = 'Upload complete! Redirecting...';

                    // Save to recent documents
                    saveRecentDocument({
                        fileId: response.file_id,
                        filename: file.name,
                        uploadedAt: new Date().toISOString()
                    });

                    setTimeout(() => {
                        window.location.href = response.redirect;
                    }, 800);
                } else {
                    showError(response.error || 'Upload failed');
                }
            } else {
                showError('Upload failed. Please try again.');
            }
        });

        // Handle errors
        xhr.addEventListener('error', function() {
            showError('Upload failed. Please check your connection.');
        });

        // Send request
        xhr.open('POST', '/upload');
        xhr.send(formData);
    }

    function showError(message) {
        showNotification(message, 'error');
        uploadProgress.style.display = 'none';
        dropZone.style.display = 'block';
        progressFill.style.width = '0%';
    }

    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            padding: 1rem 1.5rem;
            background: ${type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(245, 158, 11, 0.9)'};
            color: white;
            border-radius: 0.75rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 0.9rem;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            backdrop-filter: blur(10px);
        `;

        // Add animation keyframes if not exists
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Recent Documents Functions
    function getRecentDocuments() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error reading recent documents:', e);
            return [];
        }
    }

    function saveRecentDocument(doc) {
        try {
            let recent = getRecentDocuments();

            // Remove if already exists
            recent = recent.filter(d => d.fileId !== doc.fileId);

            // Add to beginning
            recent.unshift(doc);

            // Keep only MAX_RECENT items
            recent = recent.slice(0, MAX_RECENT);

            localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
            loadRecentDocuments();
        } catch (e) {
            console.error('Error saving recent document:', e);
        }
    }

    function removeRecentDocument(fileId) {
        try {
            let recent = getRecentDocuments();
            recent = recent.filter(d => d.fileId !== fileId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
            loadRecentDocuments();
        } catch (e) {
            console.error('Error removing recent document:', e);
        }
    }

    function clearRecentDocuments() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            loadRecentDocuments();
        } catch (e) {
            console.error('Error clearing recent documents:', e);
        }
    }

    async function loadRecentDocuments() {
        const recent = getRecentDocuments();

        if (recent.length === 0) {
            if (recentSection) recentSection.style.display = 'none';
            return;
        }

        // Check which documents still exist
        const validDocs = [];
        for (const doc of recent) {
            try {
                const response = await fetch(`/api/check/${doc.fileId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.exists) {
                        validDocs.push({
                            ...doc,
                            slideCount: data.slideCount || 0
                        });
                    }
                }
            } catch (e) {
                // Document no longer exists, skip it
            }
        }

        // Update storage with only valid docs
        if (validDocs.length !== recent.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validDocs));
        }

        if (validDocs.length === 0) {
            if (recentSection) recentSection.style.display = 'none';
            return;
        }

        // Show section and render cards
        if (recentSection) recentSection.style.display = 'block';
        renderRecentCards(validDocs);
    }

    function renderRecentCards(documents) {
        if (!recentCarousel) return;

        recentCarousel.innerHTML = documents.map(doc => `
            <div class="recent-card" data-file-id="${doc.fileId}">
                <div class="recent-card-header">
                    <div class="recent-card-icon">MD</div>
                    <div class="recent-card-actions">
                        <button class="recent-action-btn" data-action="edit" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="recent-action-btn" data-action="delete" title="Remove">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="recent-card-title">${escapeHtml(doc.filename)}</div>
                <div class="recent-card-meta">${formatDate(doc.uploadedAt)}</div>
                ${doc.slideCount ? `<div class="recent-card-slides">${doc.slideCount} slides</div>` : ''}
            </div>
        `).join('');

        // Add click handlers
        recentCarousel.querySelectorAll('.recent-card').forEach(card => {
            const fileId = card.dataset.fileId;

            // Card click - go to presenter
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.recent-action-btn')) {
                    window.location.href = `/present/${fileId}`;
                }
            });

            // Edit button
            card.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `/edit/${fileId}`;
            });

            // Delete button
            card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
                e.stopPropagation();
                removeRecentDocument(fileId);
            });
        });
    }

    function formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add visual feedback for drag and drop
    let dragCounter = 0;

    document.addEventListener('dragenter', function(e) {
        dragCounter++;
        if (dragCounter === 1) {
            document.body.classList.add('dragging');
        }
    });

    document.addEventListener('dragleave', function(e) {
        dragCounter--;
        if (dragCounter === 0) {
            document.body.classList.remove('dragging');
        }
    });

    document.addEventListener('drop', function(e) {
        dragCounter = 0;
        document.body.classList.remove('dragging');
    });
});
