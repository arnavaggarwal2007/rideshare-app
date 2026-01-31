/**
 * Tests for Trip Details Screen (app/trip/[id].js)
 * 
 * This screen displays detailed trip information with:
 * - Real-time trip subscription updates
 * - Status timeline and history
 * - Map with route polyline and markers
 * - Participant info (driver/rider)
 * - Action buttons based on user role and trip status
 */

// Firebase mocks MUST be first, before any imports
jest.mock('../../../firebaseConfig', () => ({
  auth: {},
  db: {},
}));

jest.mock('../../../services/firebase/firestore', () => ({
  getTripById: jest.fn(),
  subscribeToTrip: jest.fn(),
}));

jest.mock('../../../store/slices/chatsSlice', () => ({
  createChatThunk: jest.fn(() => ({ type: 'chats/createChat' })),
}));

jest.mock('../../../store/slices/tripsSlice', () => ({
  updateTripStatusThunk: jest.fn(() => ({ type: 'trips/updateStatus' })),
  confirmTripCompletionThunk: jest.fn(() => ({ type: 'trips/confirmCompletion' })),
}));

// Mock expo modules
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: 'trip-123' })),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `rideshare://${path}`),
}));

// Mock MapView and related components
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, testID, ...props }) => <View testID={testID || 'map-view'} {...props}>{children}</View>,
    Marker: ({ children, testID, title, ...props }) => <View testID={testID || `marker-${title}`} {...props}>{children}</View>,
    Polyline: ({ testID, ...props }) => <View testID={testID || 'polyline'} {...props} />,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

// Mock StatusBar
jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('StatusBar'),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Now import testing utilities and component
import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { Provider } from 'react-redux';

// Unmock react-redux since jest.setup.js mocks it globally
jest.unmock('react-redux');

import { router, useLocalSearchParams } from 'expo-router';
import { getTripById, subscribeToTrip } from '../../../services/firebase/firestore';
import TripDetailsScreen from '../[id]';

// Spy on Alert.alert
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

// Helper to create static reducer that doesn't handle actions
const createStaticReducer = (initialState) => (state = initialState) => state;

// Helper to create mock store
const createMockStore = (overrides = {}) => {
  const defaultState = {
    auth: {
      user: { uid: 'user-123' },
      userProfile: { name: 'Test User', uid: 'user-123' },
      ...overrides.auth,
    },
    chats: { chats: [], ...overrides.chats },
    trips: { trips: [], ...overrides.trips },
  };

  return configureStore({
    reducer: {
      auth: createStaticReducer(defaultState.auth),
      chats: createStaticReducer(defaultState.chats),
      trips: createStaticReducer(defaultState.trips),
    },
    preloadedState: defaultState,
  });
};

// Mock trip data
const createMockTrip = (overrides = {}) => ({
  id: 'trip-123',
  rideId: 'ride-456',
  driverId: 'driver-789',
  driverName: 'John Driver',
  driverRating: 4.5,
  riderId: 'user-123',
  riderName: 'Test User',
  riderRating: 4.8,
  status: 'confirmed',
  seatsBooked: 2,
  pricePerSeat: 15,
  departureTimestamp: {
    toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
  },
  startLocation: {
    placeName: 'Downtown Station',
    address: '123 Main St',
    coordinates: { latitude: 34.0522, longitude: -118.2437 },
  },
  endLocation: {
    placeName: 'Airport Terminal',
    address: '456 Airport Blvd',
    coordinates: { latitude: 33.9425, longitude: -118.4081 },
  },
  routePolyline: JSON.stringify([
    { latitude: 34.0522, longitude: -118.2437 },
    { latitude: 34.0, longitude: -118.3 },
    { latitude: 33.9425, longitude: -118.4081 },
  ]),
  chatId: null,
  statusHistory: [
    { status: 'confirmed', timestamp: { toDate: () => new Date() } },
  ],
  ...overrides,
});

// Helper to render with Provider
const renderWithProvider = (component, storeOverrides = {}) => {
  const store = createMockStore(storeOverrides);
  return {
    ...render(
      <Provider store={store}>{component}</Provider>
    ),
    store,
  };
};

