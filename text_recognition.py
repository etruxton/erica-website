import gc
import logging
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO

import base64
import cv2
import easyocr
import numpy as np
from flask import Blueprint, request, jsonify
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

text_recognition_bp = Blueprint('text_recognition', __name__)

# Create a thread pool executor for concurrent processing
executor = ThreadPoolExecutor(4)  # Adjust the number of threads as needed

# Initialize EasyOCR reader with the model directory
reader = easyocr.Reader(['en'], model_storage_directory='/root/.EasyOCR/model')

# Function to draw bounding boxes and confidence scores
def draw_bounding_boxes(image_np, results):
    # ... (your draw_bounding_boxes function remains the same)
    for (bbox, text, prob) in results:
        # Unpack the bounding box
        (top_left, top_right, bottom_right, bottom_left) = bbox
        top_left = tuple(map(int, top_left))
        bottom_right = tuple(map(int, bottom_right))

        # Draw the bounding box
        cv2.rectangle(image_np, top_left, bottom_right, (0, 255, 0), 2)  # Green box with thickness 2

        # Add the confidence score above the bounding box
        confidence_text = f"{text} ({prob * 100:.2f}%)"
        font_scale = 1  # Smaller font size
        font_thickness = 1  # Thinner font
        text_offset = 5  # Move text closer to the bounding box

        # Calculate text size to position it properly
        (text_width, text_height), _ = cv2.getTextSize(confidence_text, cv2.FONT_HERSHEY_COMPLEX_SMALL, font_scale,
                                                     font_thickness)

        # Adjust text position to avoid going out of the image
        text_x = top_left[0]
        text_y = top_left[1] - text_offset

        # Ensure text stays within the image bounds
        if text_y < text_height:
            text_y = top_left[1] + text_height + text_offset

        # Draw the text
        cv2.putText(image_np, confidence_text, (text_x, text_y),
                    cv2.FONT_HERSHEY_COMPLEX_SMALL, font_scale, (0, 255, 0), font_thickness)
    return image_np

@text_recognition_bp.route('/recognize_text', methods=['POST'])
def recognize_text():
    try:
        data = request.get_json()
        image_data = data['image']

        logging.debug("Received image data")
        logging.debug(f"Base64 length: {len(image_data)}")

        # Decode base64 image
        try:
            image_bytes = base64.b64decode(image_data.split(',')[1])
            image = Image.open(BytesIO(image_bytes)).convert('RGB')
            image_np = np.array(image)
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)

            logging.debug("Decoded image")

            # Convert to grayscale
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
            # Apply dilation and erosion to remove noise
            kernel = np.ones((1, 1), np.uint8)
            dilated = cv2.dilate(gray, kernel, iterations=1)
            eroded = cv2.erode(dilated, kernel, iterations=1)

            # Apply adaptive thresholding
            thresh = cv2.adaptiveThreshold(eroded, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

            logging.debug("Preprocessed image")

            # Submit the OCR task to the thread pool
            future = executor.submit(reader.readtext, thresh)

            # Use EasyOCR to recognize text
            results = future.result()

            # Extract recognized text
            recognized_text = " ".join([result[1] for result in results])  # Combine all detected text

            logging.debug(f"Recognized text: {recognized_text}")

            # Check if any text was recognized
            if not recognized_text:
                recognized_text = "No text recognized."

            # Draw bounding boxes and confidence scores on the original image
            annotated_image = draw_bounding_boxes(image_np.copy(), results)

            # Convert processed images to base64 for display
            def image_to_base64(image):
                _, img_encoded = cv2.imencode('.png', image)
                return base64.b64encode(img_encoded).decode('utf-8')

            gc.collect()  # Place this at the end of your recognize_text function, before returning. This will help free up memory.
            return jsonify({
                'text': recognized_text,
                'original_image': image_to_base64(image_np),
                'annotated_image': image_to_base64(annotated_image)
            })

        except Exception as decode_error:
            logging.error(f"Decoding Error: {decode_error}")
            return jsonify({'error': f"Decoding Error: {decode_error}"}), 500

    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500