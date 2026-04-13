<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  lat: { type: Number, default: 41.4993 },
  lon: { type: Number, default: -81.6944 },
  zoom: { type: Number, default: 10 },
})

const emit = defineEmits(['select'])
const mapContainer = ref(null)
let map = null
let marker = null

/** Leaflet can report lng outside ±180 after panning across the antimeridian; wrap to [-180, 180]. */
function wrapLongitude(lng) {
  if (lng >= -180 && lng <= 180) return lng
  return ((((lng + 180) % 360) + 360) % 360) - 180
}

function clampLatitude(lat) {
  return Math.min(90, Math.max(-90, lat))
}

function normalizeLatLng(lat, lng) {
  return { lat: clampLatitude(lat), lon: wrapLongitude(lng) }
}

function initMap() {
  if (!mapContainer.value) return
  map = L.map(mapContainer.value).setView([props.lat, props.lon], props.zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
  }).addTo(map)

  const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  })
  marker = L.marker([props.lat, props.lon], { icon }).addTo(map)

  map.on('click', (e) => {
    const { lat, lng } = e.latlng
    const { lat: nLat, lon: nLon } = normalizeLatLng(lat, lng)
    marker.setLatLng([nLat, nLon])
    emit('select', { lat: nLat, lon: nLon })
  })
}

function updateMarker(lat, lon) {
  if (!marker || !map) return
  const { lat: nLat, lon: nLon } = normalizeLatLng(lat, lon)
  marker.setLatLng([nLat, nLon])
  map.setView([nLat, nLon], map.getZoom())
}

watch(
  () => [props.lat, props.lon],
  ([lat, lon]) => {
    if (map && marker) updateMarker(lat, lon)
  }
)

onMounted(() => {
  initMap()
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
    marker = null
  }
})
</script>

<template>
  <div class="map-wrap">
    <p class="map-hint">Click the map to choose a location</p>
    <div ref="mapContainer" class="map-container"></div>
  </div>
</template>

<style scoped>
.map-wrap {
  margin-bottom: 1rem;
}
.map-hint {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0 0 0.5rem 0;
}
.map-container {
  width: 100%;
  height: 280px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg);
}
:deep(.leaflet-container) {
  font-family: inherit;
}
</style>
