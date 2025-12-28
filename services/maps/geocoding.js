// Simple debounce utility
export function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Debounced version of searchAddress (400ms)
export const debouncedSearchAddress = debounce(searchAddress, 400);

// OSM Nominatim Reverse Geocoding Service
// Converts coordinates to address
export async function reverseGeocode(latitude, longitude) {
  if (!latitude || !longitude) return null;
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'rideshare-app/1.0' },
    });
    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
    const data = await res.json();
    if (data.error) return null;
    return {
      address: data.display_name,
      coordinates: {
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
      },
      placeName: data.display_name,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// OSM Nominatim Geocoding Service (US-only)
// Returns [{ address, coordinates: { latitude, longitude }, placeName }]

export async function searchAddress(query) {
  if (!query || !query.trim()) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'rideshare-app/1.0' },
    });
    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
    const data = await res.json();
    return data.map(item => ({
      address: item.display_name,
      coordinates: {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      },
      placeName: item.display_name,
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
}
