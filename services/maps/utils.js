// Map utilities for React Native Maps

// Calculate a region for MapView given a center and optional deltas
export function calculateRegionFromCoordinates(latitude, longitude, latitudeDelta = 0.05, longitudeDelta = 0.05) {
  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

// Format coordinates as a string
export function formatCoordinates(latitude, longitude) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
