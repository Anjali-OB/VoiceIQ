import cv2
import numpy as np
import os
import json
import base64
import joblib
from datetime import datetime
from sklearn.metrics.pairwise import cosine_similarity

MODEL_DIR = os.path.dirname(__file__)
FACE_DATA_DIR = os.path.join(MODEL_DIR, 'face_data')
FACE_STATS_PATH = os.path.join(MODEL_DIR, 'face_stats.json')

os.makedirs(FACE_DATA_DIR, exist_ok=True)

# Load OpenCV's pre-trained face detector (Haar Cascade - built into OpenCV)
CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

# Eye detector for liveness check
EYE_CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_eye.xml'
eye_cascade = cv2.CascadeClassifier(EYE_CASCADE_PATH)


def decode_base64_image(base64_string):
    """Decode base64 image to numpy array"""
    try:
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        img_bytes = base64.b64decode(base64_string)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Image decode error: {e}")
        return None


def encode_image_to_base64(img):
    """Encode numpy image to base64"""
    _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode('utf-8')


def detect_faces(img):
    """Detect faces in image using Haar Cascade"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)  # Improve contrast

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(60, 60),
        flags=cv2.CASCADE_SCALE_IMAGE
    )
    return faces, gray


def extract_face_features(img, face_rect):
    """
    Extract HOG-like features from face region.
    Uses histogram of oriented gradients (HOG) concept manually.
    """
    x, y, w, h = face_rect
    face_roi = img[y:y+h, x:x+w]

    # Resize to standard size
    face_resized = cv2.resize(face_roi, (64, 64))

    # Convert to grayscale
    gray_face = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)

    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray_face, (3, 3), 0)

    # Calculate gradients (Sobel)
    grad_x = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)

    magnitude = np.sqrt(grad_x**2 + grad_y**2)
    angle = np.arctan2(grad_y, grad_x) * 180 / np.pi

    # HOG features: divide into 4x4 cells, compute histogram per cell
    cell_size = 16
    n_bins = 9
    cells_per_row = 64 // cell_size
    features = []

    for i in range(cells_per_row):
        for j in range(cells_per_row):
            cell_mag = magnitude[i*cell_size:(i+1)*cell_size, j*cell_size:(j+1)*cell_size]
            cell_angle = angle[i*cell_size:(i+1)*cell_size, j*cell_size:(j+1)*cell_size]
            hist, _ = np.histogram(cell_angle, bins=n_bins, range=(-180, 180), weights=cell_mag)
            features.extend(hist.tolist())

    # Also add LBP-inspired texture features
    lbp_features = []
    for i in range(0, 64, 8):
        for j in range(0, 64, 8):
            patch = gray_face[i:i+8, j:j+8].flatten()
            lbp_features.extend([
                float(np.mean(patch)),
                float(np.std(patch)),
                float(np.min(patch)),
                float(np.max(patch))
            ])

    all_features = features + lbp_features
    feature_vector = np.array(all_features, dtype=np.float64)

    # Normalize
    norm = np.linalg.norm(feature_vector)
    if norm > 0:
        feature_vector = feature_vector / norm

    return feature_vector


def check_liveness(img, face_rect):
    """
    Basic liveness check using eye detection.
    Real face should have detectable eyes.
    """
    x, y, w, h = face_rect
    face_roi_gray = cv2.cvtColor(img[y:y+h, x:x+w], cv2.COLOR_BGR2GRAY)

    eyes = eye_cascade.detectMultiScale(
        face_roi_gray,
        scaleFactor=1.1,
        minNeighbors=3,
        minSize=(20, 20)
    )

    # Check texture variance (photos tend to have lower variance)
    gray_face = cv2.cvtColor(img[y:y+h, x:x+w], cv2.COLOR_BGR2GRAY)
    texture_score = float(gray_face.std())
    has_texture = texture_score > 15

    # Check brightness variation
    brightness_variation = float(np.std([
        gray_face[:h//2, :w//2].mean(),
        gray_face[:h//2, w//2:].mean(),
        gray_face[h//2:, :w//2].mean(),
        gray_face[h//2:, w//2:].mean()
    ]))

    eyes_detected = len(eyes) >= 1
    is_live = eyes_detected and has_texture

    return {
        'is_live': bool(is_live),
        'eyes_detected': int(len(eyes)),
        'texture_score': round(texture_score, 2),
        'brightness_variation': round(brightness_variation, 2),
        'confidence': round(min(100, texture_score * 2 + len(eyes) * 20), 1)
    }


def analyze_image(base64_image):
    """
    Analyze an image for face detection.
    Returns face locations, count, and quality metrics.
    """
    img = decode_base64_image(base64_image)
    if img is None:
        return {"error": "Could not decode image", "faces_found": 0}

    faces, gray = detect_faces(img)

    if len(faces) == 0:
        return {
            "faces_found": 0,
            "message": "No face detected. Please ensure good lighting and face the camera.",
            "image_width": img.shape[1],
            "image_height": img.shape[0]
        }

    face_data = []
    for (x, y, w, h) in faces:
        liveness = check_liveness(img, (x, y, w, h))
        face_data.append({
            "x": int(x), "y": int(y),
            "width": int(w), "height": int(h),
            "area": int(w * h),
            "liveness": liveness
        })

    # Draw boxes on image
    img_annotated = img.copy()
    for fd in face_data:
        color = (0, 255, 0) if fd['liveness']['is_live'] else (0, 0, 255)
        cv2.rectangle(img_annotated,
                     (fd['x'], fd['y']),
                     (fd['x'] + fd['width'], fd['y'] + fd['height']),
                     color, 2)
        label = f"Live: {fd['liveness']['is_live']}"
        cv2.putText(img_annotated, label,
                   (fd['x'], fd['y'] - 10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

    annotated_b64 = encode_image_to_base64(img_annotated)

    return {
        "faces_found": len(faces),
        "faces": face_data,
        "annotated_image": annotated_b64,
        "image_width": img.shape[1],
        "image_height": img.shape[0]
    }


def register_face(contact_id, contact_name, base64_image):
    """Register a contact's face for future verification"""
    img = decode_base64_image(base64_image)
    if img is None:
        return {"success": False, "error": "Could not decode image"}

    faces, gray = detect_faces(img)

    if len(faces) == 0:
        return {"success": False, "error": "No face detected in image"}

    if len(faces) > 1:
        return {"success": False, "error": f"Multiple faces detected ({len(faces)}). Please use a photo with only one face."}

    face_rect = faces[0]
    x, y, w, h = face_rect

    # Check liveness
    liveness = check_liveness(img, face_rect)

    # Extract features
    features = extract_face_features(img, face_rect)

    # Save face data
    face_file = os.path.join(FACE_DATA_DIR, f"{contact_id}.json")
    face_data = {
        "contact_id": contact_id,
        "contact_name": contact_name,
        "features": features.tolist(),
        "face_size": {"width": int(w), "height": int(h)},
        "registered_at": datetime.now().isoformat(),
        "liveness_at_registration": liveness
    }

    with open(face_file, 'w') as f:
        json.dump(face_data, f)

    # Save cropped face image
    face_crop = img[y:y+h, x:x+w]
    face_crop_resized = cv2.resize(face_crop, (128, 128))
    crop_path = os.path.join(FACE_DATA_DIR, f"{contact_id}_crop.jpg")
    cv2.imwrite(crop_path, face_crop_resized)
    crop_b64 = encode_image_to_base64(face_crop_resized)

    return {
        "success": True,
        "contact_id": contact_id,
        "contact_name": contact_name,
        "face_size": {"width": int(w), "height": int(h)},
        "liveness": liveness,
        "registered_at": face_data["registered_at"],
        "crop_image": crop_b64
    }


