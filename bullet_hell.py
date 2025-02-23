from flask import Blueprint, render_template, request, jsonify, session
import threading
import random
import time
import math
import cv2
import numpy as np
import base64
import os

bullet_hell_bp = Blueprint('bullet_hell', __name__, url_prefix='/bullet_hell')
bullet_hell_bp.secret_key = os.urandom(24) #set secret key.

GAME_WIDTH, GAME_HEIGHT = 600, 800

def create_game_state():
    return {
        "player_x": GAME_WIDTH // 2,
        "player_y": GAME_HEIGHT - 40,
        "boss_x": GAME_WIDTH // 2,
        "boss_y": 50,
        "boss_health": 100,
        "boss_phase": 1,
        "boss_direction": 1,
        "bullets": [],
        "boss_bullets": [],
        "last_boss_bullet_time": time.time(),
        "last_bullet_time": time.time(),
        "boss_start_time": time.time(),
        "prev_cX": GAME_WIDTH // 2,
        "prev_cY": GAME_HEIGHT - 40,
    }

@bullet_hell_bp.route("/")
def index():
    if 'lower_hsv' not in session:
        session['lower_hsv'] = [0, 0, 0]
    if 'upper_hsv' not in session:
        session['upper_hsv'] = [179, 255, 255]
    return render_template("bullet_hell/index.html")

@bullet_hell_bp.route("/update_hsv_values", methods=['POST'])
def update_hsv_values():
    try:
        data = request.get_json()
        hsv_values = data.get('hsv_values')

        if hsv_values is None or len(hsv_values) != 6:
            return jsonify({'error': 'Invalid HSV values'}), 400

        session['lower_hsv'] = hsv_values[:3]
        session['upper_hsv'] = hsv_values[3:]

        return jsonify({'message': 'HSV values updated'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bullet_hell_bp.route('/video_feed', methods=['POST'])
def video_feed():
    if 'image' not in request.files:
        return jsonify({'error': 'No image part'}), 400

    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        nparr = np.frombuffer(image_file.read(), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        frame = cv2.flip(frame, 1)
        frame = cv2.resize(frame, (GAME_WIDTH, GAME_HEIGHT), interpolation=cv2.INTER_AREA)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        lower_hsv = np.array(session['lower_hsv'])
        upper_hsv = np.array(session['upper_hsv'])
        mask = cv2.inRange(hsv, lower_hsv, upper_hsv)
        res = cv2.bitwise_and(frame, frame, mask=mask)

        M = cv2.moments(mask)

        game_state = session['game_state']
        prevX = int(request.form.get('prevX'))
        prevY = int(request.form.get('prevY'))

        if M["m00"] != 0:
            cX = int(M["m10"] / M["m00"])
            cY = int(M["m01"] / M["m00"])
            game_state['player_x'] = cX
            game_state['player_y'] = cY
            cv2.circle(res, (cX, cY), 5, (0, 0, 255), -1)

            ret, jpeg_original = cv2.imencode('.jpg', frame)
            original_video = jpeg_original.tobytes()
            original_base64 = base64.b64encode(original_video).decode('utf-8')

            ret, jpeg_processed = cv2.imencode('.jpg', res)
            processed_video = jpeg_processed.tobytes()
            processed_base64 = base64.b64encode(processed_video).decode('utf-8')

            return jsonify({
                'message': 'Frame received',
                'original': original_base64,
                'processed': processed_base64,
                'detected': True,
                'x': cX,
                'y': cY
            })

        else:
            cv2.putText(res, "No object detected", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

            cX = prevX
            cY = prevY
            cv2.circle(res, (cX, cY), 5, (0, 0, 255), -1)
            ret, jpeg_original = cv2.imencode('.jpg', frame)
            original_video = jpeg_original.tobytes()
            original_base64 = base64.b64encode(original_video).decode('utf-8')

            ret, jpeg_processed = cv2.imencode('.jpg', res)
            processed_video = jpeg_processed.tobytes()
            processed_base64 = base64.b64encode(processed_video).decode('utf-8')

            return jsonify({
                'message': 'Frame received',
                'original': original_base64,
                'processed': processed_base64,
                'detected': False
            })

    except Exception as e:
        return jsonify({'error': 'Error processing image: {str(e)}'}), 500

@bullet_hell_bp.route("/game_state", methods=['GET'])
def get_game_state():
    if 'game_state' not in session:
        session['game_state'] = create_game_state()
    return jsonify(session['game_state'])

@bullet_hell_bp.route("/update_game_state", methods=['POST'])
def update_game_state():
    game_state = session.get('game_state')
    if game_state:
        updated_game_state = request.get_json()
        game_state.update(updated_game_state)
        session['game_state'] = game_state
        return jsonify({"message": "Game state updated successfully"})
    return jsonify({"error": "Game state not found"}), 404