FROM python:3.11-slim-buster

WORKDIR /app

# Install system dependencies, including Tesseract and language packs
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    libgl1 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    #tesseract-ocr \
    #tesseract-ocr-eng \
    #libtesseract-dev \
    libleptonica-dev \
    && rm -rf /var/lib/apt/lists/*

# Set environment variable to suppress MediaPipe GPU warnings
ENV GLOG_minloglevel=2

# Set the TESSDATA_PREFIX environment variable
#ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy pre-downloaded EasyOCR models
COPY easyocr_models /root/.EasyOCR/model

# Expose the Flask port
EXPOSE $PORT

# Copy the rest of the application code
COPY . .

# Run Gunicorn with eventlet worker for WebSocket support, using Heroku's $PORT
CMD ["sh", "-c", "gunicorn -k eventlet -w 1 --bind 0.0.0.0:$PORT main:app"]