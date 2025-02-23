from flask import Flask, render_template
from bullet_hell import bullet_hell_bp
from finger_gun import finger_gun_bp
import os 

app = Flask(__name__)

app.register_blueprint(bullet_hell_bp)
app.register_blueprint(finger_gun_bp)
app.secret_key = os.urandom(24) # Set the secret key here!

@app.route('/')
def home():
    return render_template('home.html')

if __name__ == '__main__':
    app.run(debug=True)