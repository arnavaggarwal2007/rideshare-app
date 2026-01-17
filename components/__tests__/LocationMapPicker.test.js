/**
 * Tests for LocationMapPicker Component
 * Tests map interaction, pickup/dropoff selection, and detour validation
 */

// Mock react-native-maps before any imports
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  
  const MockMapView = React.forwardRef(({ children, onPress, onMapReady, style, initialRegion }, ref) => {
    React.useImperativeHandle(ref, () => ({
      fitToCoordinates: jest.fn(),
    }));

    React.useEffect(() => {
      if (onMapReady) {
        onMapReady();
      }
    }, [onMapReady]);

    return (
      <View style={style} testID="map-view">
        <Text testID="map-region">{JSON.stringify(initialRegion)}</Text>
        {children}
        <View testID="map-press-area" onTouchEnd={() => {
          if (onPress) {
            onPress({
              nativeEvent: {
                coordinate: { latitude: 34.05, longitude: -118.25 }
              }
            });
          }
        }} />
      </View>
    );
  });

  const MockMarker = ({ coordinate, title, children, pinColor }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={`marker-${title}`}>
        <Text>{title}</Text>
        <Text testID={`marker-coords-${title}`}>{coordinate.latitude},{coordinate.longitude}</Text>
        {children}
      </View>
    );
  };

  const MockPolyline = ({ coordinates, strokeColor }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="polyline">
        <Text>Route with {coordinates.length} points</Text>
      </View>
    );
  };

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
  };
});

// Mock ThemedText
jest.mock('../themed-text', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ThemedText: ({ children, style }) => <Text style={style}>{children}</Text>,
  };
});

import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';

import LocationMapPicker from '../LocationMapPicker';

// Mock data
const mockRideRoute = [
  { latitude: 34.0522, longitude: -118.2437 },
  { latitude: 34.0400, longitude: -118.2600 },
  { latitude: 34.0200, longitude: -118.2800 },
];

const mockStartLocation = {
  coordinates: { latitude: 34.0522, longitude: -118.2437 },
  placeName: 'Downtown LA',
};

const mockEndLocation = {
  coordinates: { latitude: 34.0200, longitude: -118.2800 },
  placeName: 'Santa Monica',
};

