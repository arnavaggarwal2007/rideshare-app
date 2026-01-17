/**
 * Tests for services/maps/utils.js
 */

import { calculateRegionFromCoordinates, formatCoordinates } from '../utils';

describe('Map Utils', () => {
  describe('calculateRegionFromCoordinates', () => {
    it('should return region object with provided coordinates', () => {
      const result = calculateRegionFromCoordinates(34.0522, -118.2437);
      
      expect(result).toEqual({
        latitude: 34.0522,
        longitude: -118.2437,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    });

    it('should use custom latitude delta when provided', () => {
      const result = calculateRegionFromCoordinates(34.0522, -118.2437, 0.1);
      
      expect(result.latitudeDelta).toBe(0.1);
      expect(result.longitudeDelta).toBe(0.05); // default
    });

    it('should use custom longitude delta when provided', () => {
      const result = calculateRegionFromCoordinates(34.0522, -118.2437, 0.05, 0.15);
      
      expect(result.longitudeDelta).toBe(0.15);
    });

    it('should use both custom deltas when provided', () => {
      const result = calculateRegionFromCoordinates(40.7128, -74.0060, 0.2, 0.3);
      
      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        latitudeDelta: 0.2,
        longitudeDelta: 0.3,
      });
    });

    it('should handle zero coordinates', () => {
      const result = calculateRegionFromCoordinates(0, 0);
      
      expect(result.latitude).toBe(0);
      expect(result.longitude).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const result = calculateRegionFromCoordinates(-33.8688, 151.2093);
      
      expect(result.latitude).toBe(-33.8688);
      expect(result.longitude).toBe(151.2093);
    });
  });

  describe('formatCoordinates', () => {
    it('should format coordinates to 5 decimal places', () => {
      const result = formatCoordinates(34.052235, -118.243683);
      
      expect(result).toBe('34.05224, -118.24368');
    });

    it('should pad coordinates with zeros if needed', () => {
      const result = formatCoordinates(34.1, -118.2);
      
      expect(result).toBe('34.10000, -118.20000');
    });

    it('should handle negative coordinates', () => {
      const result = formatCoordinates(-33.868820, 151.209296);
      
      expect(result).toBe('-33.86882, 151.20930');
    });

    it('should handle zero coordinates', () => {
      const result = formatCoordinates(0, 0);
      
      expect(result).toBe('0.00000, 0.00000');
    });

    it('should round coordinates correctly', () => {
      const result = formatCoordinates(34.0522359999, -118.2436833333);
      
      expect(result).toBe('34.05224, -118.24368');
    });
  });
});
