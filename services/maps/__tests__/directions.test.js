/**
 * Tests for services/maps/directions.js
 */

// Mock the polyline module
jest.mock('@mapbox/polyline', () => ({
	decode: jest.fn((encoded) => [[40.7, -74.0], [40.8, -74.1]]),
}));

// Mock the env variable
const originalEnv = process.env;

beforeEach(() => {
	jest.resetModules();
	process.env = { ...originalEnv, EXPO_PUBLIC_ORS_KEY: 'test-api-key' };
	global.fetch = jest.fn();
});

afterEach(() => {
	process.env = originalEnv;
	jest.clearAllMocks();
});

describe('directions service', () => {
	const mockStart = { latitude: 40.7128, longitude: -74.0060 };
	const mockEnd = { latitude: 40.7580, longitude: -73.9855 };

	describe('getDirections', () => {
		it('should throw error when API key is missing', async () => {
			process.env.EXPO_PUBLIC_ORS_KEY = '';
			
			// Re-import to get fresh module with new env
			jest.resetModules();
			const { getDirections } = require('../directions');

			await expect(getDirections(mockStart, mockEnd))
				.rejects.toThrow('Missing EXPO_PUBLIC_ORS_KEY');
		});

		it('should make correct API request', async () => {
			const { getDirections } = require('../directions');
			
			const mockResponse = {
				features: [{
					properties: {
						distance: 5000,
						duration: 600,
						segments: [],
						way_points: [0, 1],
					},
					geometry: {
						coordinates: [[-74.006, 40.7128], [-73.9855, 40.758]],
					},
				}],
			};

			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			await getDirections(mockStart, mockEnd);

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.openrouteservice.org/v2/directions/driving-car',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Authorization': 'test-api-key',
						'Content-Type': 'application/json',
					}),
				})
			);
		});

		it('should handle geojson features format response', async () => {
			const { getDirections } = require('../directions');
			
			const mockResponse = {
				features: [{
					properties: {
						distance: 5000,
						duration: 600,
						segments: [{ distance: 1000 }],
						way_points: [0, 1],
					},
					geometry: {
						coordinates: [[-74.006, 40.7128], [-73.9855, 40.758]],
					},
				}],
			};

			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await getDirections(mockStart, mockEnd);

			expect(result.distance).toBe(5000);
			expect(result.duration).toBe(600);
			expect(result.polyline).toHaveLength(2);
			expect(result.polyline[0]).toEqual({ latitude: 40.7128, longitude: -74.006 });
		});

		it('should handle json routes format response', async () => {
			const { getDirections } = require('../directions');
			
			const mockResponse = {
				routes: [{
					summary: {
						distance: 3000,
						duration: 300,
					},
					segments: [],
					way_points: [0, 1],
					geometry: {
						coordinates: [[-74.006, 40.7128]],
					},
				}],
			};

			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await getDirections(mockStart, mockEnd);

			expect(result.distance).toBe(3000);
			expect(result.duration).toBe(300);
		});

		it('should handle encoded polyline geometry', async () => {
			const { getDirections } = require('../directions');
			const polyline = require('@mapbox/polyline');
			
			const mockResponse = {
				features: [{
					properties: {
						distance: 5000,
						duration: 600,
					},
					geometry: 'encodedPolylineString',
				}],
			};

			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await getDirections(mockStart, mockEnd);

			expect(polyline.decode).toHaveBeenCalledWith('encodedPolylineString');
			expect(result.polyline).toHaveLength(2);
		});

		it('should handle missing geometry gracefully', async () => {
			const { getDirections } = require('../directions');
			
			const mockResponse = {
				features: [{
					properties: {
						distance: 5000,
						duration: 600,
					},
					geometry: null,
				}],
			};

			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await getDirections(mockStart, mockEnd);

			expect(result.polyline).toEqual([]);
		});

		it('should throw error on API error response', async () => {
			const { getDirections } = require('../directions');
			
			global.fetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				text: () => Promise.resolve('Invalid coordinates'),
			});

			await expect(getDirections(mockStart, mockEnd))
				.rejects.toThrow('OpenRouteService error 400');
		});

		it('should throw error when no route found', async () => {
			const { getDirections } = require('../directions');
			
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ features: [], routes: [] }),
			});

			await expect(getDirections(mockStart, mockEnd))
				.rejects.toThrow('OpenRouteService returned no routes');
		});

		it('should include error detail in no route error', async () => {
			const { getDirections } = require('../directions');
			
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ 
					error: { message: 'Route not found between points' } 
				}),
			});

			await expect(getDirections(mockStart, mockEnd))
				.rejects.toThrow('Route not found between points');
		});

		it('should use custom profile', async () => {
			const { getDirections } = require('../directions');
			
			const mockResponse = {
				features: [{
					properties: { distance: 1000, duration: 100 },
					geometry: { coordinates: [] },
				}],
			};

			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			await getDirections(mockStart, mockEnd, 'cycling-regular');

			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.openrouteservice.org/v2/directions/cycling-regular',
				expect.any(Object)
			);
		});

		it('should handle text() error in error response', async () => {
			const { getDirections } = require('../directions');
			
			global.fetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Server Error',
				text: () => Promise.reject(new Error('Failed to read body')),
			});

			await expect(getDirections(mockStart, mockEnd))
				.rejects.toThrow('OpenRouteService error 500');
		});

		it('should return raw data in response', async () => {
			const { getDirections } = require('../directions');
			
			const mockResponse = {
				features: [{
					properties: { distance: 5000, duration: 600 },
					geometry: { coordinates: [] },
				}],
				metadata: { some: 'data' },
			};

			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await getDirections(mockStart, mockEnd);

			expect(result.raw).toEqual(mockResponse);
		});

		it('should handle fallback values for missing summary', async () => {
			const { getDirections } = require('../directions');
			
			const mockResponse = {
				features: [{
					properties: {},
					geometry: { coordinates: [] },
				}],
			};

			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await getDirections(mockStart, mockEnd);

			expect(result.distance).toBe(0);
			expect(result.duration).toBe(0);
			expect(result.segments).toEqual([]);
			expect(result.wayPoints).toEqual([]);
		});
	});
});
