import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// OpenStreetMap map (Leaflet) showing the delivery partner's live position and, if known,
// the student's drop-off point. Uses circle markers so no marker image files are needed.
export default function LiveMap({ rider, riderLabel = 'Delivery partner', destination, origin, stops = [], className = 'h-72 w-full rounded-xl overflow-hidden' }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const riderRef = useRef(null)
  const destRef = useRef(null)
  const originRef = useRef(null)
  const routeLineRef = useRef(null)
  const stopLayer = useRef(null)

  // Create the map once.
  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true }).setView([rider?.lat ?? 21.1458, rider?.lng ?? 79.0882], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    mapRef.current = map
    stopLayer.current = L.layerGroup().addTo(map)
    // The container may still be settling when Leaflet measures it; re-measure so tiles fill the box.
    const t = setTimeout(() => map.invalidateSize(), 250)
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; riderRef.current = null; destRef.current = null; originRef.current = null; routeLineRef.current = null; stopLayer.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Move the markers whenever the data changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const points = []

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current)
      routeLineRef.current = null
    }

    if (origin?.lat != null && origin?.lng != null) {
      const pos = [origin.lat, origin.lng]
      if (!originRef.current) originRef.current = L.circleMarker(pos, { radius: 10, color: '#fff', weight: 3, fillColor: '#2E7D4F', fillOpacity: 1 }).addTo(map)
      else originRef.current.setLatLng(pos)
      originRef.current.unbindTooltip().bindTooltip(origin.label || 'Mess', { permanent: true, direction: 'top', offset: [0, -8] })
      points.push(pos)
    } else if (originRef.current) {
      map.removeLayer(originRef.current)
      originRef.current = null
    }

    if (rider?.lat != null && rider?.lng != null) {
      const pos = [rider.lat, rider.lng]
      if (!riderRef.current) {
        riderRef.current = L.circleMarker(pos, { radius: 11, color: '#fff', weight: 3, fillColor: '#7A2E1D', fillOpacity: 1 }).addTo(map)
      } else {
        riderRef.current.setLatLng(pos)
      }
      riderRef.current.unbindTooltip().bindTooltip(riderLabel, { permanent: true, direction: 'top', offset: [0, -8] })
      points.push(pos)
    }

    if (destination?.lat != null && destination?.lng != null) {
      const pos = [destination.lat, destination.lng]
      if (!destRef.current) {
        destRef.current = L.circleMarker(pos, { radius: 9, color: '#fff', weight: 3, fillColor: '#2B4C4A', fillOpacity: 1 }).addTo(map)
      } else {
        destRef.current.setLatLng(pos)
      }
      destRef.current.unbindTooltip().bindTooltip(destination.label || 'Student', { permanent: true, direction: 'top', offset: [0, -8] })
      points.push(pos)
    } else if (destRef.current) {
      map.removeLayer(destRef.current)
      destRef.current = null
    }

    // Numbered drop-off stops (green = delivered, amber = next, grey = later).
    if (stopLayer.current) {
      stopLayer.current.clearLayers()
      stops.forEach((st, i) => {
        if (st?.lat == null || st?.lng == null) return
        const color = st.done ? '#2E7D4F' : st.current ? '#E0A526' : '#8A8A8A'
        L.circleMarker([st.lat, st.lng], { radius: 11, color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 })
          .bindTooltip(st.label || `Stop ${i + 1}`, { permanent: true, direction: 'top', offset: [0, -8] })
          .addTo(stopLayer.current)
        points.push([st.lat, st.lng])
      })
    }

    if (points.length > 1) {
      routeLineRef.current = L.polyline(points, { color: '#7A2E1D', weight: 4, opacity: 0.72, dashArray: '8 7' }).addTo(map).bringToBack()
    }

    if (points.length === 1) map.setView(points[0], Math.max(map.getZoom(), 15))
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 17 })
  }, [rider?.lat, rider?.lng, riderLabel, destination?.lat, destination?.lng, destination?.label, origin?.lat, origin?.lng, origin?.label, JSON.stringify(stops)])

  return <div ref={elRef} className={className} />
}
