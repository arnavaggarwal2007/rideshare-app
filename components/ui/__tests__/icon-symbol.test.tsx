/**
 * Tests for components/ui/icon-symbol.tsx
 * Basic tests for IconSymbol component
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// Mock expo-symbols for iOS version
jest.mock('expo-symbols', () => ({
  SymbolView: ({ name, style }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: `symbol-${name}`, style });
  },
}));

// Import after mocking
import { IconSymbol } from '../icon-symbol';

describe('IconSymbol', () => {
  it('should render an icon component', () => {
    const { toJSON } = render(
      <IconSymbol name="house.fill" color="#000" />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should accept size prop', () => {
    const { toJSON } = render(
      <IconSymbol name="house.fill" color="#000" size={32} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should accept style prop', () => {
    const { toJSON } = render(
      <IconSymbol name="house.fill" color="#000" style={{ margin: 10 }} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should accept weight prop', () => {
    const { toJSON } = render(
      <IconSymbol name="house.fill" color="#000" weight="bold" />
    );
    expect(toJSON()).toBeTruthy();
  });
});
