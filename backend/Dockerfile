FROM python:3.11-slim

# Install FFmpeg, Tesseract and OpenCV runtime libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    tesseract-ocr \
    tesseract-ocr-fra \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV TEMP_DIR=/tmp/reelclone
ENV FFMPEG_PATH=ffmpeg
ENV FFPROBE_PATH=ffprobe
ENV TESSERACT_PATH=tesseract
ENV PORT=8000

RUN mkdir -p /tmp/reelclone

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
