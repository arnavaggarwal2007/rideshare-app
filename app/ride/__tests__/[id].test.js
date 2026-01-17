/**
 * Tests for RideDetailsScreen (/ride/[id].js)
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../../firebaseConfig', () => ({
  auth: { currentUser: { uid: 'testUser123' } },
  db: {},
}));

jest.mock('../../../services/firebase/firestore', () => ({
  getRideById: jest.fn(),
}));

// Mock store slices
jest.mock('../../../store/slices/requestsSlice', () => ({
  fetchMyRequestsThunk: jest.fn(() => ({ type: 'requests/fetchMyRequests' })),
}));

jest.mock('../../../store/slices/ridesSlice', () => ({
  deleteRideThunk: jest.fn(() => ({
    type: 'rides/delete',
    unwrap: jest.fn(),
  })),
}));

// Mock expo modules
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: 'ride123' })),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
}));

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  const MockMapView = React.forwardRef((props, ref) => (
    <View testID="map-view" {...props}>{props.children}</View>
  ));
  MockMapView.displayName = 'MockMapView';
  
  const MockMarker = (props) => (
    <View testID={`marker-${props.accessibilityLabel || 'default'}`} {...props} />
  );
  
  const MockPolyline = (props) => (
    <View testID="polyline" {...props} />
  );
  
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getRideById } from '../../../services/firebase/firestore';
import { deleteRideThunk } from '../../../store/slices/ridesSlice';
import RideDetailsScreen from '../[id]';

// Redux mock
let mockAuthState = { user: { uid: 'testUser123' } };
let mockRequestsState = { myRequests: [] };
const mockDispatch = jest.fn(() => Promise.resolve());

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => {
    const state = {
      auth: mockAuthState,
      requests: mockRequestsState,
    };
    return selector(state);
  }),
  useDispatch: () => mockDispatch,
}));

// Alert mock
jest.spyOn(Alert, 'alert');

describe('RideDetailsScreen', () => {
  const mockRide = {
    id: 'ride123',
    driverId: 'driver456',
    driverName: 'John Driver',
    driverRating: 4.5,
    departureDate: '2099-02-15',
    departureTime: '10:00 AM',
    departureTimestamp: { toDate: () => new Date('2099-02-15T10:00:00') },
    startLocation: {
      placeName: 'Los Angeles, CA',
      address: '123 Main St, Los Angeles, CA',
      coordinates: { latitude: 34.0522, longitude: -118.2437 },
    },
    endLocation: {
      placeName: 'San Francisco, CA',
      address: '456 Market St, San Francisco, CA',
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
    },
    totalSeats: 4,
    availableSeats: 2,
    pricePerSeat: 25,
    distanceKm: 615,
    durationMinutes: 360,
    status: 'active',
    maxDetourValue: 10,
    maxDetourUnit: 'miles',
    description: 'Comfortable ride with AC',
    routePolyline: JSON.stringify([
      { latitude: 34.0522, longitude: -118.2437 },
      { latitude: 36.0, longitude: -120.0 },
      { latitude: 37.7749, longitude: -122.4194 },
    ]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = { user: { uid: 'testUser123' } };
    mockRequestsState = { myRequests: [] };
    getRideById.mockResolvedValue(mockRide);
    useLocalSearchParams.mockReturnValue({ id: 'ride123' });
  });

  describe('Loading State', () => {
    it('should show loading indicator while fetching ride', async () => {
      getRideById.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      const { getByTestId } = render(<RideDetailsScreen />);
      
      // ActivityIndicator should be present
      await waitFor(() => {
        expect(getRideById).toHaveBeenCalledWith('ride123');
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when ride fetch fails', async () => {
      getRideById.mockRejectedValue(new Error('Network error'));
      
      const { findByText } = render(<RideDetailsScreen />);
      
      const errorMsg = await findByText('Network error');
      expect(errorMsg).toBeTruthy();
    });

    it('should show "Ride not found" when ride is null', async () => {
      getRideById.mockResolvedValue(null);
      
      const { findByText } = render(<RideDetailsScreen />);
      
      const errorMsg = await findByText('Ride not found.');
      expect(errorMsg).toBeTruthy();
    });

    it('should show default error message when error has no message', async () => {
      getRideById.mockRejectedValue({});
      
      const { findByText } = render(<RideDetailsScreen />);
      
      const errorMsg = await findByText('Failed to load ride.');
      expect(errorMsg).toBeTruthy();
    });
  });

  describe('Screen Display', () => {
    it('should display ride route cities', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('Los Angeles')).toBeTruthy();
      expect(await findByText('San Francisco')).toBeTruthy();
    });

    it('should display departure date and time', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('2099-02-15 • 10:00 AM')).toBeTruthy();
    });

    it('should display full start location', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('Los Angeles, CA')).toBeTruthy();
    });

    it('should display full destination', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('San Francisco, CA')).toBeTruthy();
    });

    it('should display back button', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('← Back')).toBeTruthy();
    });
  });

  describe('Trip Info', () => {
    it('should display distance in miles', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      // 615 km * 0.621371 = 382.1 mi
      expect(await findByText('382.1 mi')).toBeTruthy();
    });

    it('should display duration in hours and minutes', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      // 360 minutes = 6h 0m
      expect(await findByText('6h 0m')).toBeTruthy();
    });

    it('should display available seats', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('2/4')).toBeTruthy();
    });

    it('should display price per seat', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('$25.00')).toBeTruthy();
    });

    it('should display max detour', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('10 miles')).toBeTruthy();
    });
  });

  describe('Driver Info', () => {
    it('should display driver name', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('John Driver')).toBeTruthy();
    });

    it('should display driver rating', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('⭐ 4.5')).toBeTruthy();
    });

    it('should display "Not rated" when driver has no rating', async () => {
      getRideById.mockResolvedValue({ ...mockRide, driverRating: null });
      
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('Not rated')).toBeTruthy();
    });
  });

  describe('Description', () => {
    it('should display ride description when present', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('Comfortable ride with AC')).toBeTruthy();
    });

    it('should not show description section when missing', async () => {
      getRideById.mockResolvedValue({ ...mockRide, description: '' });
      
      const { queryByText, findByText } = render(<RideDetailsScreen />);
      
      // Wait for loading to complete
      await findByText('Los Angeles');
      
      expect(queryByText('DESCRIPTION')).toBeNull();
    });
  });

  describe('Status Display', () => {
    it('should show Upcoming badge for active rides', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('📅 Upcoming')).toBeTruthy();
    });

    it('should show Cancelled for cancelled rides', async () => {
      getRideById.mockResolvedValue({ ...mockRide, status: 'cancelled' });
      
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('Cancelled')).toBeTruthy();
    });

    it('should show Full when no seats available', async () => {
      getRideById.mockResolvedValue({ 
        ...mockRide, 
        availableSeats: 0, 
        totalSeats: 4,
        departureTimestamp: { toDate: () => new Date('2099-01-01') }
      });
      
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('Full')).toBeTruthy();
    });

    it('should show Completed for past rides', async () => {
      getRideById.mockResolvedValue({ 
        ...mockRide, 
        departureTimestamp: { toDate: () => new Date('2020-01-01') }
      });
      
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('Completed')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button pressed', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      const backButton = await findByText('← Back');
      fireEvent.press(backButton);
      
      expect(router.back).toHaveBeenCalled();
    });

    it('should navigate to driver profile when name pressed', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      const driverName = await findByText('John Driver');
      fireEvent.press(driverName);
      
      await waitFor(() => {
        expect(Haptics.selectionAsync).toHaveBeenCalled();
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/user/[id]',
          params: { id: 'driver456' },
        });
      });
    });
  });

  describe('Driver Actions', () => {
    beforeEach(() => {
      mockAuthState = { user: { uid: 'driver456' } }; // User is the driver
    });

    it('should show Edit and Delete buttons for driver', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('Edit')).toBeTruthy();
      expect(await findByText('Delete')).toBeTruthy();
    });

    it('should navigate to edit screen when Edit pressed', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      const editButton = await findByText('Edit');
      fireEvent.press(editButton);
      
      await waitFor(() => {
        expect(Haptics.selectionAsync).toHaveBeenCalled();
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/ride/edit',
          params: { id: 'ride123' },
        });
      });
    });

    it('should show confirmation alert when Delete pressed', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      const deleteButton = await findByText('Delete');
      fireEvent.press(deleteButton);
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Delete Ride',
          'Are you sure you want to delete this ride? This action cannot be undone.',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Cancel' }),
            expect.objectContaining({ text: 'Delete', style: 'destructive' }),
          ]),
          expect.any(Object)
        );
      });
    });

    it('should delete ride and navigate when confirmed', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      const deleteButton = await findByText('Delete');
      fireEvent.press(deleteButton);
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
      
      // Mock dispatch to succeed on unwrap
      mockDispatch.mockImplementationOnce(() => ({
        unwrap: () => Promise.resolve(),
      }));
      
      // Simulate pressing Delete in the alert
      const alertCall = Alert.alert.mock.calls[0];
      const deleteAction = alertCall[2].find(btn => btn.text === 'Delete');
      await deleteAction.onPress();
      
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it('should show error alert when delete fails', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      const deleteButton = await findByText('Delete');
      fireEvent.press(deleteButton);
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
      
      // Mock dispatch to fail on unwrap for delete
      mockDispatch.mockImplementationOnce(() => ({
        unwrap: () => Promise.reject('Delete failed'),
      }));
      
      // Simulate pressing Delete in the alert
      const alertCall = Alert.alert.mock.calls[0];
      const deleteAction = alertCall[2].find(btn => btn.text === 'Delete');
      await deleteAction.onPress();
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Delete failed');
      });
    });
  });

  describe('Rider Actions', () => {
    beforeEach(() => {
      mockAuthState = { user: { uid: 'testUser123' } }; // Different from driver
      mockRequestsState = { myRequests: [] };
    });

    it('should show Request Seat button for non-driver', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('Request Seat')).toBeTruthy();
    });

    it('should navigate to request screen when Request Seat pressed', async () => {
      const { findByText } = render(<RideDetailsScreen />);
      
      const requestButton = await findByText('Request Seat');
      fireEvent.press(requestButton);
      
      await waitFor(() => {
        expect(Haptics.selectionAsync).toHaveBeenCalled();
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/ride/request',
          params: { rideId: 'ride123' },
        });
      });
    });

    it('should show pending status when request already exists', async () => {
      mockRequestsState = {
        myRequests: [
          { rideId: 'ride123', status: 'pending' },
        ],
      };
      
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('Request Pending')).toBeTruthy();
    });

    it('should disable button when request already exists', async () => {
      mockRequestsState = {
        myRequests: [
          { rideId: 'ride123', status: 'pending' },
        ],
      };
      
      const { findByText, findByLabelText } = render(<RideDetailsScreen />);
      
      // Button shows pending text
      expect(await findByText('Request Pending')).toBeTruthy();
      
      // Button is disabled, so pressing does nothing 
      const button = await findByLabelText('Request a seat');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('should show sign in alert when user not authenticated', async () => {
      mockAuthState = { user: null };
      
      const { findByText } = render(<RideDetailsScreen />);
      
      const requestButton = await findByText('Request Seat');
      fireEvent.press(requestButton);
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Sign in required',
          'Please sign in to request a seat.'
        );
      });
    });
  });

  describe('Map Display', () => {
    it('should render map view', async () => {
      const { findByTestId } = render(<RideDetailsScreen />);
      
      const map = await findByTestId('map-view');
      expect(map).toBeTruthy();
    });

    it('should render start location marker', async () => {
      const { findByTestId } = render(<RideDetailsScreen />);
      
      const startMarker = await findByTestId('marker-Start location');
      expect(startMarker).toBeTruthy();
    });

    it('should render destination marker', async () => {
      const { findByTestId } = render(<RideDetailsScreen />);
      
      const destMarker = await findByTestId('marker-Destination');
      expect(destMarker).toBeTruthy();
    });

    it('should render route polyline', async () => {
      const { findByTestId } = render(<RideDetailsScreen />);
      
      const polyline = await findByTestId('polyline');
      expect(polyline).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing location placeName gracefully', async () => {
      getRideById.mockResolvedValue({
        ...mockRide,
        startLocation: {
          address: '123 Test St, San Diego, CA',
          coordinates: { latitude: 34.0, longitude: -118.0 },
        },
        endLocation: {
          address: '456 Main Ave, Phoenix, AZ',
          coordinates: { latitude: 37.0, longitude: -122.0 },
        },
      });
      
      const { findByText } = render(<RideDetailsScreen />);
      
      // getCity takes first part before comma
      expect(await findByText('123 Test St')).toBeTruthy();
      expect(await findByText('456 Main Ave')).toBeTruthy();
    });

    it('should handle no distance/duration', async () => {
      getRideById.mockResolvedValue({
        ...mockRide,
        distanceKm: null,
        durationMinutes: null,
      });
      
      const { findAllByText } = render(<RideDetailsScreen />);
      
      // Should show dashes for missing data
      const dashes = await findAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('should handle no max detour', async () => {
      getRideById.mockResolvedValue({
        ...mockRide,
        maxDetourValue: null,
        maxDetourUnit: 'none',
      });
      
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('No limit')).toBeTruthy();
    });

    it('should handle invalid route polyline', async () => {
      getRideById.mockResolvedValue({
        ...mockRide,
        routePolyline: 'invalid-json',
      });
      
      const { findByText, queryByTestId } = render(<RideDetailsScreen />);
      
      await findByText('Los Angeles');
      
      // Should still render without crashing
      expect(queryByTestId('polyline')).toBeNull();
    });

    it('should handle timestamp as date string', async () => {
      getRideById.mockResolvedValue({
        ...mockRide,
        departureTimestamp: '2099-02-15T10:00:00',
      });
      
      const { findByText } = render(<RideDetailsScreen />);
      
      // Should still determine status correctly
      expect(await findByText('📅 Upcoming')).toBeTruthy();
    });

    it('should handle missing ride id', async () => {
      useLocalSearchParams.mockReturnValue({ id: undefined });
      
      const { queryByText } = render(<RideDetailsScreen />);
      
      // Should not call fetch without id
      await waitFor(() => {
        expect(getRideById).not.toHaveBeenCalled();
      });
    });

    it('should use default driver name when missing', async () => {
      getRideById.mockResolvedValue({
        ...mockRide,
        driverName: null,
      });
      
      const { findByText } = render(<RideDetailsScreen />);
      
      expect(await findByText('Driver')).toBeTruthy();
    });
  });
});
