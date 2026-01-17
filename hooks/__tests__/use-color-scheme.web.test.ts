/**
 * Tests for hooks/use-color-scheme.web.ts
 * Tests for web-specific color scheme hook with hydration
 */

describe('useColorScheme.web', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should export a useColorScheme function', () => {
    const { useColorScheme } = require('../use-color-scheme.web');
    expect(typeof useColorScheme).toBe('function');
  });

  it('should be a valid React hook', () => {
    const { useColorScheme } = require('../use-color-scheme.web');
    // Hook should be a function that can be called
    expect(useColorScheme.name).toBe('useColorScheme');
  });
});
