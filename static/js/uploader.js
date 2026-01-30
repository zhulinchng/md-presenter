// File Upload Handler
document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

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
            alert('Please upload a Markdown file (.md or .markdown)');
            return;
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            alert('File size must be less than 10MB');
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
                    setTimeout(() => {
                        window.location.href = response.redirect;
                    }, 1000);
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
        alert(message);
        uploadProgress.style.display = 'none';
        dropZone.style.display = 'block';
        progressFill.style.width = '0%';
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