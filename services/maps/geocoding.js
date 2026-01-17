// Simple debounce utility
export function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 4000,
  backoffMultiplier: 2,
};

// Helper: sleep for a given number of milliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Check if error is retryable (5xx errors, network errors)
const isRetryableError = (status) => {
  return status >= 500 || status === 429; // Server errors or rate limiting
};

// Fetch with exponential backoff retry
async function fetchWithRetry(url, options = {}, config = RETRY_CONFIG) {
  let lastError = null;
  let delayMs = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      
      if (res.ok) {
        return res;
      }

      // Check if we should retry this error
      if (isRetryableError(res.status) && attempt < config.maxRetries) {
        console.warn(`[Geocoding] Attempt ${attempt + 1} failed with status ${res.status}, retrying in ${delayMs}ms...`);
        await sleep(delayMs);
        delayMs = Math.min(delayMs * config.backoffMultiplier, config.maxDelayMs);
        continue;
      }

      // Non-retryable error or out of retries
      throw new Error(`Nominatim error: ${res.status}`);
    } catch (error) {
      lastError = error;
      
      // Network errors are retryable
      if (attempt < config.maxRetries && error.name !== 'AbortError') {
        console.warn(`[Geocoding] Attempt ${attempt + 1} failed with error, retrying in ${delayMs}ms...`, error.message);
        await sleep(delayMs);
        delayMs = Math.min(delayMs * config.backoffMultiplier, config.maxDelayMs);
        continue;
      }
      
      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// User-friendly error messages
function getGeocodingErrorMessage(error) {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  if (errorMessage.includes('503') || errorMessage.includes('service unavailable')) {
    return 'Location service is temporarily unavailable. Please try again in a moment.';
  }
  if (errorMessage.includes('429') || errorMessage.includes('too many requests')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (errorMessage.includes('500')) {
    return 'Location service encountered an error. Please try again.';
  }
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  return 'Unable to search for locations. Please try again.';
}

// Debounced version of searchAddress (400ms)
export const debouncedSearchAddress = debounce(searchAddress, 400);

// OSM Nominatim Reverse Geocoding Service
// Converts coordinates to address
export async function reverseGeocode(latitude, longitude) {
  if (!latitude || !longitude) return null;
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
  try {
    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'rideshare-app/1.0' },
    });
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
// Also returns { error: string } if there's a user-facing error

export async function searchAddress(query) {
  if (!query || !query.trim()) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'rideshare-app/1.0' },
    });
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
    // Return error object that can be shown to user
    return { error: getGeocodingErrorMessage(error), results: [] };
  }
}