def verify_face(contact_id, base64_image, threshold=0.75):
    """
    Verify if a face matches the registered face for a contact.
    Returns similarity score and match result.
    """
    face_file = os.path.join(FACE_DATA_DIR, f"{contact_id}.json")

    if not os.path.exists(face_file):
        return {
            "verified": False,
            "error": "No registered face found for this contact",
            "contact_id": contact_id
        }

    with open(face_file, 'r') as f:
        registered_data = json.load(f)

    registered_features = np.array(registered_data["features"])

    img = decode_base64_image(base64_image)
    if img is None:
        return {"verified": False, "error": "Could not decode image"}

    faces, gray = detect_faces(img)

    if len(faces) == 0:
        return {
            "verified": False,
            "similarity": 0.0,
            "error": "No face detected in verification image",
            "contact_name": registered_data["contact_name"]
        }

    # Use the largest face
    largest_face = max(faces, key=lambda f: f[2] * f[3])
    current_features = extract_face_features(img, largest_face)

    # Compute cosine similarity
    similarity = float(cosine_similarity(
        registered_features.reshape(1, -1),
        current_features.reshape(1, -1)
    )[0][0])

    # Normalize to 0-100
    similarity_pct = round(max(0, similarity) * 100, 1)

    # Liveness check
    liveness = check_liveness(img, largest_face)

    # Draw verification result on image
    x, y, w, h = largest_face
    verified = similarity >= threshold and liveness['is_live']
    color = (0, 255, 0) if verified else (0, 0, 255)
    img_annotated = img.copy()
    cv2.rectangle(img_annotated, (x, y), (x+w, y+h), color, 2)
    status = "VERIFIED" if verified else "NOT VERIFIED"
    cv2.putText(img_annotated, f"{status} {similarity_pct}%",
               (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    annotated_b64 = encode_image_to_base64(img_annotated)

    return {
        "verified": bool(verified),
        "similarity": similarity_pct,
        "threshold": round(threshold * 100, 1),
        "contact_id": contact_id,
        "contact_name": registered_data["contact_name"],
        "liveness": liveness,
        "annotated_image": annotated_b64,
        "decision": "MATCH ✅" if verified else "NO MATCH ❌",
        "verified_at": datetime.now().isoformat()
    }


def get_registered_contacts():
    """Get list of all contacts with registered faces"""
    registered = []
    for fname in os.listdir(FACE_DATA_DIR):
        if fname.endswith('.json'):
            fpath = os.path.join(FACE_DATA_DIR, fname)
            try:
                with open(fpath, 'r') as f:
                    data = json.load(f)
                crop_path = os.path.join(FACE_DATA_DIR, fname.replace('.json', '_crop.jpg'))
                registered.append({
                    "contact_id": data["contact_id"],
                    "contact_name": data["contact_name"],
                    "registered_at": data["registered_at"],
                    "has_crop": os.path.exists(crop_path)
                })
            except Exception as e:
                print(f"Error reading face data: {e}")
    return registered


def delete_face(contact_id):
    """Delete registered face data for a contact"""
    face_file = os.path.join(FACE_DATA_DIR, f"{contact_id}.json")
    crop_file = os.path.join(FACE_DATA_DIR, f"{contact_id}_crop.jpg")
    deleted = []
    for f in [face_file, crop_file]:
        if os.path.exists(f):
            os.remove(f)
            deleted.append(f)
    return {"deleted": len(deleted), "contact_id": contact_id}


def get_system_info():
    """Get OpenCV and face detection system info"""
    return {
        "opencv_version": cv2.__version__,
        "cascade_loaded": not face_cascade.empty(),
        "eye_cascade_loaded": not eye_cascade.empty(),
        "face_data_dir": FACE_DATA_DIR,
        "registered_contacts": len([f for f in os.listdir(FACE_DATA_DIR) if f.endswith('.json')]),
        "algorithm": "HOG Features + Cosine Similarity",
        "detector": "Haar Cascade (OpenCV)",
        "liveness": "Eye Detection + Texture Analysis"
    }


if __name__ == '__main__':
    info = get_system_info()
    print(f"OpenCV version: {info['opencv_version']}")
    print(f"Cascade loaded: {info['cascade_loaded']}")
    print(f"System ready!")