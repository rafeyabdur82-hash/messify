import { useCallback, useEffect, useState } from 'react'

// Real browser location detection: navigator.geolocation for coordinates, then
// OpenStreetMap Nominatim (free, no API key) to turn them into a place name.
// The result is cached in localStorage so the browser doesn't re-prompt on every visit.

const CACHE_KEY = 'messify.location'
const DENIED_KEY = 'messify.location.denied'

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
  const city = a.city || a.town || a.village || a.county || a.state_district || ''
  const state = a.state || ''
  const label = [area, city].filter((v, i, arr) => v && arr.indexOf(v) === i).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || 'Your location'
  // Full address from the geocoder, minus the trailing country, e.g. "Shradha Park, Wadi, Hingna, Nagpur, Maharashtra, 441110".
  const full = (data.display_name || label).replace(/,\s*India$/, '')
  return { label, area, city, state, full }
}

// status: 'idle' | 'detecting' | 'ready' | 'denied' | 'unsupported' | 'error'
export function useBrowserLocation({ auto = true } = {}) {
  const cached = readCache()
  const [location, setLocation] = useState(cached)
  const [status, setStatus] = useState(cached ? 'ready' : 'idle')

  const detect = useCallback(() => {
    if (!('geolocation' in navigator)) { setStatus('unsupported'); return }
    setStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const place = await reverseGeocode(coords.latitude, coords.longitude)
          const value = { ...place, lat: coords.latitude, lon: coords.longitude }
          writeCache(value)
          try { localStorage.removeItem(DENIED_KEY) } catch { /* ignore */ }
          setLocation(value)
          setStatus('ready')
        } catch {
          setStatus('error')
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          try { localStorage.setItem(DENIED_KEY, '1') } catch { /* ignore */ }
          setStatus('denied')
        } else {
          setStatus('error')
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
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
