/**
 * Tests for HelloWave component
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

// Mock react-native-reanimated with proper Animated namespace
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { Text } = require('react-native');
  
  const AnimatedText = React.forwardRef((props, ref) => 
    React.createElement(Text, { ...props, ref }, props.children)
  );
  
  const mockReanimated = {
    Text: AnimatedText,
    View: React.forwardRef((props, ref) => {
      const { View } = require('react-native');
      return React.createElement(View, { ...props, ref }, props.children);
    }),
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn(),
    withSpring: jest.fn(),
    withRepeat: jest.fn(),
  };
  
  // Default export is the Animated namespace
  mockReanimated.default = mockReanimated;
  
  return mockReanimated;
});

import { render } from '@testing-library/react-native';
import { HelloWave } from '../hello-wave';

describe('HelloWave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render wave emoji', () => {
      const { getByText } = render(<HelloWave />);
      
      expect(getByText('👋')).toBeTruthy();
    });

    it('should render animated text component', () => {
      const { toJSON } = render(<HelloWave />);
      
      const tree = toJSON();
      expect(tree).toBeTruthy();
      expect(tree.type).toBe('Text');
    });

    it('should apply animation styles', () => {
      const { toJSON } = render(<HelloWave />);
      
      const tree = toJSON();
      expect(tree.props.style).toBeDefined();
      expect(tree.props.style.fontSize).toBe(28);
      expect(tree.props.style.lineHeight).toBe(32);
    });

    it('should have correct margin styling', () => {
      const { toJSON } = render(<HelloWave />);
      
      const tree = toJSON();
      expect(tree.props.style.marginTop).toBe(-6);
    });
  });

  describe('Animation Properties', () => {
    it('should have animation name property for keyframe animation', () => {
      const { toJSON } = render(<HelloWave />);
      
      const tree = toJSON();
      // The component has animationName for CSS-style keyframes
      expect(tree.props.style.animationName).toBeDefined();
    });

    it('should have animation iteration count of 4', () => {
      const { toJSON } = render(<HelloWave />);
      
      const tree = toJSON();
      expect(tree.props.style.animationIterationCount).toBe(4);
    });

    it('should have animation duration of 300ms', () => {
      const { toJSON } = render(<HelloWave />);
      
      const tree = toJSON();
      expect(tree.props.style.animationDuration).toBe('300ms');
    });
  });
});
