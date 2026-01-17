/**
 * Tests for hooks/use-color-scheme.ts
 * Basic tests for color scheme hook
 */

describe('useColorScheme', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should export useColorScheme from react-native', () => {
    const { useColorScheme } = require('../use-color-scheme');
    expect(useColorScheme).toBeDefined();
    expect(typeof useColorScheme).toBe('function');
  });
});
