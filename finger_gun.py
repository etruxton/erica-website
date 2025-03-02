from flask import Blueprint, session, render_template
from flask_socketio import emit
from extensions import socketio  # Import socketio from extensions.py
import cv2
import mediapipe as mp
import numpy as np
import base64
import math
import logging
import time

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create the Blueprint
finger_gun_bp = Blueprint('finger_gun', __name__, url_prefix='/finger_gun')

# Global Mediapipe initialization
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(min_detection_confidence=0.7, min_tracking_confidence=0.7)

@finger_gun_bp.route('/')
def index():
    # Initialize session variables
    if 'previous_thumb_y' not in session:
        session['previous_thumb_y'] = None
    if 'previous_time' not in session:
        session['previous_time'] = 0
    if 'shooting_detected' not in session:
        session['shooting_detected'] = False
    if 'last_shoot_time' not in session:
        session['last_shoot_time'] = 0
    return render_template('finger_gun/index.html')

def calculate_distance(point1, point2):
    return math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2)

def is_finger_gun(hand_landmarks, frame_width, frame_height, session):
    if hand_landmarks is None:
        return False, None

    thumb_tip = hand_landmarks.landmark[mp.solutions.hands.HandLandmark.THUMB_TIP]
    index_tip = hand_landmarks.landmark[mp.solutions.hands.HandLandmark.INDEX_FINGER_TIP]
    middle_tip = hand_landmarks.landmark[mp.solutions.hands.HandLandmark.MIDDLE_FINGER_TIP]
    ring_tip = hand_landmarks.landmark[mp.solutions.hands.HandLandmark.RING_FINGER_TIP]
    pinky_tip = hand_landmarks.landmark[mp.solutions.hands.HandLandmark.PINKY_TIP]
    wrist = hand_landmarks.landmark[mp.solutions.hands.HandLandmark.WRIST]
    middle_pip = hand_landmarks.landmark[mp.solutions.hands.HandLandmark.MIDDLE_FINGER_PIP]

    thumb_index_dist = calculate_distance((thumb_tip.x, thumb_tip.y), (index_tip.x, index_tip.y))
    middle_ring_dist = calculate_distance((middle_tip.x, middle_tip.y), (ring_tip.x, ring_tip.y))
    ring_pinky_dist = calculate_distance((ring_tip.x, ring_tip.y), (pinky_tip.x, pinky_tip.y))
    index_wrist_dist = calculate_distance((index_tip.x, index_tip.y), (wrist.x, wrist.y))
    thumb_middle_dist = calculate_distance((thumb_tip.x, thumb_tip.y), (middle_pip.x, middle_pip.y))

    scaled_thumb_index = session.get('thumb_index_threshold', 70) / 100.0
    scaled_middle_ring = session.get('middle_ring_threshold', 8) / 100.0
    scaled_ring_pinky = session.get('ring_pinky_threshold', 8) / 100.0
    scaled_index_wrist = session.get('index_wrist_threshold', 10) / 100.0

    is_thumb_near_index = thumb_index_dist < scaled_thumb_index
    is_middle_ring_close = middle_ring_dist < scaled_middle_ring
    is_ring_pinky_close = ring_pinky_dist < scaled_ring_pinky
    is_index_extended = index_wrist_dist > scaled_index_wrist

    if is_thumb_near_index and is_middle_ring_close and is_ring_pinky_close and is_index_extended:
        return True, (int(index_tip.x * frame_width), int(index_tip.y * frame_height)), thumb_tip, middle_pip, thumb_middle_dist
    else:
        return False, None, None, None, None

def process_frame(frame, session):
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image.flags.writeable = False
    results = hands.process(image)
    image.flags.writeable = True
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    

    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            mp_drawing.draw_landmarks(image, hand_landmarks, mp.solutions.hands.HAND_CONNECTIONS)
            is_gun, index_tip_coords, thumb_tip, middle_pip, thumb_middle_dist = is_finger_gun(hand_landmarks, 640, 480, session)
            if is_gun:
                cv2.putText(image, "Finger Gun!", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                if index_tip_coords:
                    cv2.circle(image, index_tip_coords, 10, (0, 0, 255), -1)
                    thumb_tip_x, thumb_tip_y = int(thumb_tip.x * 640), int(thumb_tip.y * 480)
                    middle_pip_x, middle_pip_y = int(middle_pip.x * 640), int(middle_pip.y * 480)
                    cv2.circle(image, (thumb_tip_x, thumb_tip_y), 5, (0, 255, 0), -1)
                    cv2.circle(image, (middle_pip_x, middle_pip_y), 5, (0, 255, 0), -1)

                # Shooting detection logic
                current_time = time.time()
                current_thumb_y = thumb_tip.y

                # Initialize session variables if they don't exist
                if 'previous_thumb_y' not in session or session['previous_thumb_y'] is None:
                    session['previous_thumb_y'] = current_thumb_y
                if 'previous_time' not in session or session['previous_time'] is None:
                    session['previous_time'] = current_time

                if 'previous_thumb_y' in session and len(session) > 100:  # Example threshold
                    session.clear()

                # Calculate thumb velocity
                delta_time = current_time - session['previous_time']
                if delta_time != 0:
                    thumb_velocity = (current_thumb_y - session['previous_thumb_y']) / delta_time
                else:
                    thumb_velocity = 0

                # Check if shooting is detected
                if thumb_velocity > session.get('shoot_velocity_threshold', 0.1) and thumb_middle_dist < session.get('shoot_distance_threshold', 0.1):
                    if not session.get('shooting_detected') and current_time - session.get('last_shoot_time', 0) > session.get('cooldown_duration', 0.5):
                        cv2.putText(image, "Shoot!", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                        session['shooting_detected'] = True
                        session['last_shoot_time'] = current_time
                    else:
                        session['shooting_detected'] = False

                # Update session variables
                session['previous_thumb_y'] = current_thumb_y
                session['previous_time'] = current_time
            else:
                session['shooting_detected'] = False
                session['previous_thumb_y'] = None
                session['previous_time'] = 0
    else:
        session['shooting_detected'] = False
        session['previous_thumb_y'] = None
        session['previous_time'] = 0

    return image

def handle_frame(data):
    try:
        logger.debug("Received frame data from client")

        # Ensure the session is available
        if not session:
            logger.error("Session not available")
            emit('error', {'error': 'Session not available'})
            return

        # Decode the Base64-encoded frame
        frame_bytes = base64.b64decode(data['frame'])
        frame_np = np.frombuffer(frame_bytes, dtype=np.uint8)
        frame = cv2.imdecode(frame_np, cv2.IMREAD_COLOR)
        frame = cv2.flip(frame, 1)

        if frame is None:
            emit('error', {'error': 'Invalid frame data'})
            return

        logger.debug("Frame decoded successfully")

        # Process the frame with session data
        processed_frame = process_frame(frame, session)
        _, processed_frame_bytes = cv2.imencode('.jpg', processed_frame)
        processed_frame_base64 = base64.b64encode(processed_frame_bytes).decode('utf-8')

        logger.debug("Frame processed successfully")

        # Send the processed frame back to the client
        emit('processed_frame', {'processed_frame': processed_frame_base64})

        # Explicitly free memory
        del frame, frame_np, frame_bytes, processed_frame, processed_frame_bytes

    except Exception as e:
        logger.error(f"Error processing frame: {str(e)}")
        emit('error', {'error': str(e)})

# Register the WebSocket event handler
socketio.on_event('frame', handle_frame, namespace='/finger_gun')