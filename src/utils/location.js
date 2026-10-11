import { useCallback, useEffect, useState } from 'react'

// Real browser location detection: navigator.geolocation for coordinates, then
// OpenStreetMap Nominatim (free, no API key) to turn them into a place name.
// The result is cached in localStorage so the browser doesn't re-prompt on every visit.

const CACHE_KEY = 'messify.location'
const DENIED_KEY = 'messify.location.denied'
const GEOCODE_CACHE = new Map()
let geocodeQueue = Promise.resolve()
let lastGeocodeAt = 0

export async function geocodeAddress(address) {
  if (!address?.trim()) return null
  const key = address.trim().toLowerCase()
  if (GEOCODE_CACHE.has(key)) return GEOCODE_CACHE.get(key)
  const request = geocodeQueue.then(async () => {
    const delay = Math.max(0, 1100 - (Date.now() - lastGeocodeAt))
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    lastGeocodeAt = Date.now()
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(address.trim())}`)
    if (!response.ok) return null
    const results = await response.json()
    return results[0] ? { lat: Number(results[0].lat), lng: Number(results[0].lon) } : null
  })
  geocodeQueue = request.catch(() => null)
  const point = await request
  GEOCODE_CACHE.set(key, point)
  return point
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) } catch { return null }
}
function writeCache(value) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lon}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('reverse geocoding failed')
  const data = await res.json()
  const a = data.address || {}
  const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.town || a.city_district || ''
  const city = a.city || a.town || a.village || a.state_district || a.county || ''
  const state = a.state || ''
  const label = [area, city].filter((v, i, arr) => v && arr.indexOf(v) === i).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || 'Your location'
  // Keep the street/locality and useful postal details, but avoid Nominatim's
  // redundant county/taluka levels (for example, "Nagpur, Nagpur Urban Taluka, Nagpur").
  const parts = [
    a.amenity || a.leisure || a.shop || a.building,
    a.house_number,
    a.road,
    a.neighbourhood || a.quarter,
    a.suburb,
    city,
    state,
    a.postcode,
    a.country,
  ].filter(Boolean)
  const seen = new Set()
  const full = parts.filter((part) => {
    const key = part.trim().toLocaleLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).join(', ') || label
  return { label, area, city, state, full }
}

// status: 'idle' | 'detecting' | 'ready' | 'denied' | 'unsupported' | 'error'
export function useBrowserLocation({ auto = true, useCache = true } = {}) {
  const cached = useCache ? readCache() : null
  const [location, setLocation] = useState(cached)
  const [status, setStatus] = useState(cached ? 'ready' : 'idle')

  const detect = useCallback(() => {
    if (!('geolocation' in navigator)) { setStatus('unsupported'); return }
    setStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude
        const lon = coords.longitude
        let place = { label: `${lat.toFixed(5)}, ${lon.toFixed(5)}`, area: '', city: '', state: '', full: '' }
        try {
          place = await reverseGeocode(lat, lon)
        } catch { /* GPS coordinates are still valid if address lookup fails. */ }
        const value = { ...place, lat, lon, accuracy: coords.accuracy ?? null }
        writeCache(value)
        try { localStorage.removeItem(DENIED_KEY) } catch { /* ignore */ }
        setLocation(value)
        setStatus('ready')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          try { localStorage.setItem(DENIED_KEY, '1') } catch { /* ignore */ }
          setStatus('denied')
        } else {
          setStatus('error')
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30 * 1000 },
    )
  }, [])

  useEffect(() => {
    if (!auto || cached) return
    let denied = false
    try { denied = localStorage.getItem(DENIED_KEY) === '1' } catch { /* ignore */ }
    if (denied) { setStatus('denied'); return }
    detect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { location, status, detect }
}
