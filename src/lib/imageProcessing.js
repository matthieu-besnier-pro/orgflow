// Traitement d'images : redimensionnement à 500×500, détection de visages,
// conversion de formats (HEIC, HEIF) vers JPEG.

const TARGET_SIZE = 500;
const JPEG_QUALITY = 0.85;

// Détection de visages via l'API native FaceDetector (Chrome/Edge)
let _faceDetector = null;
try {
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    _faceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
  }
} catch { _faceDetector = null; }

function isHeic(file) {
  return /\.(heic|heif)$/i.test(file.name || '') ||
    file.type === 'image/heic' || file.type === 'image/heif';
}

async function convertHeicToJpeg(file) {
  if (!isHeic(file)) return file;
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], (file.name || 'photo').replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

async function detectFaceCenter(img) {
  if (!_faceDetector) return null;
  try {
    const faces = await _faceDetector.detect(img);
    if (faces.length > 0) {
      const b = faces[0].boundingBox;
      return { x: b.x + b.width / 2, y: b.y + b.height / 2, faceSize: Math.max(b.width, b.height) };
    }
  } catch {}
  return null;
}

/**
 * Traite une photo : conversion HEIC → JPEG, recadrage carré centré sur le visage,
 * redimensionnement à 500×500px. Retourne un File JPEG optimisé.
 */
export async function processPhoto(file, size = TARGET_SIZE) {
  // 1. Convertir HEIC/HEIF si nécessaire
  const jpegFile = await convertHeicToJpeg(file);

  // 2. Charger l'image
  const img = await loadImageElement(jpegFile);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const url = img.src;

  try {
    // 3. Détecter le visage pour le centrage
    const face = await detectFaceCenter(img);

    // 4. Calculer la zone de recadrage (carré)
    let cx, cy, cropSize;
    if (face) {
      cx = face.x;
      cy = face.y;
      cropSize = Math.min(iw, ih, face.faceSize * 2.5);
    } else {
      cx = iw / 2;
      cy = ih / 2;
      cropSize = Math.min(iw, ih);
    }

    // Bornes : garder le crop dans l'image
    let sx = cx - cropSize / 2;
    let sy = cy - cropSize / 2;
    sx = Math.max(0, Math.min(sx, iw - cropSize));
    sy = Math.max(0, Math.min(sy, ih - cropSize));

    // 5. Dessiner sur le canvas à la taille cible (pas d'upscaling)
    const finalSize = Math.min(size, Math.round(cropSize));
    const canvas = document.createElement('canvas');
    canvas.width = finalSize;
    canvas.height = finalSize;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, finalSize, finalSize);

    // 6. Exporter en JPEG
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    return new File([blob], (file.name || 'photo').replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Récupère une photo existante depuis son URL, la retraite (recadrage 500×500
 * centré sur le visage) et retourne un nouveau File JPEG optimisé.
 */
export async function processPhotoFromUrl(url, size = TARGET_SIZE) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Photo introuvable');
  const blob = await response.blob();
  const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
  return processPhoto(file, size);
}

export const SUPPORTED_PHOTO_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.avif,.heic,.heif,.gif,.bmp,.tiff,.tif';