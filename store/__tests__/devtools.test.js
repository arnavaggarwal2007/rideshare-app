/**
 * Tests for store/devtools.js
 * Tests Redux DevTools configuration
 */

describe('devtools', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should export a function', () => {
    const composeWithDevTools = require('../devtools').default;
    expect(typeof composeWithDevTools).toBe('function');
  });

  it('should return the input when passed a config object', () => {
    const composeWithDevTools = require('../devtools').default;
    const config = { reducer: jest.fn() };
    const result = composeWithDevTools(config);
    expect(result).toEqual(config);
  });

  it('should handle undefined input gracefully', () => {
    const composeWithDevTools = require('../devtools').default;
    expect(() => composeWithDevTools(undefined)).not.toThrow();
  });
});
