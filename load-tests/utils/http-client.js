/**
 * Custom HTTP Client Wrapper for RideBoard Load Tests
 * Provides retry logic, logging, and error handling
 */

import { sleep } from 'k6';
import http from 'k6/http';

const DEFAULT_TIMEOUT = '30s';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1;

/**
 * HTTP client with retry and logging
 */
export class HttpClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || __ENV.API_BASE_URL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries || MAX_RETRIES;
    this.debug = options.debug || __ENV.DEBUG === 'true';
  }

  /**
   * Set authorization token
   */
  setAuthToken(token) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Build full URL
   */
  buildUrl(path) {
    if (path.startsWith('http')) {
      return path;
    }
    return `${this.baseUrl}${path}`;
  }

  /**
   * Log request/response if debug enabled
   */
  log(method, url, response, duration) {
    if (this.debug) {
      console.log(`[${method}] ${url} - ${response.status} (${duration}ms)`);
    }
  }

  /**
   * GET request with retries
   */
  get(path, params = {}) {
    return this.request('GET', path, null, params);
  }

  /**
   * POST request with retries
   */
  post(path, body, params = {}) {
    return this.request('POST', path, body, params);
  }

  /**
   * PUT request with retries
   */
  put(path, body, params = {}) {
    return this.request('PUT', path, body, params);
  }

  /**
   * DELETE request with retries
   */
  delete(path, params = {}) {
    return this.request('DELETE', path, null, params);
  }

  /**
   * PATCH request with retries
   */
  patch(path, body, params = {}) {
    return this.request('PATCH', path, body, params);
  }

  /**
   * Generic request with retry logic
   */
  request(method, path, body, params = {}) {
    const url = this.buildUrl(path);
    const headers = { ...this.defaultHeaders, ...params.headers };
    const requestParams = {
      headers,
      timeout: params.timeout || this.timeout,
      tags: params.tags || {},
    };

    let response;
    let attempts = 0;
    let lastError;

    while (attempts < this.maxRetries) {
      attempts++;
      const startTime = new Date().getTime();

      try {
        switch (method) {
          case 'GET':
            response = http.get(url, requestParams);
            break;
          case 'POST':
            response = http.post(url, JSON.stringify(body), requestParams);
            break;
          case 'PUT':
            response = http.put(url, JSON.stringify(body), requestParams);
            break;
          case 'DELETE':
            response = http.del(url, null, requestParams);
            break;
          case 'PATCH':
            response = http.patch(url, JSON.stringify(body), requestParams);
            break;
          default:
            throw new Error(`Unknown method: ${method}`);
        }

        const duration = new Date().getTime() - startTime;
        this.log(method, url, response, duration);

        // Success or non-retryable error
        if (response.status < 500 && response.status !== 429) {
          return response;
        }

        // Retryable error (5xx or 429)
        if (attempts < this.maxRetries) {
          const backoff = RETRY_DELAY * Math.pow(2, attempts - 1);
          if (this.debug) {
            console.log(`Retry ${attempts}/${this.maxRetries} after ${backoff}s`);
          }
          sleep(backoff);
        }
      } catch (error) {
        lastError = error;
        if (attempts < this.maxRetries) {
          sleep(RETRY_DELAY);
        }
      }
    }

    // Return last response or throw error
    if (response) {
      return response;
    }
    throw lastError || new Error('Request failed after retries');
  }
}

/**
 * Create a pre-configured client instance
 */
export function createClient(options = {}) {
  return new HttpClient({
    baseUrl: __ENV.API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN || ''}`,
    },
    ...options,
  });
}

/**
 * Simple request helpers (no retry)
 */
export function simpleGet(url, headers = {}) {
  return http.get(url, { headers });
}

export function simplePost(url, body, headers = {}) {
  return http.post(url, JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export default { HttpClient, createClient, simpleGet, simplePost };
