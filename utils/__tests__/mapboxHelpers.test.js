/**
 * Tests for utils/mapboxHelpers.js
 */

import {
	generateSearchKeyword,
	lngLatToLatLng,
	latLngToLngLat,
} from '../mapboxHelpers';

describe('mapboxHelpers', () => {
	describe('generateSearchKeyword', () => {
		it('should return empty string for null place', () => {
			expect(generateSearchKeyword(null)).toBe('');
		});

		it('should return empty string for undefined place', () => {
			expect(generateSearchKeyword(undefined)).toBe('');
		});

		it('should generate keyword from full place object', () => {
			const place = {
				name: 'Central Park',
				address: '59th St',
				city: 'New York',
				state: 'NY',
				country: 'USA',
			};
			expect(generateSearchKeyword(place)).toBe('Central Park, 59th St, New York, NY, USA');
		});

		it('should handle partial place object', () => {
			const place = {
				name: 'Times Square',
				city: 'New York',
			};
			expect(generateSearchKeyword(place)).toBe('Times Square, New York');
		});

		it('should handle place with only name', () => {
			const place = { name: 'Statue of Liberty' };
			expect(generateSearchKeyword(place)).toBe('Statue of Liberty');
		});

		it('should handle empty place object', () => {
			expect(generateSearchKeyword({})).toBe('');
		});

		it('should filter out falsy values', () => {
			const place = {
				name: 'Test',
				address: '',
				city: null,
				state: undefined,
				country: 'USA',
			};
			expect(generateSearchKeyword(place)).toBe('Test, USA');
		});
	});

	describe('lngLatToLatLng', () => {
		it('should convert [lng, lat] array to {lat, lng} object', () => {
			const result = lngLatToLatLng([-74.006, 40.7128]);
			expect(result).toEqual({ lat: 40.7128, lng: -74.006 });
		});

		it('should handle zero values', () => {
			const result = lngLatToLatLng([0, 0]);
			expect(result).toEqual({ lat: 0, lng: 0 });
		});

		it('should handle negative coordinates', () => {
			const result = lngLatToLatLng([-122.4194, -37.7749]);
			expect(result).toEqual({ lat: -37.7749, lng: -122.4194 });
		});
	});

	describe('latLngToLngLat', () => {
		it('should convert {lat, lng} object to [lng, lat] array', () => {
			const result = latLngToLngLat({ lat: 40.7128, lng: -74.006 });
			expect(result).toEqual([-74.006, 40.7128]);
		});

		it('should handle zero values', () => {
			const result = latLngToLngLat({ lat: 0, lng: 0 });
			expect(result).toEqual([0, 0]);
		});

		it('should handle negative coordinates', () => {
			const result = latLngToLngLat({ lat: -37.7749, lng: -122.4194 });
			expect(result).toEqual([-122.4194, -37.7749]);
		});
	});

	describe('round-trip conversion', () => {
		it('should be reversible (lngLat -> latLng -> lngLat)', () => {
			const original = [-74.006, 40.7128];
			const intermediate = lngLatToLatLng(original);
			const result = latLngToLngLat(intermediate);
			expect(result).toEqual(original);
		});

		it('should be reversible (latLng -> lngLat -> latLng)', () => {
			const original = { lat: 40.7128, lng: -74.006 };
			const intermediate = latLngToLngLat(original);
			const result = lngLatToLatLng(intermediate);
			expect(result).toEqual(original);
		});
	});
});
