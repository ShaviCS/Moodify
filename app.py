from flask import Flask, render_template, Response, redirect, url_for, jsonify, request, session, flash
import cv2
import numpy as np
import tensorflow as tf
import base64
from PIL import Image
import io
import os
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2
import psycopg2.extras
import uuid
from functools import wraps
from urllib.parse import urlparse
import time
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24))  # Secret key for sessions
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 1800  # 30 minutes

app.config['MAIL_SERVER'] = 'smtp.gmail.com'  # or your email provider's SMTP server
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')  # Your email
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')  # Your email password or app password
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_USERNAME')

mail = Mail(app)

# Create a serializer for generating secure tokens
serializer = URLSafeTimedSerializer(app.secret_key)


# Database setup with PostgreSQL
def get_db_connection():
    """Connect to the PostgreSQL database server"""
    # Get database URL from environment variable (Render provides this)
    database_url = os.environ.get('DATABASE_URL', 'postgresql://moodify_kpky_user:w9XtD21cCd3yNtpfPxjWSWupyByiozar@dpg-d0nier6uk2gs73c14f8g-a.oregon-postgres.render.com/moodify_kpky')
    
    # Parse the URL to get connection parameters
    parsed_url = urlparse(database_url)
    
    # Connect to the PostgreSQL server
    conn = psycopg2.connect(
        host=parsed_url.hostname,
        database=parsed_url.path[1:],
        user=parsed_url.username,
        password=parsed_url.password,
        port=parsed_url.port
    )
    
    # Create cursor with dictionary-like results
    conn.cursor_factory = psycopg2.extras.DictCursor
    
    return conn

