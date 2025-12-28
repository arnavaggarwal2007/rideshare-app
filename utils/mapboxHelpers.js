// utils/mapboxHelpers.js
// Shared helpers for Mapbox geocoding and search

/**
 * Generate a search keyword string from address or place object
 * @param {Object} place - Place object (may have name, address, city, etc.)
 * @returns {string}
 */
export function generateSearchKeyword(place) {
  if (!place) return '';
  // Try to build a useful search string from available fields
  const { name, address, city, state, country } = place;
  return [name, address, city, state, country].filter(Boolean).join(', ');
}

/**
 * Convert [lng, lat] to { lat, lng }
 * @param {[number, number]} lngLat
 * @returns {{ lat: number, lng: number }}
 */
export function lngLatToLatLng(lngLat) {
  return { lat: lngLat[1], lng: lngLat[0] };
}

/**
 * Convert { lat, lng } to [lng, lat]
 * @param {{ lat: number, lng: number }} latLng
 * @returns {[number, number]}
 */
export function latLngToLngLat(latLng) {
  return [latLng.lng, latLng.lat];
}
