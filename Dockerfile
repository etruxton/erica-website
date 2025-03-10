FROM python:3.11-slim-buster

WORKDIR /app

# Install system dependencies, including Tesseract and language packs
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    libgl1 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libleptonica-dev \
    && rm -rf /var/lib/apt/lists/*

# Set environment variable to suppress MediaPipe GPU warnings
ENV GLOG_minloglevel=2

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt 

# Expose the Flask port
EXPOSE 5000

# Copy the rest of the application code
COPY . .

# Run Gunicorn with eventlet worker for WebSocket support
CMD ["sh", "-c", "gunicorn -k eventlet -w 1 --bind 0.0.0.0:${PORT:-5000} main:app"]