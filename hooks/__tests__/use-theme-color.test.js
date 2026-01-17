/**
 * Tests for hooks/use-theme-color.ts
 */

// Mock use-color-scheme hook
let mockColorScheme = 'light';
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => mockColorScheme),
}));

// Mock theme constants
jest.mock('@/constants/theme', () => ({
  Colors: {
    light: {
      text: '#11181C',
      background: '#ffffff',
      tint: '#0a7ea4',
      icon: '#687076',
    },
    dark: {
      text: '#ECEDEE',
      background: '#151718',
      tint: '#ffffff',
      icon: '#9BA1A6',
    },
  },
}));

import { useThemeColor } from '../use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';

describe('useThemeColor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockColorScheme = 'light';
  });

  describe('with light theme', () => {
    beforeEach(() => {
      mockColorScheme = 'light';
      useColorScheme.mockReturnValue('light');
    });

    it('should return light color from props when provided', () => {
      const result = useThemeColor({ light: '#ff0000', dark: '#0000ff' }, 'text');
      
      expect(result).toBe('#ff0000');
    });

    it('should return color from theme when props not provided', () => {
      const result = useThemeColor({}, 'text');
      
      expect(result).toBe('#11181C');
    });

    it('should return background color', () => {
      const result = useThemeColor({}, 'background');
      
      expect(result).toBe('#ffffff');
    });

    it('should return tint color', () => {
      const result = useThemeColor({}, 'tint');
      
      expect(result).toBe('#0a7ea4');
    });
  });

  describe('with dark theme', () => {
    beforeEach(() => {
      mockColorScheme = 'dark';
      useColorScheme.mockReturnValue('dark');
    });

    it('should return dark color from props when provided', () => {
      const result = useThemeColor({ light: '#ff0000', dark: '#0000ff' }, 'text');
      
      expect(result).toBe('#0000ff');
    });

    it('should return color from dark theme when props not provided', () => {
      const result = useThemeColor({}, 'text');
      
      expect(result).toBe('#ECEDEE');
    });

    it('should return dark background color', () => {
      const result = useThemeColor({}, 'background');
      
      expect(result).toBe('#151718');
    });

    it('should return dark tint color', () => {
      const result = useThemeColor({}, 'tint');
      
      expect(result).toBe('#ffffff');
    });
  });

  describe('with undefined color scheme', () => {
    it('should default to light theme when scheme is undefined', () => {
      useColorScheme.mockReturnValue(undefined);
      
      const result = useThemeColor({}, 'text');
      
      // Should fallback to light
      expect(result).toBe('#11181C');
    });

    it('should default to light theme when scheme is null', () => {
      useColorScheme.mockReturnValue(null);
      
      const result = useThemeColor({}, 'text');
      
      expect(result).toBe('#11181C');
    });
  });

  describe('with partial props', () => {
    it('should return light prop when only light is provided', () => {
      useColorScheme.mockReturnValue('light');
      
      const result = useThemeColor({ light: '#custom' }, 'text');
      
      expect(result).toBe('#custom');
    });

    it('should return theme color when light prop is undefined and scheme is light', () => {
      useColorScheme.mockReturnValue('light');
      
      const result = useThemeColor({ dark: '#custom' }, 'text');
      
      expect(result).toBe('#11181C');
    });

    it('should return dark prop when only dark is provided and scheme is dark', () => {
      useColorScheme.mockReturnValue('dark');
      
      const result = useThemeColor({ dark: '#custom' }, 'text');
      
      expect(result).toBe('#custom');
    });
  });
});
