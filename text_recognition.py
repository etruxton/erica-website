import gc
from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image
import logging
import os
import tempfile

from google.cloud import vision_v1
from google.protobuf.json_format import MessageToDict

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

text_recognition_bp = Blueprint('text_recognition', __name__)

# Set Google credentials from environment variable
google_credentials_base64 = os.environ.get("GOOGLE_CREDENTIALS_BASE64")
if google_credentials_base64:
    try:
        credentials_json = base64.b64decode(google_credentials_base64).decode("utf-8")
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as temp_cred_file:
            temp_cred_file.write(credentials_json)
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = temp_cred_file.name
            logging.info("Google credentials loaded from environment variable.")
    except Exception as e:
        logging.error(f"Error loading Google credentials: {e}")
else:
    logging.error("GOOGLE_CREDENTIALS_BASE64 environment variable not set.")

# Initialize Google Vision client
client = vision_v1.ImageAnnotatorClient()

def draw_bounding_boxes(image_np, results):
    for page in results.pages:
        for block in page.blocks:
            for paragraph in block.paragraphs:
                for word in paragraph.words:
                    word_text = "".join([symbol.text for symbol in word.symbols])
                    confidence = word.confidence
                    vertices = word.bounding_box.vertices

                    if len(vertices) == 4:
                        top_left = (vertices[0].x, vertices[0].y)
                        bottom_right = (vertices[2].x, vertices[2].y)

                        cv2.rectangle(image_np, top_left, bottom_right, (0, 255, 0), 2)

                        text_offset = 5
                        text_x = top_left[0]
                        text_y = top_left[1] - text_offset

                        # Add confidence score to the text
                        confidence_text = f"{word_text} ({confidence * 100:.2f}%)"

                        cv2.putText(image_np, confidence_text, (text_x, text_y), cv2.FONT_HERSHEY_COMPLEX_SMALL, 1, (0, 255, 0), 1)
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

            # Convert the preprocessed image to bytes for Google Vision API
            _, img_encoded = cv2.imencode('.png', thresh)
            image_bytes_vision = img_encoded.tobytes()

            # Create a Google Vision Image object
            image_vision = vision_v1.Image(content=image_bytes_vision)

            # Recognize text using Google Vision API (document_text_detection)
            response = client.document_text_detection(image=image_vision)
            results = response.full_text_annotation

            # Extract recognized text
            recognized_text = response.full_text_annotation.text if response.full_text_annotation else ""

            logging.debug(f"Recognized text: {recognized_text}")

            # Draw bounding boxes on the original image
            annotated_image = draw_bounding_boxes(image_np.copy(), results)

            # Check if any text was recognized
            if not recognized_text:
                recognized_text = "No text recognized."

            # Convert processed images to base64 for display
            def image_to_base64(image):
                _, img_encoded = cv2.imencode('.png', image)
                return base64.b64encode(img_encoded).decode('utf-8')

            gc.collect()
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