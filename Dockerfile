FROM python:3.11-slim-buster

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install\
    libgl1\
    libgl1-mesa-glx \ 
    libglib2.0-0 -y && \
    rm -rf /var/lib/apt/lists/*

# Set environment variable to suppress MediaPipe GPU warnings
ENV GLOG_minloglevel=2

# Expose the port your app runs on
EXPOSE 5000

# Run Gunicorn and bind to 0.0.0.0:5000
CMD ["gunicorn", "-k", "eventlet", "-w", "1", "--bind", "0.0.0.0:5000", "main:app"]