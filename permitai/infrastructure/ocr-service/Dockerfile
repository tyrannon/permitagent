FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libglib2.0-0 \
    libgl1-mesa-glx \
    poppler-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download PaddleOCR models during build
RUN python -c "from paddleocr import PaddleOCR; ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)"

# Copy application code
COPY main.py .

# Expose port
EXPOSE 8001

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]