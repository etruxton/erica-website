from flask_socketio import SocketIO
import eventlet  # or import gevent

# Initialize SocketIO with async_mode set to 'eventlet' or 'gevent'
socketio = SocketIO(async_mode='eventlet', cors_allowed_origins="*")