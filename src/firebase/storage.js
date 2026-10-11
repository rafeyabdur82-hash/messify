// Image uploads (payment screenshots, mess payment QR codes).
//
// Two modes, chosen automatically:
// 1. Cloudinary (free, no credit card) — used when CLOUD_NAME and UPLOAD_PRESET below are filled in.
//    Create a free account at https://cloudinary.com, copy your "Cloud name", then
//    Settings -> Upload -> Upload presets -> Add (Signing Mode: UNSIGNED), and paste both values.
// 2. Built-in fallback — when those are not filled in, the image is shrunk in the browser and
//    returned as a small data URL that is saved inside the Firestore document itself.
//    No extra account needed, and it works on Firebase's free plan.
//
// Either way the function returns a URL string that can be used directly in <img src>.

const CLOUD_NAME = 'YOUR_CLOUDINARY_CLOUD_NAME'
const UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET'

const cloudinaryConfigured = !CLOUD_NAME.startsWith('YOUR_') && !UPLOAD_PRESET.startsWith('YOUR_')

// Firestore documents are limited to 1 MiB, so keep the encoded image well below that.
const MAX_DATA_URL_CHARS = 450_000

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')) }
    img.src = url
  })
}

async function compressToDataUrl(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  const img = await loadImage(file)
  // Try progressively smaller sizes / qualities until it fits.
  for (const [maxSide, quality] of [[1000, 0.8], [900, 0.7], [760, 0.6], [640, 0.5], [520, 0.45]]) {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff' // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length <= MAX_DATA_URL_CHARS) return dataUrl
  }
  throw new Error('This image is too large. Please choose a smaller one.')
}

export async function uploadImage(path, file) {
  if (!cloudinaryConfigured) return compressToDataUrl(file)

  // `path` looks like "payment-screenshots/uid_12345.jpg" — the first segment becomes a Cloudinary folder.
  const folder = path.includes('/') ? path.split('/')[0] : 'uploads'

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Image upload failed. Check your Cloudinary setup in src/firebase/storage.js.')
  }

  const data = await response.json()
  return data.secure_url
}
