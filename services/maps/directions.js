// OpenRouteService Directions API
// Usage: getDirections(start, end, profile?) where start/end = { latitude, longitude }
// Requires: EXPO_PUBLIC_ORS_KEY available at build/runtime (public env)

import polyline from '@mapbox/polyline';

const ORS_API_KEY = process.env.EXPO_PUBLIC_ORS_KEY;

function toLonLat(point) {
  return [Number(point?.longitude), Number(point?.latitude)];
}

function toLatLngArray(geometryCoordinates) {
  // ORS returns [lon, lat]
  return (geometryCoordinates || []).map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
}

export async function getDirections(start, end, profile = 'driving-car') {
  if (!ORS_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_ORS_KEY environment variable for OpenRouteService.');
  }

  const url = `https://api.openrouteservice.org/v2/directions/${profile}`;

  const body = {
    coordinates: [toLonLat(start), toLonLat(end)],
    instructions: false,
  };

  console.log('[ORS] Request:', { url, coordinates: body.coordinates, start, end });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[ORS] Error response:', { status: res.status, text });
    throw new Error(`OpenRouteService error ${res.status}: ${text || res.statusText}`);
  }

  const data = await res.json();
  console.log('[ORS] Response:', { 
    hasFeatures: !!data?.features?.length, 
    hasRoutes: !!data?.routes?.length,
    data 
  });
  
  // ORS can return either features (geojson) or routes (json) format
  const route = data?.features?.[0] || data?.routes?.[0];
  
  if (!route) {
    const errorDetail = data?.error?.message || 'No route found';
    throw new Error(`OpenRouteService returned no routes. ${errorDetail}`);
  }

  // Handle both geojson (features) and json (routes) response formats
  const props = route?.properties || {};
  const summary = route?.summary || props?.summary || {};
  const geometry = route?.geometry;
  
  console.log('[ORS] Geometry type:', typeof geometry, geometry ? geometry.substring?.(0, 50) : geometry);
  
  let polylineCoords = [];
  
  // Check if geometry.coordinates exists (array format)
  if (geometry?.coordinates && Array.isArray(geometry.coordinates)) {
    polylineCoords = toLatLngArray(geometry.coordinates);
    console.log('[ORS] Using coordinate array, polyline length:', polylineCoords.length);
  } 
  // If geometry is a string, it's encoded - decode it
  else if (typeof geometry === 'string') {
    console.log('[ORS] Decoding encoded polyline...');
    // @mapbox/polyline returns [[lat, lng], [lat, lng], ...] format
    const decoded = polyline.decode(geometry);
    polylineCoords = decoded.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
    console.log('[ORS] Decoded polyline length:', polylineCoords.length);
  }
  else {
    console.warn('[ORS] No valid geometry found in response');
  }

  return {
    distance: summary?.distance ?? props?.distance ?? 0, // meters
    duration: summary?.duration ?? props?.duration ?? 0, // seconds
    segments: props?.segments ?? route?.segments ?? [],
    wayPoints: props?.way_points ?? route?.way_points ?? [],
    polyline: polylineCoords,
    raw: data,
  };
}
