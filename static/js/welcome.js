document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add pulse animation to the start button
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.classList.add('pulse-animation');
    }
    
    // Add hover animations to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // User dropdown functionality
    const userInfo = document.getElementById('userInfo');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userInfo && userDropdown) {
        userInfo.addEventListener('click', function(e) {
            userDropdown.classList.toggle('show');
            e.stopPropagation();
        });

        window.addEventListener('click', function() {
            if (userDropdown.classList.contains('show')) {
                userDropdown.classList.remove('show');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = this.getAttribute('href');
        });
    }

    // Webcam functionality for detect section
    const startCameraBtn = document.getElementById('startCamera');
    const captureImageBtn = document.getElementById('captureImage');
    const videoElement = document.getElementById('video');
    const cameraPlaceholder = document.querySelector('.camera-placeholder');
    const detectedEmotion = document.getElementById('detectedEmotion');
    const emotionText = document.getElementById('emotionText');
    const getRecommendationsBtn = document.getElementById('getRecommendations');

    let stream = null;

    if (startCameraBtn && videoElement) {
        startCameraBtn.addEventListener('click', async function() {
            try {
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }

                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    },
                    audio: false
                });
                
                videoElement.srcObject = stream;
                videoElement.style.display = 'block';
                
                if (cameraPlaceholder) {
                    cameraPlaceholder.style.display = 'none';
                }
                
                startCameraBtn.disabled = true;
                captureImageBtn.disabled = false;
                
                videoElement.addEventListener('error', (e) => {
                    console.error('Video error:', e);
                    alert('Camera error occurred. Please try again.');
                });
                
            } catch (err) {
                console.error('Error accessing camera:', err);
                alert('Could not access the camera. Please make sure permissions are granted and camera is connected.');
            }
        });
    }

    if (captureImageBtn && videoElement) {
        captureImageBtn.addEventListener('click', async function() {
            if (!stream) {
                alert('Please start the camera first');
                return;
            }

            try {
                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                
                let imageData;
                try {
                    imageData = canvas.toDataURL('image/jpeg', 0.8);
                } catch (e) {
                    console.error('Error converting image:', e);
                    throw new Error('Failed to capture image');
                }

                captureImageBtn.disabled = true;
                captureImageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

                const response = await fetch('/process_emotion', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ image: imageData }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }
                
                if (detectedEmotion) {
                    detectedEmotion.style.display = 'block';
                    emotionText.textContent = data.dominant_emotion;
                    emotionText.className = '';
                    emotionText.classList.add(`emotion-text-${data.dominant_emotion.toLowerCase()}`);
                    
                    sessionStorage.setItem('capturedImage', imageData);
                    sessionStorage.setItem('detectedEmotion', data.dominant_emotion);
                    
                    const songs = await getEmotionSongs(data.dominant_emotion);
                    sessionStorage.setItem('recommendations', JSON.stringify(songs));
                    
                    if (getRecommendationsBtn) {
                        getRecommendationsBtn.style.display = 'inline-flex';
                        getRecommendationsBtn.href = `/recommendations?emotion=${encodeURIComponent(data.dominant_emotion)}`;
                    }
                }
            } catch (error) {
                console.error('Error processing image:', error);
                alert('Error processing image: ' + error.message);
            } finally {
                captureImageBtn.disabled = false;
                captureImageBtn.innerHTML = '<i class="fas fa-camera-retro"></i> Capture Image';
            }
        });
    }

    window.addEventListener('beforeunload', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });

    // Upload image functionality
    const imageUpload = document.getElementById('imageUpload');
    const uploadArea = document.getElementById('uploadArea');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const detectEmotionBtn = document.getElementById('detectEmotionBtn');
    const uploadEmotionPlaceholder = document.getElementById('uploadEmotionPlaceholder');
    const uploadDetectedEmotion = document.getElementById('uploadDetectedEmotion');
    const uploadEmotionText = document.getElementById('uploadEmotionText');
    const uploadGetRecommendationsBtn = document.getElementById('uploadGetRecommendations');

    // Store data in memory instead of sessionStorage
    let uploadData = {
        capturedImage: null,
        detectedEmotion: null,
        recommendations: null
    };

    imageUpload.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            // Enhanced file validation
            if (!file.type.match('image.*')) {
                showError('Please select a valid image file (JPEG, PNG, GIF, etc.)');
                return;
            }
            
            // Check file size (limit to 10MB)
            if (file.size > 10 * 1024 * 1024) {
                showError('Image file is too large. Please select an image smaller than 10MB.');
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    imagePreview.src = e.target.result;
                    uploadArea.style.display = 'none';
                    previewContainer.style.display = 'block';
                    detectEmotionBtn.style.display = 'inline-flex';
                    uploadEmotionPlaceholder.style.display = 'block';
                    uploadDetectedEmotion.style.display = 'none';
                    
                    // Reset any previous error states
                    resetErrorState();
                } catch (error) {
                    showError('Error loading image preview. Please try another image.');
                }
            };
            
            reader.onerror = function() {
                showError('Error reading file. Please try another image.');
            };
            
            reader.readAsDataURL(file);
        }
    });

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        uploadArea.classList.add('highlight');
    }

    function unhighlight() {
        uploadArea.classList.remove('highlight');
    }

    uploadArea.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            // Validate dropped file
            const file = files[0];
            if (!file.type.match('image.*')) {
                showError('Please drop a valid image file (JPEG, PNG, GIF, etc.)');
                return;
            }
            
            imageUpload.files = files;
            const event = new Event('change');
            imageUpload.dispatchEvent(event);
        }
    });

    detectEmotionBtn.addEventListener('click', async function() {
        if (!imagePreview.src || imagePreview.src === '#') {
            showError('Please upload an image first');
            return;
        }

        try {
            // Update button state
            detectEmotionBtn.disabled = true;
            detectEmotionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            uploadEmotionPlaceholder.style.display = 'none';
            uploadDetectedEmotion.style.display = 'none';
            
            // Prepare the request payload
            const requestPayload = {
                image: imagePreview.src
            };
            
            console.log('Sending emotion detection request...');
            
            const response = await fetch('/process_emotion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                let errorMessage = `Server error (${response.status})`;
                
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // If we can't parse JSON, use the status-based message
                    switch (response.status) {
                        case 400:
                            errorMessage = 'Invalid image data. Please try a different image.';
                            break;
                        case 413:
                            errorMessage = 'Image file is too large. Please use a smaller image.';
                            break;
                        case 500:
                            errorMessage = 'Server processing error. Please try again.';
                            break;
                        case 502:
                            errorMessage = 'Server temporarily unavailable. Please try again in a moment.';
                            break;
                        case 503:
                            errorMessage = 'Service temporarily unavailable. Please try again later.';
                            break;
                        default:
                            errorMessage = 'Network error. Please check your connection and try again.';
                    }
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Response data:', data);

            if (data.error) {
                throw new Error(data.error);
            }
            
            if (!data.dominant_emotion) {
                throw new Error('No emotion detected. Please try with a clearer image showing your face.');
            }
            
            // Store data in memory
            uploadData.capturedImage = imagePreview.src;
            uploadData.detectedEmotion = data.dominant_emotion;
            uploadData.recommendations = data.recommendations || [];
            
            // Update UI with results
            uploadEmotionText.textContent = data.dominant_emotion;
            uploadEmotionText.className = '';
            uploadEmotionText.classList.add(`emotion-${data.dominant_emotion.toLowerCase()}`);
            uploadDetectedEmotion.style.display = 'block';
            
            // Update recommendations button
            uploadGetRecommendationsBtn.href = `/recommendations?emotion=${encodeURIComponent(data.dominant_emotion)}`;
            
            console.log('Emotion detection successful:', data.dominant_emotion);
            
        } catch (error) {
            console.error('Error processing image:', error);
            showError(error.message || 'Error processing image. Please try again.');
        } finally {
            // Reset button state
            detectEmotionBtn.disabled = false;
            detectEmotionBtn.innerHTML = '<i class="fas fa-search"></i> Detect Emotion';
        }
    });

    // Helper function to show errors
    function showError(message) {
        uploadEmotionPlaceholder.innerHTML = `
            <i class="fas fa-exclamation-circle" style="color: #ff4757; font-size: 2rem; margin-bottom: 1rem;"></i>
            <p style="color: #ff4757; font-weight: 500;">${message}</p>
            <button onclick="resetUpload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ff4757; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Try Again
            </button>
        `;
        uploadEmotionPlaceholder.style.display = 'block';
        uploadDetectedEmotion.style.display = 'none';
    }

    // Helper function to reset error state
    function resetErrorState() {
        uploadEmotionPlaceholder.innerHTML = `
            <i class="fas fa-dizzy"></i>
            <p>Your detected emotion will appear here</p>
        `;
    }

    // Function to reset the entire upload process
    function resetUpload() {
        // Reset UI elements
        uploadArea.style.display = 'block';
        previewContainer.style.display = 'none';
        detectEmotionBtn.style.display = 'none';
        uploadDetectedEmotion.style.display = 'none';
        
        // Reset form
        imageUpload.value = '';
        imagePreview.src = '#';
        
        // Reset stored data
        uploadData = {
            capturedImage: null,
            detectedEmotion: null,
            recommendations: null
        };
        
        // Reset error state
        resetErrorState();
        uploadEmotionPlaceholder.style.display = 'block';
    }

    // Function to get emotion songs (for backward compatibility)
    async function getEmotionSongs(emotion) {
        try {
            const response = await fetch(`/get_songs/${emotion}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching songs:', error);
            return [];
        }
    }

    // Function to get stored upload data (replaces sessionStorage)
    function getUploadData() {
        return uploadData;
    }

    // Select emotion functionality
    const emotionItems = document.querySelectorAll('.emotion-item');
    const selectedEmotionSongs = document.getElementById('selectedEmotionSongs');
    const selectedEmotionText = document.getElementById('selectedEmotionText');
    const songsList = document.getElementById('songsList');
    const moreEmotionsGrid = document.querySelector('.more-emotions-grid');
    const moreEmotionsTitle = document.getElementById('more-emotions-title');

    if (emotionItems.length > 0) {
        emotionItems.forEach(item => {
            item.addEventListener('click', async function() {
                const emotion = this.getAttribute('data-emotion');
                
                // Handle "Select More" option
                if (emotion === 'More') {
                    const isGridVisible = moreEmotionsGrid.style.display === 'grid';
                    moreEmotionsGrid.style.display = isGridVisible ? 'none' : 'grid';
                    moreEmotionsTitle.style.display = isGridVisible ? 'none' : 'block';
                    return;
                }
                
                // Highlight the selected emotion
                emotionItems.forEach(el => el.classList.remove('selected'));
                this.classList.add('selected');
                
                // Store the selected emotion data for recommendations page
                sessionStorage.setItem('detectedEmotion', emotion);
                
                // Get songs for the selected emotion from database
                const songs = await getEmotionSongs(emotion);
                sessionStorage.setItem('recommendations', JSON.stringify(songs));
                
                // Show the songs section
                if (selectedEmotionSongs) {
                    selectedEmotionSongs.style.display = 'block';
                    selectedEmotionText.textContent = emotion;
                    
                    // Clear previous songs
                    songsList.innerHTML = '';
                    
                    // Add songs for the selected emotion
                    songs.forEach(song => {
                        const songCard = document.createElement('div');
                        songCard.className = 'song-card';
                        
                        songCard.innerHTML = `
                            <div class="song-info">
                                <h3 class="song-title">${song.title}</h3>
                                <p class="song-artist">${song.artist}</p>
                            </div>
                            <div class="song-player">
                                ${getEmbeddedPlayer(song.url)}
                            </div>
                        `;
                        
                        // Save song selection to user history
                        songCard.addEventListener('click', function() {
                            fetch('/save_song_selection', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    emotion: emotion,
                                    song_id: song.url
                                }),
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    console.log('Song selection saved successfully');
                                }
                            })
                            .catch(error => {
                                console.error('Error saving song selection:', error);
                            });
                        });
                        
                        songsList.appendChild(songCard);
                    });
                    
                    // Scroll to the songs section
                    selectedEmotionSongs.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Check if there's an emotion parameter in the URL
    function checkUrlForEmotion() {
        const urlParams = new URLSearchParams(window.location.search);
        const emotion = urlParams.get('emotion');
        
        if (emotion) {
            const emotionItem = document.querySelector(`.emotion-item[data-emotion="${emotion}"]`);
            if (emotionItem) {
                emotionItem.click();
            } else if (['Pregnant', 'Depression', 'Trouble Sleeping', 'Travelling', 'Stressed', 'Lonely', 'Excited'].includes(emotion)) {
                // Show more emotions grid and title, then select the special emotion
                moreEmotionsGrid.style.display = 'grid';
                moreEmotionsTitle.style.display = 'block';
                const specialEmotionItem = document.querySelector(`.emotion-item[data-emotion="${emotion}"]`);
                if (specialEmotionItem) {
                    specialEmotionItem.click();
                }
            }
        }
    }
    
    checkUrlForEmotion();

    // Add responsive navigation for mobile
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('show-mobile');
        });
    }

    // Add scroll effect to header
    const header = document.querySelector('.main-header');
    
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // Add animation to sections when they come into view
    const sections = document.querySelectorAll('.section');
    
    function checkSections() {
        const triggerBottom = window.innerHeight * 0.8;
        
        sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top;
            
            if (sectionTop < triggerBottom) {
                section.classList.add('appear');
            }
        });
    }
    
    window.addEventListener('scroll', checkSections);
    checkSections();
    
    function getEmbeddedPlayer(url) {
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
            let videoId;
            if (url.includes("youtube.com")) {
                if (url.includes("watch?v=")) {
                    videoId = url.split("watch?v=")[1].split("&")[0];
                } else {
                    videoId = url.split("/").pop();
                }
            } else if (url.includes("youtu.be")) {
                videoId = url.split("/").pop();
            }
            
            return `<iframe width="100%" height="215" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else if (url.includes("spotify.com")) {
            if (url.includes("track/")) {
                const trackId = url.split("track/")[1];
                return `<iframe src="https://open.spotify.com/embed/track/${trackId}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
            }
        }
        
        return `<a href="${url}" target="_blank" class="song-link">Open in new tab</a>`;
    }
});