# In the init_db() function, add these new tables:
def init_db():
    """Initialize the database tables if they don't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table (existing)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create user_history table (existing)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        emotion TEXT NOT NULL,
        song_id TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create songs table (new)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        url TEXT NOT NULL,
        emotion TEXT NOT NULL,
        language TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Add password reset tokens table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.commit()
    cursor.close()
    conn.close()

# Check your database connection code
try:
    get_db_connection()  # or whatever connection method you're using
except Exception as e:
    print(f"Database connection error: {e}")  # Add proper logging

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Load the emotion detection model
model = None

def load_model():
    global model
    try:
        # Check if model file exists
        model_path = 'emotion_detection_model.h5'
        if not os.path.exists(model_path):
            print(f"Model file not found at {model_path}")
            return False
            
        # Load the model with error handling
        model = tf.keras.models.load_model(model_path)
        print("Emotion detection model loaded successfully!")
        
        # Test the model with a dummy input
        dummy_input = np.zeros((1, 48, 48, 1))
        test_prediction = model.predict(dummy_input, verbose=0)
        print(f"Model test successful - output shape: {test_prediction.shape}")
        
        return True
        
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        model = None
        return False

# Helper function to send email
def send_reset_email(user_email, reset_token):
    """Send password reset email to user"""
    try:
        # Create reset URL
        reset_url = url_for('reset_password', token=reset_token, _external=True)
        
        # Email content
        subject = "Password Reset Request - Moodify"
        body = f"""
        Hello,

        You requested to reset your password for your Moodify account.

        Please click the link below to reset your password:
        {reset_url}

        This link will expire in 1 hour.

        If you didn't request this password reset, please ignore this email.

        Best regards,
        The Moodify Team
        """

        # Create message
        msg = MIMEMultipart()
        msg['From'] = app.config['MAIL_USERNAME']
        msg['To'] = user_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # Send email
        server = smtplib.SMTP(app.config['MAIL_SERVER'], app.config['MAIL_PORT'])
        server.starttls()
        server.login(app.config['MAIL_USERNAME'], app.config['MAIL_PASSWORD'])
        server.send_message(msg)
        server.quit()
        
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False

# Route for forgot password page
@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if 'user_id' in session:
        return redirect(url_for('welcome'))
    
    if request.method == 'POST':
        email = request.form['email']
        
        if not email:
            flash('Please enter your email address')
            return render_template('forgot_password.html')
        
        # Check if user exists
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cursor.fetchone()
        
        if user:
            # Generate reset token
            reset_token = serializer.dumps(email, salt='password-reset-salt')
            token_id = str(uuid.uuid4())
            expires_at = datetime.now() + timedelta(hours=1)
            
            # Store token in database
            cursor.execute('''
                INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
                VALUES (%s, %s, %s, %s)
            ''', (token_id, user['id'], reset_token, expires_at))
            conn.commit()
            
            # Send reset email
            if send_reset_email(email, reset_token):
                flash('Password reset link has been sent to your email')
            else:
                flash('Error sending email. Please try again later')
        else:
            # Don't reveal if email exists or not for security
            flash('If an account with this email exists, a password reset link has been sent')
        
        cursor.close()
        conn.close()
        
        return render_template('forgot_password.html')
    
    return render_template('forgot_password.html')

# Route for password reset page
@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    if 'user_id' in session:
        return redirect(url_for('welcome'))
    
    try:
        # Verify token (expires in 1 hour)
        email = serializer.loads(token, salt='password-reset-salt', max_age=3600)
    except:
        flash('Invalid or expired reset link')
        return redirect(url_for('forgot_password'))
    
    # Check if token exists and is not used
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT prt.*, u.email FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = %s AND prt.used = FALSE AND prt.expires_at > %s
    ''', (token, datetime.now()))
    
    token_record = cursor.fetchone()
    
    if not token_record:
        cursor.close()
        conn.close()
        flash('Invalid or expired reset link')
        return redirect(url_for('forgot_password'))
    
    if request.method == 'POST':
        new_password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        if not new_password or not confirm_password:
            flash('Please fill in all fields')
            return render_template('reset_password.html', token=token)
        
        if new_password != confirm_password:
            flash('Passwords do not match')
            return render_template('reset_password.html', token=token)
        
        if len(new_password) < 6:
            flash('Password must be at least 6 characters long')
            return render_template('reset_password.html', token=token)
        
        # Update user password
        hashed_password = generate_password_hash(new_password)
        
        cursor.execute('''
            UPDATE users SET password = %s WHERE email = %s
        ''', (hashed_password, email))
        
        # Mark token as used
        cursor.execute('''
            UPDATE password_reset_tokens SET used = TRUE WHERE token = %s
        ''', (token,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        flash('Password has been reset successfully. You can now login with your new password.')
        return redirect(url_for('login'))
    
    cursor.close()
    conn.close()
    
    return render_template('reset_password.html', token=token)

# Function for get relevant songs from the database
def get_songs_for_emotion(emotion):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM songs WHERE emotion = %s LIMIT 20', (emotion,))
        songs = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Convert to the format expected by the frontend
        return [{
            'id': song['id'],
            'title': song['title'],
            'artist': song['artist'],
            'url': song['url'],
            'language': song['language']
        } for song in songs]
        
    except Exception as e:
        print(f"Error fetching songs for emotion {emotion}: {str(e)}")
        return []

# Helper function to convert YouTube URLs to embedded format
def get_embedded_player(url):
    if "youtube.com" in url or "youtu.be" in url:
        # Extract YouTube video ID
        if "youtube.com" in url:
            if "watch?v=" in url:
                video_id = url.split("watch?v=")[1].split("&")[0]
            else:
                video_id = url.split("/")[-1]
        elif "youtu.be" in url:
            video_id = url.split("/")[-1]
        
        # Return YouTube embedded player HTML
        return f'<iframe width="100%" height="315" src="https://www.youtube.com/embed/{video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
    
    elif "spotify.com" in url:
        # Extract Spotify track ID
        if "track/" in url:
            track_id = url.split("track/")[1]
            # Return Spotify embedded player HTML
            return f'<iframe src="https://open.spotify.com/embed/track/{track_id}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>'
    
    # Return a link if we can't embed
    return f'<a href="{url}" target="_blank">Open in new tab</a>'

# Function to detect emotion in an image
def detect_emotion(image):
    try:
        if model is None:
            load_model()
            if model is None:
                raise Exception("Model failed to load")

        # Convert image to OpenCV format if needed
        if isinstance(image, str):  # Base64 string
            try:
                image_data = base64.b64decode(image.split(',')[1])
                image = Image.open(io.BytesIO(image_data))
            except Exception as e:
                raise Exception(f"Failed to decode base64 image: {str(e)}")
            
        if isinstance(image, Image.Image):
            try:
                opencv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            except Exception as e:
                raise Exception(f"Failed to convert image format: {str(e)}")
        else:
            opencv_img = image

        display_img = opencv_img.copy()
        
        # Convert to grayscale for face detection
        try:
            gray = cv2.cvtColor(opencv_img, cv2.COLOR_BGR2GRAY)
        except Exception as e:
            raise Exception(f"Failed to convert image to grayscale: {str(e)}")
        
        # Load face cascade
        try:
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            if face_cascade.empty():
                raise Exception("Failed to load face cascade classifier")
        except Exception as e:
            raise Exception(f"Face cascade loading error: {str(e)}")

        # Detect faces
        try:
            faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(30, 30))
        except Exception as e:
            raise Exception(f"Face detection failed: {str(e)}")

        if len(faces) == 0:
            return display_img, [], "No faces detected"

        results = []
        try:
            for (x, y, w, h) in faces:
                # Extract face region
                face_roi = gray[y:y+h, x:x+w]
                
                # Resize to model input size
                face_roi = cv2.resize(face_roi, (48, 48))
                face_roi = face_roi.astype("float") / 255.0
                face_roi = np.expand_dims(face_roi, axis=0)
                face_roi = np.expand_dims(face_roi, axis=-1)

                # Predict emotion
                prediction = model.predict(face_roi, verbose=0)
                emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']
                emotion_idx = np.argmax(prediction)
                emotion = emotion_labels[emotion_idx]
                probability = float(np.max(prediction))

                # Validate prediction confidence
                if probability < 0.3:  # Low confidence threshold
                    print(f"Low confidence prediction: {emotion} ({probability:.2f})")

                # Draw on image
                emotion_colors = {
                    "Angry": (0, 0, 255),
                    "Disgust": (0, 128, 128),
                    "Fear": (128, 0, 128),
                    "Happy": (0, 255, 255),
                    "Neutral": (128, 128, 128),
                    "Sad": (255, 0, 0),
                    "Surprise": (0, 165, 255)
                }
                color = emotion_colors.get(emotion, (0, 255, 0))
                
                # Draw rectangle and text
                cv2.rectangle(display_img, (x, y), (x+w, y+h), color, 2)
                cv2.putText(display_img, f"{emotion}: {probability:.2f}", 
                            (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, 
                            color, 2)

                results.append({
                    'emotion': emotion,
                    'probability': probability,
                    'position': (x, y, w, h)
                })

        except Exception as e:
            raise Exception(f"Emotion prediction failed: {str(e)}")

        # Get dominant emotion
        if results:
            dominant_emotion = max(results, key=lambda x: x['probability'])['emotion']
        else:
            dominant_emotion = "No emotion detected"
            
        return display_img, results, dominant_emotion

    except Exception as e:
        print(f"Error in detect_emotion: {str(e)}")
        return None, [], str(e)

# For webcam streaming in real-time
def generate_frames():
    # Initialize the webcam
    camera = cv2.VideoCapture(0)
    
    # Check if the model is loaded
    if model is None:
        load_model()
    
    while True:
        success, frame = camera.read()
        if not success:
            break
        
        # Process the frame for emotion detection
        result_frame, predictions, dominant_emotion = detect_emotion(frame)
        
        # Add text for dominant emotion
        if dominant_emotion:
            cv2.putText(result_frame, f"Dominant Emotion: {dominant_emotion}", 
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, 
                        (0, 255, 0), 2)
        
        # Convert to JPEG for streaming
        ret, buffer = cv2.imencode('.jpg', result_frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
    camera.release()

# For processing a single frame and returning the emotion
def process_frame(frame_data):
    if model is None:
        load_model()
    
    # Decode the base64 image
    image_data = base64.b64decode(frame_data.split(',')[1])
    image = Image.open(io.BytesIO(image_data))
    
    # Convert to OpenCV format
    opencv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    
    # Detect emotion
    _, predictions, dominant_emotion = detect_emotion(opencv_img)
    
    if not dominant_emotion:
        return {"error": "No face detected"}
    
    # Return the dominant emotion and song recommendations
    return {
        "dominant_emotion": dominant_emotion,
        "recommendations": emotion_songs.get(dominant_emotion, [])
    }

# Enhanced history saving with error handling
def save_user_history(user_id, emotion, song_id=None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        history_id = str(uuid.uuid4())
        
        cursor.execute('INSERT INTO user_history (id, user_id, emotion, song_id) VALUES (%s, %s, %s, %s)',
                     (history_id, user_id, emotion, song_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error saving user history: {str(e)}")
        return False

# Authentication Routes
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('welcome'))
    return redirect(url_for('login'))

# Admin Routes
@app.route('/admin')
@login_required
def admin_dashboard():
    # Check if user is admin
    if not session.get('is_admin', False):
        flash('You do not have permission to access this page')
        return redirect(url_for('welcome'))
    
    return render_template('admin/dashboard.html')

@app.route('/admin/songs')
@login_required
def admin_songs():
    # Check if user is admin
    if not session.get('is_admin', False):
        flash('You do not have permission to access this page')
        return redirect(url_for('welcome'))
    
    # Get all songs grouped by emotion
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT DISTINCT emotion FROM songs ORDER BY emotion')
    emotions = [row['emotion'] for row in cursor.fetchall()]
    
    songs_by_emotion = {}
    for emotion in emotions:
        cursor.execute('SELECT * FROM songs WHERE emotion = %s ORDER BY title', (emotion,))
        songs_by_emotion[emotion] = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return render_template('admin/songs.html', songs_by_emotion=songs_by_emotion)

@app.route('/admin/add_song', methods=['POST'])
@login_required
def admin_add_song():
    if not session.get('is_admin', False):
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    data = request.json
    title = data.get('title')
    artist = data.get('artist')
    url = data.get('url')
    emotion = data.get('emotion')
    language = data.get('language')
    
    if not all([title, artist, url, emotion, language]):
        return jsonify({"success": False, "error": "All fields are required"}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        song_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO songs (id, title, artist, url, emotion, language)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (song_id, title, artist, url, emotion, language))
        
        conn.commit()
        return jsonify({"success": True, "song_id": song_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/delete_song/<song_id>', methods=['DELETE'])
@login_required
def admin_delete_song(song_id):
    if not session.get('is_admin', False):
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM songs WHERE id = %s', (song_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        if session.get('is_admin', False):
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('welcome'))
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if the user exists (by username or email)
        cursor.execute('SELECT * FROM users WHERE username = %s OR email = %s', 
                      (username, username))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if user and check_password_hash(user['password'], password):
            # Set session variables
            session.clear()
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['name'] = user['name']
            session['is_admin'] = user['is_admin']
            
            # Redirect based on admin status
            if user['is_admin']:
                return redirect(url_for('admin_dashboard'))
            return redirect(url_for('welcome'))
        
        flash('Invalid username or password')
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if 'user_id' in session:
        return redirect(url_for('welcome'))
        
    if request.method == 'POST':
        name = request.form['name']
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        # Validate input
        if not all([name, username, email, password, confirm_password]):
            flash('All fields are required')
            return render_template('signup.html')
            
        if password != confirm_password:
            flash('Passwords do not match')
            return render_template('signup.html')
        
        # Check if username or email already exists
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE username = %s OR email = %s', 
                      (username, email))
        existing_user = cursor.fetchone()
        
        if existing_user:
            cursor.close()
            conn.close()
            flash('Username or email already exists')
            return render_template('signup.html')
        
        # Create new user (non-admin by default)
        user_id = str(uuid.uuid4())
        hashed_password = generate_password_hash(password)
        
        try:
            cursor.execute('''
                INSERT INTO users (id, name, username, email, password, is_admin)
                VALUES (%s, %s, %s, %s, %s, FALSE)
            ''', (user_id, name, username, email, hashed_password))
            conn.commit()
            
            # Log the user in
            session.clear()
            session['user_id'] = user_id
            session['username'] = username
            session['name'] = name
            session['is_admin'] = False
            
            cursor.close()
            conn.close()
            
            return redirect(url_for('welcome'))
            
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            flash(f'An error occurred during registration: {str(e)}')
            return render_template('signup.html')
    
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/profile')
def profile():
    # Temporary placeholder
    return "Profile page - under construction"

@app.route('/settings')
def settings():
    # Temporary placeholder
    return "Settings page - under construction"

# Application Routes
@app.route('/welcome')
@login_required
def welcome():
    return render_template('welcome.html', username=session.get('name', 'User'))

@app.route('/detect')
@login_required
def detect():
    return render_template('detect.html')

@app.route('/recommendations')
@login_required
def recommendations():
    return render_template('recommendations.html')

@app.route('/video_feed')
@login_required
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/process_emotion', methods=['POST'])
@login_required
def process_emotion():
    try:
        # Check if request has JSON data
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400
            
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400

        # Get the base64 image data
        image_data = data['image']
        
        # Validate image data format
        if not image_data or not isinstance(image_data, str):
            return jsonify({"error": "Invalid image data format"}), 400
        
        # Remove the data URL prefix if present
        if image_data.startswith('data:image'):
            try:
                image_data = image_data.split(',')[1]
            except IndexError:
                return jsonify({"error": "Invalid image data format"}), 400
        
        # Validate base64 data
        if not image_data:
            return jsonify({"error": "Empty image data"}), 400

        try:
            # Decode the base64 image with size limit check
            try:
                image_bytes = base64.b64decode(image_data)
            except Exception as e:
                return jsonify({"error": "Invalid base64 image data"}), 400
            
            # Check decoded image size (limit to 10MB)
            if len(image_bytes) > 10 * 1024 * 1024:
                return jsonify({"error": "Image file too large. Please use an image smaller than 10MB."}), 413
            
            # Open and validate image
            try:
                image = Image.open(io.BytesIO(image_bytes))
                # Verify it's a valid image
                image.verify()
                # Reopen the image since verify() closes it
                image = Image.open(io.BytesIO(image_bytes))
            except Exception as e:
                return jsonify({"error": "Invalid or corrupted image file"}), 400
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                try:
                    image = image.convert('RGB')
                except Exception as e:
                    return jsonify({"error": "Unable to process image format"}), 400
            
            # Check if model is loaded
            if model is None:
                try:
                    load_model()
                    if model is None:
                        return jsonify({"error": "Emotion detection model is not available. Please try again later."}), 503
                except Exception as e:
                    print(f"Model loading error: {str(e)}")
                    return jsonify({"error": "Failed to load emotion detection model"}), 503
            
            # Convert to OpenCV format
            try:
                opencv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            except Exception as e:
                return jsonify({"error": "Failed to process image"}), 500
            
            # Process the image for emotion detection
            try:
                display_img, predictions, dominant_emotion = detect_emotion(opencv_img)
            except Exception as e:
                print(f"Emotion detection error: {str(e)}")
                return jsonify({"error": "Failed to analyze emotions in the image"}), 500
            
            # Check if face was detected
            if not dominant_emotion or dominant_emotion == "No faces detected":
                return jsonify({"error": "No faces detected in the image. Please upload a clear photo showing your face."}), 400
            
            # Check for other error conditions
            if isinstance(dominant_emotion, str) and "error" in dominant_emotion.lower():
                return jsonify({"error": dominant_emotion}), 500

            # Save to history (with error handling)
            try:
                if 'user_id' in session:
                    save_user_history(session['user_id'], dominant_emotion)
            except Exception as e:
                # Log the error but don't fail the request
                print(f"Error saving to history: {str(e)}")
            
            # Get recommendations
            try:
                recommendations = get_songs_for_emotion(dominant_emotion)
            except Exception as e:
                print(f"Error getting recommendations: {str(e)}")
                recommendations = []
                
            return jsonify({
                "dominant_emotion": dominant_emotion,
                "recommendations": recommendations,
                "confidence": predictions[0]['probability'] if predictions else None
            })
            
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return jsonify({"error": "Failed to process the uploaded image. Please try with a different image."}), 500

    except Exception as e:
        print(f"Unexpected error in process_emotion: {str(e)}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500

# Add this new route for getting songs by emotion
@app.route('/get_songs/<emotion>')
@login_required
def get_songs(emotion):
    songs = get_songs_for_emotion(emotion)
    return jsonify(songs)

@app.route('/save_song_selection', methods=['POST'])
@login_required
def save_song_selection():
    data = request.json
    emotion = data.get('emotion')
    song_id = data.get('song_id')
    
    if 'user_id' in session:
        save_user_history(session['user_id'], emotion, song_id)
        return jsonify({"success": True})
    
    return jsonify({"success": False, "error": "User not logged in"})

@app.route('/user_history')
@login_required
def user_history():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT emotion, song_id, timestamp 
        FROM user_history 
        WHERE user_id = %s 
        ORDER BY timestamp DESC
    ''', (session['user_id'],))
    
    history = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return render_template('history.html', history=history)

if __name__ == '__main__':
    # Initialize the database on startup
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
    
    # Load emotion detection model
    load_model()
    
    # Get port from environment variable (for Render deployment)
    port = int(os.environ.get('PORT', 5000))
    
    # Run the Flask app
    app.run(debug=False, host='0.0.0.0', port=port)