import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, session
from extensions import socketio  # Import socketio from extensions.py
from bullet_hell import bullet_hell_bp
from finger_gun import finger_gun_bp
import os

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Register Blueprints
app.register_blueprint(bullet_hell_bp)
app.register_blueprint(finger_gun_bp)

# Initialize SocketIO with the app
socketio.init_app(app, cors_allowed_origins="*")

@app.route('/')
def home():
    return render_template('home.html')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)