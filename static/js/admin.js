// Enhanced Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.initializeComponents();
        this.bindEvents();
        this.startRealTimeUpdates();
    }

    initializeComponents() {
        this.updateDateTime();
        this.initializeCharts();
        this.loadAnalytics();
        this.setupAnimations();
    }

    bindEvents() {
        // Add song form
        const addSongForm = document.getElementById('add-song-form');
        if (addSongForm) {
            addSongForm.addEventListener('submit', this.handleAddSong.bind(this));
        }

        // Delete song buttons
        this.bindDeleteButtons();

        // Chart period selectors
        const emotionPeriod = document.getElementById('emotion-period');
        const activityPeriod = document.getElementById('activity-period');
        
        if (emotionPeriod) {
            emotionPeriod.addEventListener('change', this.updateEmotionChart.bind(this));
        }
        
        if (activityPeriod) {
            activityPeriod.addEventListener('change', this.updateActivityChart.bind(this));
        }
    }

    updateDateTime() {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        
        const datetimeElement = document.getElementById('current-datetime');
        if (datetimeElement) {
            datetimeElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    startRealTimeUpdates() {
        // Update datetime every second
        setInterval(() => this.updateDateTime(), 1000);
        
        // Update active sessions every 30 seconds
        setInterval(() => this.updateActiveSessions(), 30000);
        
        // Update activity feed every 2 minutes
        setInterval(() => this.updateActivityFeed(), 120000);
        
        // Refresh charts every 5 minutes
        setInterval(() => {
            this.updateEmotionChart();
            this.updateActivityChart();
        }, 300000);
    }

    updateActiveSessions() {
        const sessions = Math.floor(Math.random() * 50) + 10;
        const element = document.getElementById('active-sessions');
        if (element) {
            // Animate the number change
            this.animateCounter(element, parseInt(element.textContent) || 0, sessions);
        }
    }

    animateCounter(element, start, end) {
        const duration = 1000;
        const range = end - start;
        const startTime = performance.now();
        
        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + range * this.easeOutQuart(progress));
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
    }

    easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }

    initializeCharts() {
        this.initEmotionChart();
        this.initActivityChart();
    }

    initEmotionChart() {
        const ctx = document.getElementById('emotionChart');
        if (!ctx) return;

        this.emotionChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Happy', 'Sad', 'Excited', 'Stressed', 'Neutral', 'Angry', 'Lonely'],
                datasets: [{
                    data: [30, 20, 15, 12, 10, 8, 5],
                    backgroundColor: [
                        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
                        '#FFEAA7', '#DDA0DD', '#98D8C8'
                    ],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(44, 62, 80, 0.9)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#4ECDC4',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    initActivityChart() {
        const ctx = document.getElementById('activityChart');
        if (!ctx) return;

        this.activityChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Active Users',
                    data: [120, 135, 148, 162],
                    borderColor: '#4ECDC4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#4ECDC4',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }, {
                    label: 'Emotion Detections',
                    data: [300, 425, 520, 680],
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#FF6B6B',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(44, 62, 80, 0.9)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#4ECDC4',
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#7f8c8d'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#7f8c8d'
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    updateEmotionChart() {
        if (!this.emotionChart) return;

        // Simulate new data based on selected period
        const period = document.getElementById('emotion-period')?.value || '30';
        const newData = this.generateEmotionData(period);
        
        this.emotionChart.data.datasets[0].data = newData;
        this.emotionChart.update('active');
    }

    updateActivityChart() {
        if (!this.activityChart) return;

        // Simulate new data based on selected period
        const period = document.getElementById('activity-period')?.value || '30';
        const { labels, userData, detectionData } = this.generateActivityData(period);
        
        this.activityChart.data.labels = labels;
        this.activityChart.data.datasets[0].data = userData;
        this.activityChart.data.datasets[1].data = detectionData;
        this.activityChart.update('active');
    }

    generateEmotionData(period) {
        // Generate realistic emotion distribution data
        const baseData = [30, 20, 15, 12, 10, 8, 5];
        return baseData.map(value => {
            const variation = (Math.random() - 0.5) * 10;
            return Math.max(1, Math.round(value + variation));
        });
    }

    generateActivityData(period) {
        const days = parseInt(period);
        const labels = [];
        const userData = [];
        const detectionData = [];
        
        for (let i = days; i > 0; i--) {
            if (days <= 7) {
                labels.push(`Day ${days - i + 1}`);
                userData.push(Math.floor(Math.random() * 50) + 20);
                detectionData.push(Math.floor(Math.random() * 100) + 50);
            } else {
                const weekNum = Math.ceil((days - i + 1) / 7);
                labels.push(`Week ${weekNum}`);
                userData.push(Math.floor(Math.random() * 80) + 100);
                detectionData.push(Math.floor(Math.random() * 200) + 300);
            }
        }
        
        return { labels: labels.slice(-8), userData: userData.slice(-8), detectionData: detectionData.slice(-8) };
    }

    setupAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'slideInUp 0.6s ease-out forwards';
                    
                    // Add staggered animation for stat cards
                    if (entry.target.classList.contains('stat-card')) {
                        const delay = Array.from(entry.target.parentNode.children).indexOf(entry.target) * 100;
                        entry.target.style.animationDelay = `${delay}ms`;
                    }
                }
            });
        }, observerOptions);
        
        // Observe elements for animation
        document.querySelectorAll('.stat-card, .chart-container, .analytics-card').forEach(el => {
            observer.observe(el);
        });

        // Add hover effects to navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.transform = 'translateX(5px)';
            });
            
            link.addEventListener('mouseleave', function() {
                if (!this.classList.contains('active')) {
                    this.style.transform = 'translateX(0)';
                }
            });
        });
    }

    handleAddSong(e) {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('title').value,
            artist: document.getElementById('artist').value,
            url: document.getElementById('url').value,
            emotion: document.getElementById('emotion').value,
            language: document.getElementById('language').value
        };
        
        // Add loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Adding...';
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
                this.showNotification('Song added successfully!', 'success');
                e.target.reset();
                setTimeout(() => window.location.reload(), 1500);
            } else {
                this.showNotification('Error adding song: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.showNotification('An error occurred while adding the song', 'error');
        })
        .finally(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    }

    bindDeleteButtons() {
        const deleteButtons = document.querySelectorAll('.delete-song');
        deleteButtons.forEach(button => {
            button.addEventListener('click', this.handleDeleteSong.bind(this));
        });
    }

    handleDeleteSong(e) {
        const button = e.target;
        const songId = button.getAttribute('data-song-id');
        const songItem = button.closest('.song-item');
        const songTitle = songItem.querySelector('h4').textContent;
        
        if (confirm(`Are you sure you want to delete "${songTitle}"?`)) {
            // Add loading state
            button.textContent = 'Deleting...';
            button.disabled = true;
            
            fetch(`/admin/delete_song/${songId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Animate removal
                    songItem.style.transition = 'all 0.3s ease';
                    songItem.style.transform = 'translateX(100%)';
                    songItem.style.opacity = '0';
                    
                    setTimeout(() => {
                        songItem.remove();
                        this.showNotification('Song deleted successfully!', 'success');
                    }, 300);
                } else {
                    this.showNotification('Error deleting song: ' + data.error, 'error');
                    button.textContent = 'Delete';
                    button.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                this.showNotification('An error occurred while deleting the song', 'error');
                button.textContent = 'Delete';
                button.disabled = false;
            });
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 300px;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
    }

    updateActivityFeed() {
        // Simulate new activity
        const activities = [
            { icon: 'fa-user-plus', text: 'New user registered', time: 'Just now', type: 'user' },
            { icon: 'fa-smile', text: 'Happy emotion detected', time: '2 minutes ago', type: 'emotion' },
            { icon: 'fa-music', text: 'New song added to database', time: '5 minutes ago', type: 'song' },
            { icon: 'fa-meh', text: 'Sad emotion detected', time: '8 minutes ago', type: 'emotion' }
        ];
        
        const activityFeed = document.querySelector('.activity-feed');
        if (activityFeed) {
            // Add new activity to the top
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            const newActivity = this.createActivityItem(randomActivity);
            
            activityFeed.insertBefore(newActivity, activityFeed.firstChild);
            
            // Remove oldest if more than 10 activities
            const activityItems = activityFeed.querySelectorAll('.activity-item');
            if (activityItems.length > 10) {
                activityItems[activityItems.length - 1].remove();
            }
        }
    }

    createActivityItem(activity) {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.style.opacity = '0';
        item.style.transform = 'translateY(-20px)';
        
        item.innerHTML = `
            <div class="activity-icon ${activity.type}-icon">
                <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <span class="activity-text">${activity.text}</span>
                <span class="activity-time">${activity.time}</span>
            </div>
        `;
        
        // Animate in
        setTimeout(() => {
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, 100);
        
        return item;
    }

    loadAnalytics() {
        // Simulate loading analytics data
        this.updateActiveSessions();
        
        // Animate progress bars
        setTimeout(() => {
            document.querySelectorAll('.progress').forEach(progress => {
                const width = progress.style.width;
                progress.style.width = '0%';
                setTimeout(() => {
                    progress.style.transition = 'width 1s ease';
                    progress.style.width = width;
                }, 500);
            });
        }, 1000);
    }
}

// Add notification animations CSS
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        margin-left: 15px;
    }
`;
document.head.appendChild(notificationStyles);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new AdminDashboard();
});