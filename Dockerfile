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

CMD ["gunicorn", "main:app"]