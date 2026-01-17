/**
 * Tests for services/maps/geocoding.js
 */

describe('geocoding service', () => {
	let searchAddress, reverseGeocode, debounce, debouncedSearchAddress;

	beforeEach(() => {
		jest.resetModules();
		jest.useFakeTimers();
		global.fetch = jest.fn();
		
		// Import after setting up mocks
		const geocoding = require('../geocoding');
		searchAddress = geocoding.searchAddress;
		reverseGeocode = geocoding.reverseGeocode;
		debounce = geocoding.debounce;
		debouncedSearchAddress = geocoding.debouncedSearchAddress;
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.clearAllTimers();
		jest.useRealTimers();
	});

	describe('debounce', () => {
		it('should debounce function calls', () => {
			const mockFn = jest.fn();
			const debouncedFn = debounce(mockFn, 300);

			debouncedFn('arg1');
			debouncedFn('arg2');
			debouncedFn('arg3');

			expect(mockFn).not.toHaveBeenCalled();

			jest.advanceTimersByTime(300);

			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(mockFn).toHaveBeenCalledWith('arg3');
		});

		it('should reset timer on each call', () => {
			const mockFn = jest.fn();
			const debouncedFn = debounce(mockFn, 300);

			debouncedFn('first');
			jest.advanceTimersByTime(200);
			debouncedFn('second');
			jest.advanceTimersByTime(200);
			debouncedFn('third');
			jest.advanceTimersByTime(300);

			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(mockFn).toHaveBeenCalledWith('third');
		});
	});

	describe('reverseGeocode', () => {
		it('should return null for missing coordinates', async () => {
			const result1 = reverseGeocode(null, -74.006);
			const result2 = reverseGeocode(40.7128, null);
			const result3 = reverseGeocode(undefined, undefined);
			
			expect(await result1).toBeNull();
			expect(await result2).toBeNull();
			expect(await result3).toBeNull();
		});

		it('should make correct API request', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					display_name: '123 Main St, New York, NY',
					lat: '40.7128',
					lon: '-74.006',
				}),
			});

			const promise = reverseGeocode(40.7128, -74.006);
			await jest.runAllTimersAsync();
			await promise;

			expect(global.fetch).toHaveBeenCalledWith(
				'https://nominatim.openstreetmap.org/reverse?format=json&lat=40.7128&lon=-74.006',
				expect.objectContaining({
					headers: { 'User-Agent': 'rideshare-app/1.0' },
				})
			);
		});

		it('should return formatted result on success', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					display_name: '123 Main St, New York, NY',
					lat: '40.7128',
					lon: '-74.006',
				}),
			});

			const promise = reverseGeocode(40.7128, -74.006);
			await jest.runAllTimersAsync();
			const result = await promise;

			expect(result).toEqual({
				address: '123 Main St, New York, NY',
				coordinates: {
					latitude: 40.7128,
					longitude: -74.006,
				},
				placeName: '123 Main St, New York, NY',
			});
		});

		it('should return null on API error response', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ error: 'Unable to geocode' }),
			});

			const promise = reverseGeocode(40.7128, -74.006);
			await jest.runAllTimersAsync();
			const result = await promise;

			expect(result).toBeNull();
		});

		it('should return null on fetch error after retries', async () => {
			// Mock all retry attempts to fail
			global.fetch.mockRejectedValue(new Error('Network error'));

			const promise = reverseGeocode(40.7128, -74.006);
			await jest.runAllTimersAsync();
			const result = await promise;

			expect(result).toBeNull();
		});
	});

	describe('searchAddress', () => {
		it('should return empty array for empty query', async () => {
			expect(await searchAddress('')).toEqual([]);
			expect(await searchAddress('   ')).toEqual([]);
			expect(await searchAddress(null)).toEqual([]);
			expect(await searchAddress(undefined)).toEqual([]);
		});

		it('should make correct API request', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve([]),
			});

			const promise = searchAddress('New York');
			await jest.runAllTimersAsync();
			await promise;

			expect(global.fetch).toHaveBeenCalledWith(
				'https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=New%20York',
				expect.objectContaining({
					headers: { 'User-Agent': 'rideshare-app/1.0' },
				})
			);
		});

		it('should return formatted results on success', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve([
					{
						display_name: 'New York, NY, USA',
						lat: '40.7128',
						lon: '-74.006',
					},
					{
						display_name: 'New York City, NY, USA',
						lat: '40.7589',
						lon: '-73.9851',
					},
				]),
			});

			const promise = searchAddress('New York');
			await jest.runAllTimersAsync();
			const results = await promise;

			expect(results).toHaveLength(2);
			expect(results[0]).toEqual({
				address: 'New York, NY, USA',
				coordinates: {
					latitude: 40.7128,
					longitude: -74.006,
				},
				placeName: 'New York, NY, USA',
			});
		});

		it('should return user-friendly error on 503 after retries', async () => {
			// All retries fail with 503
			global.fetch.mockRejectedValue(new Error('503 Service Unavailable'));

			const promise = searchAddress('Test');
			await jest.runAllTimersAsync();
			const result = await promise;

			expect(result.error).toContain('temporarily unavailable');
		});

		it('should return user-friendly error on 429 after retries', async () => {
			// All retries fail with 429
			global.fetch.mockRejectedValue(new Error('429 Too Many Requests'));

			const promise = searchAddress('Test');
			await jest.runAllTimersAsync();
			const result = await promise;

			expect(result.error).toContain('Too many requests');
		});

		it('should return user-friendly error on 500 after retries', async () => {
			// All retries fail with 500
			global.fetch.mockRejectedValue(new Error('500 Internal Server Error'));

			const promise = searchAddress('Test');
			await jest.runAllTimersAsync();
			const result = await promise;

			expect(result.error).toContain('encountered an error');
		});

		it('should return user-friendly error on network error after retries', async () => {
			global.fetch.mockRejectedValue(new Error('Network failed'));

			const promise = searchAddress('Test');
			await jest.runAllTimersAsync();
			const result = await promise;

			// After retries fail, any generic error message is acceptable
			expect(result.error).toBeDefined();
		});

		it('should return generic error on unknown error after retries', async () => {
			global.fetch.mockRejectedValue(new Error('Some random error'));

			const promise = searchAddress('Test');
			await jest.runAllTimersAsync();
			const result = await promise;

			expect(result.error).toContain('Unable to search');
		});
	});

	describe('retry logic', () => {
		it('should retry on 500 error and succeed', async () => {
			// First call fails with 500, second succeeds
			global.fetch
				.mockResolvedValueOnce({ ok: false, status: 500 })
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve([{ display_name: 'Test', lat: '40', lon: '-74' }]),
				});

			const promise = searchAddress('Test');
			await jest.runAllTimersAsync();
			const results = await promise;

			expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
			expect(results).toHaveLength(1);
		});

		it('should retry on 429 rate limit and succeed', async () => {
			global.fetch
				.mockResolvedValueOnce({ ok: false, status: 429 })
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve([]),
				});

			const promise = searchAddress('Test');
			await jest.runAllTimersAsync();
			await promise;

			expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
		});

		it('should not retry on 400 client error', async () => {
			// 400 errors are not retryable - should fail immediately with error thrown
			global.fetch.mockResolvedValue({ ok: false, status: 400 });

			const promise = searchAddress('Test');
			await jest.runAllTimersAsync();
			const result = await promise;

			// Should return error after failing (400 throws, not retryable per isRetryableError)
			expect(result.error).toBeDefined();
		});
	});
});
