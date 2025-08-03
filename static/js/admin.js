// Sample data - replace with your actual data
const emotionIcons = {
    'Happy': 'fas fa-smile',
    'Sad': 'fas fa-sad-tear',
    'Angry': 'fas fa-angry',
    'Fear': 'fas fa-ghost',
    'Surprise': 'fas fa-surprise',
    'Disgust': 'fas fa-grimace',
    'Neutral': 'fas fa-meh',
    'Pregnant': 'fas fa-baby',
    'Depression': 'fas fa-cloud-rain',
    'Trouble Sleeping': 'fas fa-bed',
    'Travelling': 'fas fa-plane',
    'Stressed': 'fas fa-tired',
    'Lonely': 'fas fa-user',
    'Excited': 'fas fa-star'
};

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Toggle emotion sections
function toggleEmotion(header) {
    const section = header.parentElement;
    section.classList.toggle('collapsed');
}

// Show notification
function showNotification(type, title, message) {
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('.notification-icon i');
    const titleEl = notification.querySelector('.notification-text h5');
    const messageEl = notification.querySelector('.notification-text p');
    
    notification.className = `notification ${type}`;
    icon.className = type === 'success' ? 'fas fa-check' : 'fas fa-exclamation-triangle';
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Add new song
document.getElementById('add-song-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('title').value,
        artist: document.getElementById('artist').value,
        url: document.getElementById('url').value,
        emotion: document.getElementById('emotion').value,
        language: document.getElementById('language').value
    };
    
    // Add loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    submitBtn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        try {
            // Here you would make your actual API call
            // fetch('/admin/add_song', { ... })
            
            // For demo purposes, we'll simulate success
            console.log('Adding song:', formData);
            
            showNotification('success', 'Success!', 'Song added successfully to your library.');
            
            // Reset form
            this.reset();
            
            // In a real app, you'd refresh the song list here
            // updateSongList();
            
        } catch (error) {
            console.error('Error:', error);
            showNotification('error', 'Error!', 'Failed to add song. Please try again.');
        } finally {
            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }, 1500);
});

// Delete song
document.addEventListener('click', function(e) {
    if (e.target.closest('.delete-song')) {
        const button = e.target.closest('.delete-song');
        const songId = button.getAttribute('data-song-id');
        const songItem = button.closest('.song-item');
        const songTitle = songItem.querySelector('.song-title').textContent.trim();
        
        if (confirm(`Are you sure you want to delete "${songTitle}"?`)) {
            // Add loading state
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            button.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                try {
                    // Here you would make your actual API call
                    // fetch(`/admin/delete_song/${songId}`, { method: 'DELETE' })
                    
                    console.log('Deleting song:', songId);
                    
                    // Animate removal
                    songItem.style.transform = 'translateX(-100%)';
                    songItem.style.opacity = '0';
                    
                    setTimeout(() => {
                        songItem.remove();
                        showNotification('success', 'Deleted!', 'Song removed from your library.');
                        
                        // Update song count
                        const emotionSection = songItem.closest('.emotion-section');
                        const countElement = emotionSection.querySelector('.song-count span');
                        const currentCount = parseInt(countElement.textContent);
                        countElement.textContent = currentCount - 1;
                        
                        // If no songs left, show empty state
                        const remainingSongs = emotionSection.querySelectorAll('.song-item').length;
                        if (remainingSongs === 0) {
                            const songList = emotionSection.querySelector('.song-list');
                            songList.innerHTML = `
                                <div class="empty-state">
                                    <i class="fas fa-music"></i>
                                    <h4>No Songs Yet</h4>
                                    <p>Add some songs to get started with this emotion category.</p>
                                </div>
                            `;
                        }
                    }, 300);
                    
                } catch (error) {
                    console.error('Error:', error);
                    showNotification('error', 'Error!', 'Failed to delete song. Please try again.');
                    button.innerHTML = '<i class="fas fa-trash"></i> Delete';
                    button.disabled = false;
                }
            }, 1000);
        }
    }
});

// Search functionality
document.getElementById('searchSongs').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const songItems = document.querySelectorAll('.song-item');
    
    songItems.forEach(item => {
        const title = item.querySelector('.song-title').textContent.toLowerCase();
        const artist = item.querySelector('.song-artist').textContent.toLowerCase();
        const emotion = item.closest('.emotion-section').dataset.emotion.toLowerCase();
        
        const matches = title.includes(searchTerm) || 
                        artist.includes(searchTerm) || 
                        emotion.includes(searchTerm);
        
        item.style.display = matches ? 'flex' : 'none';
    });
    
    // Show/hide emotion sections based on visible songs
    document.querySelectorAll('.emotion-section').forEach(section => {
        const visibleSongs = section.querySelectorAll('.song-item[style="display: flex"], .song-item:not([style*="display: none"])');
        const hasVisibleSongs = Array.from(visibleSongs).some(song => 
            !song.style.display || song.style.display === 'flex'
        );
        section.style.display = hasVisibleSongs ? 'block' : 'none';
    });
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (window.innerWidth <= 992 && 
        !sidebar.contains(e.target) && 
        !menuBtn.contains(e.target) && 
        sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
});

// Smooth scroll for song items
document.querySelectorAll('.song-item').forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Initialize: Expand first emotion section by default
document.addEventListener('DOMContentLoaded', function() {
    const firstSection = document.querySelector('.emotion-section');
    if (firstSection) {
        firstSection.classList.remove('collapsed');
    }
    
    // Add some entrance animations
    const cards = document.querySelectorAll('.stat-card, .add-song-card, .songs-container');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
});