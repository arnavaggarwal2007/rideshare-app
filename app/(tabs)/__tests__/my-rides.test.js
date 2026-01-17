/**
 * Tests for app/(tabs)/my-rides.js
 */
import { fireEvent, render, act } from '@testing-library/react-native';
import React from 'react';

// CRITICAL: Unmock react-redux to use real Provider and hooks
jest.unmock('react-redux');

import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock fonts
jest.mock('expo-font', () => ({
	useFonts: () => [true, null],
}));

jest.mock('@expo-google-fonts/montserrat', () => ({
	Montserrat_700Bold: {},
	useFonts: () => [true],
}));

jest.mock('@expo-google-fonts/lato', () => ({
	Lato_400Regular: {},
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
	Ionicons: ({ name }) => {
		const { Text } = require('react-native');
		return <Text testID={`icon-${name}`}>{name}</Text>;
	},
}));

// Mock safe area context
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

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	selectionAsync: jest.fn(),
	notificationAsync: jest.fn(),
	NotificationFeedbackType: { Success: 'success', Error: 'error' },
	ImpactFeedbackStyle: { Medium: 'medium' },
}));

// Mock react-native-maps
jest.mock('react-native-maps', () => {
	const React = require('react');
	const { View } = require('react-native');
	return {
		__esModule: true,
		default: React.forwardRef((props, ref) => <View testID="map-view" {...props} />),
		Marker: (props) => <View testID="map-marker" {...props} />,
		Polyline: (props) => <View testID="map-polyline" {...props} />,
	};
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock firebase configs
jest.mock('../../../firebaseConfig', () => ({
	auth: {},
	db: {},
}));

jest.mock('../../../services/firebase/config', () => ({
	auth: {},
	db: {},
	storage: {},
	functions: {},
}));

// Mock firestore subscriptions
const mockUnsubscribe = jest.fn();
const mockSubscribeToUserRides = jest.fn();
const mockSubscribeToRideRequests = jest.fn();

jest.mock('../../../services/firebase/firestore', () => ({
	subscribeToUserRides: (...args) => mockSubscribeToUserRides(...args),
	subscribeToRideRequests: (...args) => mockSubscribeToRideRequests(...args),
}));

// Mock geocoding
jest.mock('../../../services/maps/geocoding', () => ({
	reverseGeocode: jest.fn(() => Promise.resolve({ placeName: '123 Main St' })),
}));

// Create static reducers that ignore actions
const createStaticReducer = (initialState) => (state = initialState) => state;

const createMockStore = (initialState = {}) => {
	const defaultAuthState = {
		user: { uid: 'driver123', email: 'driver@example.com' },
		userProfile: { name: 'Test Driver' },
		loading: false,
		error: null,
	};
	
	const defaultRidesState = {
		myRides: [],
		loading: false,
		error: null,
	};
	
	const defaultRequestsState = {
		accepting: false,
		declining: false,
		error: null,
	};
	
	const authState = { ...defaultAuthState, ...(initialState.auth || {}) };
	const ridesState = { ...defaultRidesState, ...(initialState.rides || {}) };
	const requestsState = { ...defaultRequestsState, ...(initialState.requests || {}) };
	
	return configureStore({
		reducer: {
			auth: createStaticReducer(authState),
			rides: createStaticReducer(ridesState),
			requests: createStaticReducer(requestsState),
		},
		preloadedState: {
			auth: authState,
			rides: ridesState,
			requests: requestsState,
		},
	});
};

import MyRidesScreen from '../my-rides';

describe('MyRidesScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		// Default mock implementation - calls callback synchronously to avoid timer issues
		mockSubscribeToUserRides.mockImplementation((userId, callback) => {
			// Call callback synchronously instead of with setTimeout
			callback([]);
			return mockUnsubscribe;
		});
		mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
			callback([]);
			return mockUnsubscribe;
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('rendering', () => {
		it('renders my rides header', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			// Use advanceTimersByTime instead of runAllTimers to avoid infinite loop with setInterval
			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('My Rides')).toBeTruthy();
		});

		it('shows empty state when no rides', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Match actual component text
			expect(getByText('No rides to display yet.')).toBeTruthy();
			expect(getByText('Create your first ride')).toBeTruthy();
		});
	});

	describe('ride list', () => {
		const mockRides = [
			{
				id: 'ride1',
				driverId: 'driver123',
				startLocation: { placeName: 'Downtown LA, California', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'Santa Monica, California', coordinates: { latitude: 34.06, longitude: -118.26 } },
				departureDate: '2025-01-15',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() + 86400000) }, // Tomorrow
				availableSeats: 3,
				totalSeats: 4,
				pricePerSeat: 25,
				status: 'active',
			},
			{
				id: 'ride2',
				driverId: 'driver123',
				startLocation: { placeName: 'Hollywood, California', coordinates: { latitude: 34.07, longitude: -118.27 } },
				endLocation: { placeName: 'Pasadena, California', coordinates: { latitude: 34.08, longitude: -118.28 } },
				departureDate: '2025-01-10',
				departureTime: '2:00 PM',
				departureTimestamp: { toDate: () => new Date(Date.now() - 86400000) }, // Yesterday (completed)
				availableSeats: 2,
				totalSeats: 4,
				pricePerSeat: 30,
				status: 'completed',
			},
		];

		it('renders ride list items', async () => {
			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback(mockRides);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: mockRides } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Component uses getCity() which extracts first part before comma
			expect(getByText('Downtown LA')).toBeTruthy();
			expect(getByText('Santa Monica')).toBeTruthy();
		});

		it('shows ride status badges', async () => {
			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback(mockRides);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: mockRides } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Component shows "📅 Upcoming" for active rides
			expect(getByText('📅 Upcoming')).toBeTruthy();
		});

		it('shows price per seat', async () => {
			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback(mockRides);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: mockRides } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('$25.00')).toBeTruthy();
		});
	});

	describe('navigation', () => {
		it('navigates to create ride on button press', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			fireEvent.press(getByText('Create your first ride'));
			expect(global.mockRouterPush).toHaveBeenCalledWith('/ride/create');
		});
		
		it('navigates to create ride from Add button', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			fireEvent.press(getByText('+ Add'));
			expect(global.mockRouterPush).toHaveBeenCalledWith('/ride/create');
		});
	});

	describe('user not logged in', () => {
		it('handles missing user gracefully', async () => {
			const store = createMockStore({ auth: { user: null } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// When user is null, component shows empty state
			expect(getByText('No rides to display yet.')).toBeTruthy();
		});
	});

	describe('cleanup', () => {
		it('unsubscribes from rides on unmount', async () => {
			const store = createMockStore();
			const { unmount } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			unmount();
			expect(mockUnsubscribe).toHaveBeenCalled();
		});
	});
});