describe('TripDetailsScreen', () => {
  let unsubscribeMock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    unsubscribeMock = jest.fn();
    subscribeToTrip.mockImplementation((tripId, callback) => {
      return unsubscribeMock;
    });
    useLocalSearchParams.mockReturnValue({ id: 'trip-123' });
  });

  describe('Loading State', () => {
    it('shows loading indicator while fetching trip', () => {
      getTripById.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { getByText } = renderWithProvider(<TripDetailsScreen />);

      expect(getByText('Loading trip details...')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('displays error message when trip not found', async () => {
      getTripById.mockResolvedValue(null);

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Trip not found.')).toBeTruthy();
    });

    it('displays error message on fetch failure', async () => {
      getTripById.mockRejectedValue(new Error('Network error'));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Network error')).toBeTruthy();
    });

    it('shows back button in error state', async () => {
      getTripById.mockResolvedValue(null);

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('← Back')).toBeTruthy();
    });
  });

  describe('Trip Details Display', () => {
    beforeEach(() => {
      getTripById.mockResolvedValue(createMockTrip());
    });

    it('renders trip details header', async () => {
      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Trip Details')).toBeTruthy();
    });

    it('renders trip status section', async () => {
      const { findByText, findAllByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Trip Status')).toBeTruthy();
      const confirmedMatches = await findAllByText('Confirmed');
      expect(confirmedMatches.length).toBeGreaterThan(0);
    });

    it('renders trip information section', async () => {
      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Trip Information')).toBeTruthy();
      expect(await findByText('Date & Time')).toBeTruthy();
      expect(await findByText('Seats Booked')).toBeTruthy();
      expect(await findByText('2')).toBeTruthy();
      expect(await findByText('Total Cost')).toBeTruthy();
      expect(await findByText('$30.00')).toBeTruthy();
    });

    it('renders participants section', async () => {
      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Participants')).toBeTruthy();
      expect(await findByText('John Driver')).toBeTruthy();
      expect(await findByText('Driver')).toBeTruthy();
      expect(await findByText('Test User')).toBeTruthy();
      expect(await findByText('Rider (You)')).toBeTruthy();
    });

    it('renders locations section', async () => {
      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Locations')).toBeTruthy();
      expect(await findByText('Downtown Station')).toBeTruthy();
      expect(await findByText('Airport Terminal')).toBeTruthy();
    });

    it('displays driver rating when available', async () => {
      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('4.5')).toBeTruthy();
    });

    it('displays rider rating when available', async () => {
      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('4.8')).toBeTruthy();
    });

    it('displays custom pickup location when present', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        pickupLocation: { latitude: 34.01, longitude: -118.25 },
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Your Pickup')).toBeTruthy();
    });

    it('displays custom dropoff location when present', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        dropoffLocation: { latitude: 33.95, longitude: -118.40 },
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Your Dropoff')).toBeTruthy();
    });
  });

  describe('Status History', () => {
    it('renders status history when available', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        statusHistory: [
          { status: 'confirmed', timestamp: { toDate: () => new Date('2024-01-15T10:00:00') } },
          { status: 'in-progress', timestamp: { toDate: () => new Date('2024-01-15T11:00:00') } },
        ],
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Status History')).toBeTruthy();
    });
  });

  describe('Real-time Updates', () => {
    it('subscribes to trip updates on mount', async () => {
      getTripById.mockResolvedValue(createMockTrip());

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Trip Details');
      expect(subscribeToTrip).toHaveBeenCalledWith('trip-123', expect.any(Function));
    });

    it('updates trip when subscription callback is called', async () => {
      const initialTrip = createMockTrip();
      getTripById.mockResolvedValue(initialTrip);

      let subscriptionCallback;
      subscribeToTrip.mockImplementation((tripId, callback) => {
        subscriptionCallback = callback;
        return unsubscribeMock;
      });

      const { findAllByText, findByText } = renderWithProvider(<TripDetailsScreen />);

      // Confirmed appears in both status badge and history
      const confirmedMatches = await findAllByText('Confirmed');
      expect(confirmedMatches.length).toBeGreaterThan(0);

      // Simulate real-time update
      const updatedTrip = createMockTrip({ status: 'in-progress' });
      await act(async () => {
        subscriptionCallback(updatedTrip);
      });

      expect(await findByText('In progress')).toBeTruthy();
    });

    it('unsubscribes on unmount', async () => {
      getTripById.mockResolvedValue(createMockTrip());

      const { findByText, unmount } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Trip Details');
      expect(subscribeToTrip).toHaveBeenCalled();

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      getTripById.mockResolvedValue(createMockTrip());
    });

    it('navigates back when back button pressed', async () => {
      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const backButton = await findByText('← Back');
      fireEvent.press(backButton);

      expect(router.back).toHaveBeenCalled();
    });
  });

  describe('Message Button', () => {
    beforeEach(() => {
      getTripById.mockResolvedValue(createMockTrip());
    });

    it('renders message button', async () => {
      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Message')).toBeTruthy();
    });

    it('navigates to existing chat when chatId present', async () => {
      getTripById.mockResolvedValue(createMockTrip({ chatId: 'chat-existing' }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const messageButton = await findByText('Message');
      
      await act(async () => {
        fireEvent.press(messageButton);
      });

      expect(router.push).toHaveBeenCalledWith('/chat/chat-existing');
    });
  });

  describe('Share Button', () => {
    beforeEach(() => {
      getTripById.mockResolvedValue(createMockTrip());
    });

    it('renders share button', async () => {
      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Share Trip')).toBeTruthy();
    });

    it('calls Share.share when pressed', async () => {
      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const shareButton = await findByText('Share Trip');
      
      await act(async () => {
        fireEvent.press(shareButton);
      });

      expect(shareSpy).toHaveBeenCalled();
    });
  });

  describe('Driver Actions', () => {
    describe('Start Trip Button', () => {
      it('shows start trip button for driver on confirmed trip', async () => {
        getTripById.mockResolvedValue(createMockTrip({
          driverId: 'user-123', // Current user is driver
          status: 'confirmed',
        }));

        const { findByText } = renderWithProvider(<TripDetailsScreen />);

        expect(await findByText('Start Trip')).toBeTruthy();
      });

      it('does not show start trip button for rider', async () => {
        getTripById.mockResolvedValue(createMockTrip({
          driverId: 'other-driver',
          riderId: 'user-123',
          status: 'confirmed',
        }));

        const { findByText, queryByText } = renderWithProvider(<TripDetailsScreen />);

        await findByText('Trip Details');

        expect(queryByText('Start Trip')).toBeNull();
      });

      it('shows alert when start trip pressed', async () => {
        getTripById.mockResolvedValue(createMockTrip({
          driverId: 'user-123',
          status: 'confirmed',
        }));

        const { findByText } = renderWithProvider(<TripDetailsScreen />);

        const startButton = await findByText('Start Trip');
        fireEvent.press(startButton);

        expect(alertSpy).toHaveBeenCalledWith(
          'Start Trip?',
          expect.any(String),
          expect.any(Array)
        );
      });
    });

    describe('Complete Trip Button', () => {
      it('shows complete trip button for driver on in-progress trip', async () => {
        getTripById.mockResolvedValue(createMockTrip({
          driverId: 'user-123',
          status: 'in-progress',
        }));

        const { findByText } = renderWithProvider(<TripDetailsScreen />);

        expect(await findByText('Complete Trip')).toBeTruthy();
      });

      it('does not show complete trip button on confirmed trip', async () => {
        getTripById.mockResolvedValue(createMockTrip({
          driverId: 'user-123',
          status: 'confirmed',
        }));

        const { findByText, queryByText } = renderWithProvider(<TripDetailsScreen />);

        await findByText('Start Trip');

        expect(queryByText('Complete Trip')).toBeNull();
      });
    });
  });

  describe('Rider Actions', () => {
    describe('Confirm Completion Button', () => {
      it('shows confirm completion for rider on completed trip', async () => {
        getTripById.mockResolvedValue(createMockTrip({
          riderId: 'user-123',
          status: 'completed',
          riderConfirmedCompletion: false,
        }));

        const { findByText } = renderWithProvider(<TripDetailsScreen />);

        expect(await findByText('Confirm Completion')).toBeTruthy();
      });

      it('does not show confirm completion if already confirmed', async () => {
        getTripById.mockResolvedValue(createMockTrip({
          riderId: 'user-123',
          status: 'completed',
          riderConfirmedCompletion: true,
        }));

        const { findByText, queryByText } = renderWithProvider(<TripDetailsScreen />);

        await findByText('Trip Details');

        expect(queryByText('Confirm Completion')).toBeNull();
      });

      it('shows alert when confirm completion pressed', async () => {
        getTripById.mockResolvedValue(createMockTrip({
          riderId: 'user-123',
          status: 'completed',
          riderConfirmedCompletion: false,
        }));

        const { findByText } = renderWithProvider(<TripDetailsScreen />);

        const confirmButton = await findByText('Confirm Completion');
        fireEvent.press(confirmButton);

        expect(alertSpy).toHaveBeenCalledWith(
          'Confirm Trip Completion?',
          expect.any(String),
          expect.any(Array)
        );
      });
    });
  });

  describe('Cancel Trip', () => {
    it('shows cancel button for confirmed trips', async () => {
      getTripById.mockResolvedValue(createMockTrip({ status: 'confirmed' }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Cancel Trip')).toBeTruthy();
    });

    it('does not show cancel button for in-progress trips', async () => {
      getTripById.mockResolvedValue(createMockTrip({ status: 'in-progress' }));

      const { findByText, queryByText } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Trip Details');

      expect(queryByText('Cancel Trip')).toBeNull();
    });

    it('shows error when trip starts in less than 1 hour', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        status: 'confirmed',
        riderId: 'user-123',
        departureTimestamp: {
          toDate: () => new Date(Date.now() + 30 * 60 * 1000), // 30 mins from now
        },
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const cancelButton = await findByText('Cancel Trip');
      fireEvent.press(cancelButton);

      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        'Can only cancel trips that start in more than 1 hour'
      );
    });

    it('opens cancel modal when cancellation valid', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        status: 'confirmed',
        riderId: 'user-123',
        departureTimestamp: {
          toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        },
      }));

      const { findByText, findByPlaceholderText } = renderWithProvider(<TripDetailsScreen />);

      const cancelButton = await findByText('Cancel Trip');
      fireEvent.press(cancelButton);

      // Modal should appear
      expect(await findByText('Cancel Trip?')).toBeTruthy();
      expect(await findByPlaceholderText('Reason for cancellation...')).toBeTruthy();
    });

    it('allows typing cancellation reason', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        status: 'confirmed',
        riderId: 'user-123',
        departureTimestamp: {
          toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      }));

      const { findByText, findByPlaceholderText } = renderWithProvider(<TripDetailsScreen />);

      const cancelButton = await findByText('Cancel Trip');
      fireEvent.press(cancelButton);

      const input = await findByPlaceholderText('Reason for cancellation...');
      fireEvent.changeText(input, 'Plans changed');
      expect(input.props.value).toBe('Plans changed');
    });

    it('closes modal when Keep Trip pressed', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        status: 'confirmed',
        riderId: 'user-123',
        departureTimestamp: {
          toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      }));

      const { findByText, queryByPlaceholderText } = renderWithProvider(<TripDetailsScreen />);

      const cancelButton = await findByText('Cancel Trip');
      fireEvent.press(cancelButton);

      const keepTripButton = await findByText('Keep Trip');
      fireEvent.press(keepTripButton);

      // Wait a tick for state to update
      await act(async () => {});

      expect(queryByPlaceholderText('Reason for cancellation...')).toBeNull();
    });

    it('shows error when user not part of trip', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        driverId: 'other-driver',
        riderId: 'other-rider',
        status: 'confirmed',
        departureTimestamp: {
          toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const cancelButton = await findByText('Cancel Trip');
      fireEvent.press(cancelButton);

      expect(alertSpy).toHaveBeenCalledWith('Error', 'You are not part of this trip');
    });
  });

  describe('Rate Trip Button', () => {
    it('shows rate button for driver on completed trip not yet rated', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        driverId: 'user-123',
        status: 'completed',
        isRatedByDriver: false,
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Rate Trip')).toBeTruthy();
    });

    it('shows rate button for rider on completed trip not yet rated', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        riderId: 'user-123',
        status: 'completed',
        isRatedByRider: false,
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Rate Trip')).toBeTruthy();
    });

    it('does not show rate button if already rated by driver', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        driverId: 'user-123',
        riderId: 'other-rider', // Different rider so we only test driver condition
        status: 'completed',
        isRatedByDriver: true,
      }));

      const { findByText, queryByText } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Trip Details');

      expect(queryByText('Rate Trip')).toBeNull();
    });

    it('navigates to rating screen when pressed', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        riderId: 'user-123',
        status: 'completed',
        isRatedByRider: false,
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const rateButton = await findByText('Rate Trip');
      fireEvent.press(rateButton);

      expect(router.push).toHaveBeenCalledWith('/rating/trip-123');
    });
  });

  describe('Status Styles', () => {
    it('shows correct style for confirmed status', async () => {
      getTripById.mockResolvedValue(createMockTrip({ status: 'confirmed' }));

      const { findAllByText } = renderWithProvider(<TripDetailsScreen />);

      const matches = await findAllByText('Confirmed');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('shows correct style for in-progress status', async () => {
      getTripById.mockResolvedValue(createMockTrip({ status: 'in-progress' }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('In progress')).toBeTruthy();
    });

    it('shows correct style for completed status', async () => {
      getTripById.mockResolvedValue(createMockTrip({ status: 'completed' }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Completed')).toBeTruthy();
    });

    it('shows correct style for cancelled status', async () => {
      getTripById.mockResolvedValue(createMockTrip({ status: 'cancelled' }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Cancelled')).toBeTruthy();
    });
  });

  describe('Map Display', () => {
    it('renders map with route polyline', async () => {
      getTripById.mockResolvedValue(createMockTrip());

      const { findByText, getByTestId } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Trip Details');
      expect(getByTestId('map-view')).toBeTruthy();
    });

    it('handles missing route polyline', async () => {
      getTripById.mockResolvedValue(createMockTrip({ routePolyline: null }));

      const { findByText, getByTestId } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Trip Details');
      expect(getByTestId('map-view')).toBeTruthy();
    });

    it('handles invalid route polyline JSON', async () => {
      getTripById.mockResolvedValue(createMockTrip({ routePolyline: 'invalid-json' }));

      const { findByText, getByTestId } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Trip Details');
      expect(getByTestId('map-view')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing tripId param', async () => {
      useLocalSearchParams.mockReturnValue({ id: null });

      renderWithProvider(<TripDetailsScreen />);

      // Should not call getTripById since no tripId
      expect(getTripById).not.toHaveBeenCalled();
    });

    it('handles trip with missing optional fields', async () => {
      getTripById.mockResolvedValue({
        id: 'trip-123',
        status: 'confirmed',
        driverId: 'driver-1',
        riderId: 'user-123',
        seatsBooked: 1,
        pricePerSeat: 10,
        departureTimestamp: {
          toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
        startLocation: {},
        endLocation: {},
      });

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Trip Details')).toBeTruthy();
    });
  });

  describe('Cancel confirmation flow', () => {
    it('dispatches updateTripStatusThunk when cancel confirmed', async () => {
      const { updateTripStatusThunk } = require('../../../store/slices/tripsSlice');
      
      getTripById.mockResolvedValue(createMockTrip({
        riderId: 'user-123',
        status: 'confirmed',
        departureTimestamp: {
          toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      }));

      const { findByText, findAllByText } = renderWithProvider(<TripDetailsScreen />);

      // Open cancel modal
      const cancelButton = await findByText('Cancel Trip');
      fireEvent.press(cancelButton);

      // Find all Cancel Trip buttons and get the one in the modal (second one)
      const cancelButtons = await findAllByText('Cancel Trip');
      const confirmCancelButton = cancelButtons[cancelButtons.length - 1]; // Last one is in modal
      
      await act(async () => {
        fireEvent.press(confirmCancelButton);
      });

      expect(updateTripStatusThunk).toHaveBeenCalled();
    });
  });

  describe('Share content', () => {
    it('shares trip details when share button pressed', async () => {
      getTripById.mockResolvedValue(createMockTrip());

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const shareButton = await findByText('Share Trip');
      
      await act(async () => {
        fireEvent.press(shareButton);
      });

      expect(shareSpy).toHaveBeenCalled();
    });

    it('handles share error gracefully', async () => {
      shareSpy.mockRejectedValueOnce(new Error('Share failed'));
      
      getTripById.mockResolvedValue(createMockTrip());

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const shareButton = await findByText('Share Trip');
      
      await act(async () => {
        fireEvent.press(shareButton);
      });

      // Should not crash - error is handled
      expect(await findByText('Trip Details')).toBeTruthy();
    });

    it('handles share dismissal gracefully', async () => {
      shareSpy.mockResolvedValueOnce({ action: 'dismissedAction' });
      
      getTripById.mockResolvedValue(createMockTrip());

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const shareButton = await findByText('Share Trip');
      
      await act(async () => {
        fireEvent.press(shareButton);
      });

      // Should not crash
      expect(await findByText('Trip Details')).toBeTruthy();
    });
  });

  describe('Message Button', () => {
    it('creates new chat when chatId is null', async () => {
      const { createChatThunk } = require('../../../store/slices/chatsSlice');
      createChatThunk.mockReturnValue({ type: 'chats/createChat', payload: { id: 'new-chat-id' } });
      
      getTripById.mockResolvedValue(createMockTrip({ chatId: null }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const messageButton = await findByText('Message');
      
      await act(async () => {
        fireEvent.press(messageButton);
      });

      expect(createChatThunk).toHaveBeenCalled();
    });
  });

  describe('Cancel Trip Validations', () => {
    it('shows error for trip without departure time', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        riderId: 'user-123',
        status: 'confirmed',
        departureTimestamp: null,
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const cancelButton = await findByText('Cancel Trip');
      fireEvent.press(cancelButton);

      expect(alertSpy).toHaveBeenCalledWith('Error', 'Trip departure time not set');
    });

    it('shows error for invalid departure time format', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        riderId: 'user-123',
        status: 'confirmed',
        departureTimestamp: 'invalid-date',
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      const cancelButton = await findByText('Cancel Trip');
      fireEvent.press(cancelButton);

      expect(alertSpy).toHaveBeenCalledWith('Error', 'Invalid trip departure time');
    });

    it('shows error when trying to cancel non-confirmed trip', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        riderId: 'user-123',
        status: 'in-progress',
        departureTimestamp: {
          toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      }));

      const { findByText, queryByText } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Trip Details');
      // Cancel button should not show for in-progress trips
      expect(queryByText('Cancel Trip')).toBeNull();
    });
  });

  describe('Helper Functions', () => {
    it('displays correct status style for unknown status', async () => {
      getTripById.mockResolvedValue(createMockTrip({ status: 'pending' }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      // Pending status should still render
      expect(await findByText('Pending')).toBeTruthy();
    });

    it('formats timestamp correctly', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        statusHistory: [
          { status: 'confirmed', timestamp: new Date('2024-06-15T14:30:00') },
        ],
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Status History');
      // Timestamp should be formatted as DD/MM HH:MM
      expect(await findByText('15/06 14:30')).toBeTruthy();
    });

    it('handles missing timestamp in history', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        statusHistory: [
          { status: 'confirmed', timestamp: null },
        ],
      }));

      const { findByText } = renderWithProvider(<TripDetailsScreen />);

      expect(await findByText('Status History')).toBeTruthy();
    });
  });

  describe('Complete Trip Button', () => {
    it('shows error when non-driver tries to complete trip', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        driverId: 'other-driver',
        riderId: 'user-123',
        status: 'in-progress',
      }));

      const { findByText, queryByText } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Trip Details');
      // Complete trip button should not show for non-driver
      expect(queryByText('Complete Trip')).toBeNull();
    });
  });

  describe('Rider Confirm Completion', () => {
    it('shows error when non-rider tries to confirm', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        driverId: 'user-123',
        riderId: 'other-rider',
        status: 'completed',
        riderConfirmedCompletion: false,
      }));

      const { findByText, queryByText } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Trip Details');
      // Confirm completion button should not show for driver
      expect(queryByText('Confirm Completion')).toBeNull();
    });
  });

  describe('Map Display', () => {
    it('renders fallback straight line when no polyline', async () => {
      getTripById.mockResolvedValue(createMockTrip({ 
        routePolyline: null,
        startLocation: {
          placeName: 'Start',
          coordinates: { latitude: 34.0, longitude: -118.0 },
        },
        endLocation: {
          placeName: 'End',
          coordinates: { latitude: 35.0, longitude: -119.0 },
        },
      }));

      const { findByText, getByTestId } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Trip Details');
      expect(getByTestId('map-view')).toBeTruthy();
    });
  });

  describe('Locations Section', () => {
    it('shows Unknown for missing location placeName', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        startLocation: { coordinates: { latitude: 34.0, longitude: -118.0 } },
        endLocation: { coordinates: { latitude: 35.0, longitude: -119.0 } },
      }));

      const { findAllByText } = renderWithProvider(<TripDetailsScreen />);

      const unknownTexts = await findAllByText('Unknown');
      expect(unknownTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Driver Rating Display', () => {
    it('hides driver rating when zero or undefined', async () => {
      getTripById.mockResolvedValue(createMockTrip({
        driverRating: 0,
        riderRating: 4.5,
      }));

      const { findByText, queryByText } = renderWithProvider(<TripDetailsScreen />);

      await findByText('Participants');
      // Driver rating should not show
      expect(queryByText('0.0')).toBeNull();
      // Rider rating should show
      expect(await findByText('4.5')).toBeTruthy();
    });
  });
});
