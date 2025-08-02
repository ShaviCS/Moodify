document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    initializePage();
    
    // Add new song form handler
    const addSongForm = document.getElementById('add-song-form');
    if (addSongForm) {
        addSongForm.addEventListener('submit', handleAddSong);
    }
    
    // Delete song handlers
    attachDeleteHandlers();
    
    // Search and filter handlers
    initializeSearchAndFilter();
    
    // Initialize emotion sections (collapsed by default except first one)
    initializeEmotionSections();
});

function initializePage() {
    // Show loading states
    showPageLoading(false);
    
    // Update statistics
    updateStatistics();
    
    // Set up form validation
    setupFormValidation();
}

function updateStatistics() {
    // Update total songs count
    const totalSongs = document.querySelectorAll('.song-item').length;
    const totalSongsElement = document.getElementById('total-songs-count');
    if (totalSongsElement) {
        animateNumber(totalSongsElement, totalSongs);
    }
    
    // Update languages count
    const languages = new Set();
    document.querySelectorAll('.language').forEach(el => {
        languages.add(el.textContent.trim());
    });
    const totalLanguagesElement = document.getElementById('total-languages-count');
    if (totalLanguagesElement) {
        animateNumber(totalLanguagesElement, languages.size);
    }
}

function animateNumber(element, targetNumber) {
    const startNumber = 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentNumber = Math.floor(startNumber + (targetNumber - startNumber) * progress);
        element.textContent = currentNumber;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

function setupFormValidation() {
    const form = document.getElementById('add-song-form');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

function validateField(event) {
    const field = event.target;
    const value = field.value.trim();
    
    clearFieldError(event);
    
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    if (field.type === 'url' && value) {
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(value)) {
            showFieldError(field, 'Please enter a valid URL (starting with http:// or https://)');
            return false;
        }
    }
    
    return true;
}

function showFieldError(field, message) {
    clearFieldError({ target: field });
    
    field.style.borderColor = '#e74c3c';
    field.style.backgroundColor = '#fdf2f2';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.color = '#e74c3c';
    errorDiv.style.fontSize = '0.85rem';
    errorDiv.style.marginTop = '5px';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(event) {
    const field = event.target;
    field.style.borderColor = '';
    field.style.backgroundColor = '';
    
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function handleAddSong(e) {
    e.preventDefault();
    
    // Validate all fields
    const form = e.target;
    const inputs = form.querySelectorAll('input, select');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField({ target: input })) {
            isValid = false;
        }
    });
    
    if (!isValid) {
        showAlert('Please fix the errors below', 'error');
        return;
    }
    
    const formData = {
        title: document.getElementById('title').value.trim(),
        artist: document.getElementById('artist').value.trim(),
        url: document.getElementById('url').value.trim(),
        emotion: document.getElementById('emotion').value,
        language: document.getElementById('language').value
    };
    
    // Show loading state
    const submitBtn = form.querySelector('.btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Song...';
    submitBtn.disabled = true;
    
    fetch('/admin/add_song', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Song added successfully!', 'success');
            form.reset();
            
            // Add the new song to the appropriate emotion section
            addSongToList(formData, data.song_id);
            
            // Update statistics
            updateStatistics();
        } else {
            showAlert('Error adding song: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('An error occurred while adding the song', 'error');
    })
    .finally(() => {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function addSongToList(songData, songId) {
    // Find or create emotion section
    let emotionSection = document.querySelector(`[data-emotion="${songData.emotion}"]`);
    
    if (!emotionSection) {
        // Create new emotion section if it doesn't exist
        emotionSection = createEmotionSection(songData.emotion);
        document.querySelector('.songs-content').appendChild(emotionSection);
    }
    
    // Create new song item
    const songItem = createSongItem(songData, songId);
    
    // Add to song list
    const songList = emotionSection.querySelector('.song-list');
    const emptyState = songList.querySelector('.empty-emotion');
    
    if (emptyState) {
        emptyState.remove();
    }
    
    songList.appendChild(songItem);
    
    // Update song count
    const songCount = emotionSection.querySelectorAll('.song-item').length;
    const countElement = emotionSection.querySelector('.song-count');
    if (countElement) {
        countElement.textContent = `${songCount} songs`;
    }
    
    // Expand the section if it was collapsed
    emotionSection.classList.remove('collapsed');
    
    // Attach delete handler to new song
    const deleteBtn = songItem.querySelector('.delete-song');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteSong);
    }
    
    // Highlight the new song briefly
    songItem.style.backgroundColor = '#d4edda';
    setTimeout(() => {
        songItem.style.backgroundColor = '';
    }, 2000);
}

function createSongItem(songData, songId) {
    const songItem = document.createElement('div');
    songItem.className = 'song-item';
    songItem.setAttribute('data-song-id', songId);
    songItem.setAttribute('data-emotion', songData.emotion);
    songItem.setAttribute('data-language', songData.language);
    
    songItem.innerHTML = `
        <div class="song-info">
            <h4>${escapeHtml(songData.title)}</h4>
            <p class="artist">by ${escapeHtml(songData.artist)}</p>
            <p><span class="language">${escapeHtml(songData.language)}</span></p>
            <a href="${escapeHtml(songData.url)}" target="_blank">
                <i class="fas fa-external-link-alt"></i>
                Open Link
            </a>
        </div>
        <div class="song-actions">
            <button class="btn-danger delete-song" data-song-id="${songId}">
                <i class="fas fa-trash"></i>
                Delete
            </button>
        </div>
    `;
    
    return songItem;
}

function createEmotionSection(emotion) {
    const section = document.createElement('div');
    section.className = 'emotion-section';
    section.setAttribute('data-emotion', emotion);
    
    const emotionIcon = getEmotionIcon(emotion);
    
    section.innerHTML = `
        <div class="emotion-header" onclick="toggleEmotion(this)">
            <div class="emotion-header-left">
                <div class="emotion-icon">
                    <i class="${emotionIcon}"></i>
                </div>
                <h3>${emotion}</h3>
            </div>
            <div class="emotion-header-right">
                <span class="song-count">1 songs</span>
                <i class="fas fa-chevron-down toggle-icon"></i>
            </div>
        </div>
        <div class="song-list"></div>
    `;
    
    return section;
}

function getEmotionIcon(emotion) {
    const iconMap = {
        'Happy': 'fas fa-smile',
        'Sad': 'fas fa-frown',
        'Angry': 'fas fa-angry',
        'Fear': 'fas fa-grimace',
        'Surprise': 'fas fa-surprise',
        'Disgust': 'fas fa-dizzy',
        'Neutral': 'fas fa-meh'
    };
    
    return iconMap[emotion] || 'fas fa-meh';
}

function attachDeleteHandlers() {
    const deleteButtons = document.querySelectorAll('.delete-song');
    deleteButtons.forEach(button => {
        button.addEventListener('click', handleDeleteSong);
    });
}

function handleDeleteSong(e) {
    const button = e.currentTarget;
    const songId = button.getAttribute('data-song-id');
    const songItem = button.closest('.song-item');
    const songTitle = songItem.querySelector('h4').textContent;
    
    if (confirm(`Are you sure you want to delete "${songTitle}"?`)) {
        // Show loading state
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;
        
        fetch(`/admin/delete_song/${songId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Animate removal
                songItem.style.opacity = '0';
                songItem.style.transform = 'translateX(-100%)';
                
                setTimeout(() => {
                    songItem.remove();
                    
                    // Update song count for the emotion section
                    const emotionSection = songItem.closest('.emotion-section');
                    if (emotionSection) {
                        const remainingSongs = emotionSection.querySelectorAll('.song-item').length;
                        const countElement = emotionSection.querySelector('.song-count');
                        if (countElement) {
                            countElement.textContent = `${remainingSongs} songs`;
                        }
                        
                        // Add empty state if no songs left
                        if (remainingSongs === 0) {
                            const songList = emotionSection.querySelector('.song-list');
                            songList.innerHTML = `
                                <div class="empty-emotion">
                                    <i class="fas fa-music"></i>
                                    <p>No songs available for this emotion</p>
                                </div>
                            `;
                        }
                    }
                    
                    // Update statistics
                    updateStatistics();
                    
                    showAlert('Song deleted successfully', 'success');
                }, 300);
            } else {
                showAlert('Error deleting song: ' + data.error, 'error');
                // Reset button state
                button.innerHTML = '<i class="fas fa-trash"></i> Delete';
                button.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while deleting the song', 'error');
            // Reset button state
            button.innerHTML = '<i class="fas fa-trash"></i> Delete';
            button.disabled = false;
        });
    }
}

function initializeSearchAndFilter() {
    const searchInput = document.getElementById('search-songs');
    const emotionFilter = document.getElementById('emotion-filter');
    const languageFilter = document.getElementById('language-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterSongs, 300));
    }
    
    if (emotionFilter) {
        emotionFilter.addEventListener('change', filterSongs);
    }
    
    if (languageFilter) {
        languageFilter.addEventListener('change', filterSongs);
    }
}

function filterSongs() {
    const searchTerm = document.getElementById('search-songs').value.toLowerCase();
    const emotionFilter = document.getElementById('emotion-filter').value;
    const languageFilter = document.getElementById('language-filter').value;
    
    const songItems = document.querySelectorAll('.song-item');
    const emotionSections = document.querySelectorAll('.emotion-section');
    
    // Reset all sections to visible
    emotionSections.forEach(section => {
        section.style.display = 'block';
    });
    
    songItems.forEach(item => {
        const title = item.querySelector('h4').textContent.toLowerCase();
        const artist = item.querySelector('.artist').textContent.toLowerCase();
        const emotion = item.getAttribute('data-emotion');
        const language = item.getAttribute('data-language');
        
        let visible = true;
        
        // Search filter
        if (searchTerm && !title.includes(searchTerm) && !artist.includes(searchTerm) && !emotion.toLowerCase().includes(searchTerm)) {
            visible = false;
        }
        
        // Emotion filter
        if (emotionFilter && emotion !== emotionFilter) {
            visible = false;
        }
        
        // Language filter
        if (languageFilter && language !== languageFilter) {
            visible = false;
        }
        
        item.style.display = visible ? 'flex' : 'none';
    });
    
    // Hide empty emotion sections
    emotionSections.forEach(section => {
        const visibleSongs = section.querySelectorAll('.song-item[style*="flex"], .song-item:not([style])');
        if (visibleSongs.length === 0 && (emotionFilter === '' || section.getAttribute('data-emotion') === emotionFilter)) {
            section.style.display = 'none';
        }
    });
}

function initializeEmotionSections() {
    const emotionSections = document.querySelectorAll('.emotion-section');
    emotionSections.forEach((section, index) => {
        // Collapse all sections except the first one
        if (index > 0) {
            section.classList.add('collapsed');
        }
    });
}

function toggleEmotion(header) {
    const section = header.closest('.emotion-section');
    const toggleIcon = header.querySelector('.toggle-icon');
    
    section.classList.toggle('collapsed');
    
    // Animate the toggle icon
    if (section.classList.contains('collapsed')) {
        toggleIcon.style.transform = 'rotate(-90deg)';
    } else {
        toggleIcon.style.transform = 'rotate(0deg)';
    }
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    alert.innerHTML = `
        <i class="fas ${icon}"></i>
        ${escapeHtml(message)}
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            alert.remove();
        }, 300);
    }, 5000);
}

function showPageLoading(show) {
    const container = document.querySelector('.song-management-container');
    if (!container) return;
    
    if (show) {
        container.classList.add('loading');
    } else {
        container.classList.remove('loading');
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Make toggleEmotion available globally for onclick handlers
window.toggleEmotion = toggleEmotion;