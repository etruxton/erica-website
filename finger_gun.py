from flask import Blueprint, Response, request, jsonify, render_template, session
import cv2
import mediapipe as mp
import math
import numpy as np
import base64
import time
import os

finger_gun_bp = Blueprint('finger_gun', __name__, url_prefix='/finger_gun')
#finger_gun_bp.secret_key = os.urandom(24) # Generate a secret key


frame_width = 640
frame_height = 480

def calculate_distance(point1, point2):
    return math.sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)

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

    scaled_thumb_index = session.get('thumb_index_threshold', 35) / 100.0
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
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    hands = mp_hands.Hands(min_detection_confidence=0.7, min_tracking_confidence=0.6, max_num_hands=1)

    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image.flags.writeable = False
    results = hands.process(image)
    image.flags.writeable = True
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            mp_drawing.draw_landmarks(image, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            is_gun, index_tip_coords, thumb_tip, middle_pip, thumb_middle_dist = is_finger_gun(hand_landmarks, frame_width, frame_height, session)
            if is_gun:
                cv2.putText(image, "Finger Gun!", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                if index_tip_coords:
                    cv2.circle(image, index_tip_coords, 10, (0, 0, 255), -1)
                    thumb_tip_x, thumb_tip_y = int(thumb_tip.x * frame_width), int(thumb_tip.y * frame_height)
                    middle_pip_x, middle_pip_y = int(middle_pip.x * frame_width), int(middle_pip.y * frame_height)
                    cv2.circle(image, (thumb_tip_x, thumb_tip_y), 5, (0, 255, 0), -1)
                    cv2.circle(image, (middle_pip_x, middle_pip_y), 5, (0, 255, 0), -1)

                current_time = time.time()
                current_thumb_y = thumb_tip.y
                if session.get('previous_thumb_y') is not None:
                    delta_time = current_time - session.get('previous_time', 0)
                    if delta_time != 0:
                        thumb_velocity = (current_thumb_y - session.get('previous_thumb_y')) / delta_time
                    else:
                        thumb_velocity = 0

                    if thumb_velocity > session.get('shoot_velocity_threshold', 0.1) and thumb_middle_dist < session.get('shoot_distance_threshold', 0.1):
                        if not session.get('shooting_detected') and current_time - session.get('last_shoot_time', 0) > session.get('cooldown_duration', 0.5):
                            cv2.putText(image, "Shoot!", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                            session['shooting_detected'] = True
                            session['last_shoot_time'] = current_time
                    else:
                        session['shooting_detected'] = False

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


    hands.close() #Close the mediapipe hands model.
    return image

@finger_gun_bp.route('/')
def index():
    if 'thumb_index_threshold' not in session:
        session['thumb_index_threshold'] = 35
        session['middle_ring_threshold'] = 8
        session['ring_pinky_threshold'] = 8
        session['index_wrist_threshold'] = 10
        session['shoot_velocity_threshold'] = 0.1
        session['shoot_distance_threshold'] = 0.1
        session['shooting_detected'] = False
        session['last_shoot_time'] = 0
        session['cooldown_duration'] = 0.5
        session['previous_thumb_y'] = None
        session['previous_time'] = 0
    return render_template('finger_gun/index.html')

@finger_gun_bp.route('/video_feed', methods=['POST'])
def video_feed():
    try:
        data = request.get_json()
        frame_base64 = data['frame']
        frame_bytes = base64.b64decode(frame_base64)
        frame_np = np.frombuffer(frame_bytes, dtype=np.uint8)
        frame = cv2.imdecode(frame_np, cv2.IMREAD_COLOR)
        frame = cv2.flip(frame, 1)

        if frame is None:
            return jsonify({'error': 'Invalid frame data'})

        processed_frame = process_frame(frame, session)
        _, processed_frame_bytes = cv2.imencode('.jpg', processed_frame)
        processed_frame_base64 = base64.b64encode(processed_frame_bytes).decode('utf-8')

        return jsonify({'processed_frame': processed_frame_base64})
    except Exception as e:
        print(f"Error processing frame: {e}")
        return jsonify({'error': str(e)})