describe('LocationMapPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders map view', () => {
      const { getByTestId } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      expect(getByTestId('map-view')).toBeTruthy();
    });

    it('renders selection mode buttons', () => {
      const { getByText } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      expect(getByText('Set Pickup')).toBeTruthy();
      expect(getByText('Set Dropoff')).toBeTruthy();
    });

    it('renders reset button', () => {
      const { getByText } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      expect(getByText('Reset')).toBeTruthy();
    });

    it('renders instructions', () => {
      const { getByText } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      expect(getByText('How to use:')).toBeTruthy();
      expect(getByText(/Choose/)).toBeTruthy();
    });

    it('renders ride route polyline', () => {
      const { getByTestId } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      expect(getByTestId('polyline')).toBeTruthy();
    });

    it('renders start location marker', () => {
      const { getByTestId } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      expect(getByTestId('marker-Ride Start')).toBeTruthy();
    });

    it('renders end location marker', () => {
      const { getByTestId } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      expect(getByTestId('marker-Ride End')).toBeTruthy();
    });
  });

  describe('Initial Region', () => {
    it('uses ride route midpoint when route available', () => {
      const { getByTestId } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      const region = getByTestId('map-region');
      const regionData = JSON.parse(region.props.children);
      
      expect(regionData.latitude).toBe(34.04);
      expect(regionData.longitude).toBe(-118.26);
    });

    it('uses start location when no route', () => {
      const { getByTestId } = render(
        <LocationMapPicker
          rideRoute={[]}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      const region = getByTestId('map-region');
      const regionData = JSON.parse(region.props.children);
      
      expect(regionData.latitude).toBe(34.0522);
    });

    it('uses default region when no route or start location', () => {
      const { getByTestId } = render(
        <LocationMapPicker
          rideRoute={[]}
          startLocation={null}
          endLocation={null}
        />
      );

      const region = getByTestId('map-region');
      const regionData = JSON.parse(region.props.children);
      
      expect(regionData.latitude).toBe(39.8283);
      expect(regionData.latitudeDelta).toBe(20);
    });
  });

  describe('Selection Mode', () => {
    it('starts in pickup mode', () => {
      const { getByText } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      expect(getByText('Tap to select pickup location')).toBeTruthy();
    });

    it('switches to dropoff mode when button pressed', () => {
      const { getByText, getByTestId } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      // First set a pickup location so we can see the mode switch
      fireEvent(getByTestId('map-press-area'), 'touchEnd');

      act(() => {
        jest.runAllTimers();
      });

      // Now switch back to pickup mode (currently in dropoff after auto-switch)
      fireEvent.press(getByText('Set Pickup'));
      
      // Switch to dropoff mode again
      fireEvent.press(getByText('Set Dropoff'));

      // The Set Dropoff button should be active - verify by checking for dropoff marker prompt
      expect(getByText('Tap to select dropoff location')).toBeTruthy();
    });

    it('switches back to pickup mode', () => {
      const { getByText } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      fireEvent.press(getByText('Set Dropoff'));
      fireEvent.press(getByText('Set Pickup'));

      expect(getByText('Tap to select pickup location')).toBeTruthy();
    });
  });

  describe('Location Selection', () => {
    it('sets pickup location on map press in pickup mode', () => {
      const { getByTestId, queryByTestId } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      fireEvent(getByTestId('map-press-area'), 'touchEnd');

      // Advance timers for any effects
      act(() => {
        jest.runAllTimers();
      });

      expect(queryByTestId('marker-Your Pickup')).toBeTruthy();
    });

    it('auto-switches to dropoff mode after selecting pickup', () => {
      const { getByTestId, getByText } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      fireEvent(getByTestId('map-press-area'), 'touchEnd');

      act(() => {
        jest.runAllTimers();
      });

      // Should now prompt for dropoff
      expect(getByText('Tap to select dropoff location')).toBeTruthy();
    });
  });

  describe('Reset Functionality', () => {
    it('clears all selections on reset', async () => {
      const { getByText, getByTestId, queryByTestId } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      // Set pickup
      fireEvent(getByTestId('map-press-area'), 'touchEnd');

      act(() => {
        jest.runAllTimers();
      });

      expect(queryByTestId('marker-Your Pickup')).toBeTruthy();

      // Reset
      fireEvent.press(getByText('Reset'));

      act(() => {
        jest.runAllTimers();
      });

      expect(queryByTestId('marker-Your Pickup')).toBeNull();
      expect(getByText('Tap to select pickup location')).toBeTruthy();
    });
  });

  describe('Callback', () => {
    it('calls onLocationsSelected when both locations selected', async () => {
      const mockCallback = jest.fn();

      const { getByTestId, getByText } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
          maxDetourUnit="none"
          onLocationsSelected={mockCallback}
        />
      );

      // Select pickup
      fireEvent(getByTestId('map-press-area'), 'touchEnd');

      act(() => {
        jest.runAllTimers();
      });

      // Select dropoff (switch mode and press)
      fireEvent.press(getByText('Set Dropoff'));
      fireEvent(getByTestId('map-press-area'), 'touchEnd');

      act(() => {
        jest.runAllTimers();
      });

      // The callback should eventually be called with locations
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('Validation Messages', () => {
    it('shows info message when no pickup selected', () => {
      const { getByText } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      expect(getByText('Tap to select pickup location')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty route array', () => {
      const { queryByTestId } = render(
        <LocationMapPicker
          rideRoute={[]}
          startLocation={mockStartLocation}
          endLocation={mockEndLocation}
        />
      );

      expect(queryByTestId('polyline')).toBeNull();
    });

    it('handles missing start location', () => {
      const { queryByTestId } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={null}
          endLocation={mockEndLocation}
        />
      );

      expect(queryByTestId('marker-Ride Start')).toBeNull();
    });

    it('handles missing end location', () => {
      const { queryByTestId } = render(
        <LocationMapPicker
          rideRoute={mockRideRoute}
          startLocation={mockStartLocation}
          endLocation={null}
        />
      );

      expect(queryByTestId('marker-Ride End')).toBeNull();
    });
  });
});
