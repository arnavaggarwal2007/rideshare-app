/**
 * Tests for app/(tabs)/my-trips.js
 */
import { fireEvent, render, act } from '@testing-library/react-native';
import React from 'react';

// CRITICAL: Unmock react-redux to use real Provider and hooks
jest.unmock('react-redux');

import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock fonts
jest.mock('@expo-google-fonts/montserrat', () => ({
	Montserrat_700Bold: {},
	useFonts: () => [true],
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
	Ionicons: ({ name, testID }) => {
		const { Text } = require('react-native');
		return <Text testID={testID || `icon-${name}`}>{name}</Text>;
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
const mockUnsubscribeRequests = jest.fn();
const mockUnsubscribeTrips = jest.fn();
const mockSubscribeToRiderRequests = jest.fn();
const mockSubscribeToRiderTrips = jest.fn();

jest.mock('../../../services/firebase/firestore', () => ({
	subscribeToRiderRequests: (...args) => mockSubscribeToRiderRequests(...args),
	subscribeToRiderTrips: (...args) => mockSubscribeToRiderTrips(...args),
}));

// Create static reducers that ignore actions
const createStaticReducer = (initialState) => (state = initialState) => state;

const createMockStore = (initialState = {}) => {
	const defaultAuthState = {
		user: { uid: 'rider123', email: 'rider@example.com' },
		userProfile: { name: 'Test Rider' },
		loading: false,
		error: null,
	};
	
	const defaultRequestsState = {
		myRequests: [],
		loading: false,
		error: null,
	};
	
	const defaultReviewsState = {
		unratedTrips: [],
		loading: false,
		error: null,
	};
	
	const authState = { ...defaultAuthState, ...(initialState.auth || {}) };
	const requestsState = { ...defaultRequestsState, ...(initialState.requests || {}) };
	const reviewsState = { ...defaultReviewsState, ...(initialState.reviews || {}) };
	
	return configureStore({
		reducer: {
			auth: createStaticReducer(authState),
			requests: createStaticReducer(requestsState),
			reviews: createStaticReducer(reviewsState),
		},
		preloadedState: {
			auth: authState,
			requests: requestsState,
			reviews: reviewsState,
		},
	});
};

import MyTripsScreen from '../my-trips';

describe('MyTripsScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		// Default mock implementation - calls callback synchronously to avoid timer issues
		mockSubscribeToRiderRequests.mockImplementation((userId, callback) => {
			callback([]);
			return mockUnsubscribeRequests;
		});
		mockSubscribeToRiderTrips.mockImplementation((userId, callback) => {
			callback([]);
			return mockUnsubscribeTrips;
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('rendering', () => {
		it('renders my trips header', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('My Trips')).toBeTruthy();
		});

		it('shows section headers', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Check for section titles
			expect(getByText('In Progress')).toBeTruthy();
			expect(getByText('Confirmed Trips')).toBeTruthy();
			expect(getByText('Completed')).toBeTruthy();
			expect(getByText('Pending Requests')).toBeTruthy();
		});

		it('shows empty state for sections', async () => {
			const store = createMockStore();
			const { getAllByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Each empty section shows "None"
			const noneTexts = getAllByText('None');
			expect(noneTexts.length).toBeGreaterThan(0);
		});
	});

	describe('requests', () => {
		const mockRequests = [
			{
				id: 'req1',
				riderId: 'rider123',
				driverName: 'John Driver',
				startLocation: { address: 'Downtown LA, California' },
				endLocation: { address: 'Santa Monica, California' },
				seatsRequested: 2,
				status: 'pending',
				message: 'Need a ride to the beach',
			},
			{
				id: 'req2',
				riderId: 'rider123',
				driverName: 'Jane Driver',
				startLocation: { address: 'Hollywood, California' },
				endLocation: { address: 'Pasadena, California' },
				seatsRequested: 1,
				status: 'accepted',
			},
		];

		it('renders pending requests', async () => {
			mockSubscribeToRiderRequests.mockImplementation((userId, callback) => {
				callback(mockRequests);
				return mockUnsubscribeRequests;
			});
			
			const store = createMockStore({ requests: { myRequests: mockRequests } });
			const { getByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Should show driver name
			expect(getByText('Driver: John Driver')).toBeTruthy();
			// Should show seats requested
			expect(getByText('+2')).toBeTruthy();
		});

		it('shows cancel button for pending requests', async () => {
			mockSubscribeToRiderRequests.mockImplementation((userId, callback) => {
				callback(mockRequests);
				return mockUnsubscribeRequests;
			});
			
			const store = createMockStore({ requests: { myRequests: mockRequests } });
			const { getByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Cancel button should be visible for pending requests
			expect(getByText('Cancel')).toBeTruthy();
		});

		it('shows request message', async () => {
			mockSubscribeToRiderRequests.mockImplementation((userId, callback) => {
				callback(mockRequests);
				return mockUnsubscribeRequests;
			});
			
			const store = createMockStore({ requests: { myRequests: mockRequests } });
			const { getByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('Need a ride to the beach')).toBeTruthy();
		});
	});

	describe('trips', () => {
		const mockTrips = [
			{
				id: 'trip1',
				riderId: 'rider123',
				driverId: 'driver1',
				driverName: 'Mike Driver',
				startLocation: { placeName: 'UCLA Campus, Los Angeles' },
				endLocation: { placeName: 'LAX Airport, Los Angeles' },
				departureTimestamp: { toDate: () => new Date('2025-01-20T10:00:00') },
				status: 'confirmed',
				chatId: 'chat123',
			},
			{
				id: 'trip2',
				riderId: 'rider123',
				driverId: 'driver2',
				driverName: 'Sarah Driver',
				startLocation: { placeName: 'Venice Beach, California' },
				endLocation: { placeName: 'Downtown LA, California' },
				departureTimestamp: { toDate: () => new Date('2025-01-15T14:00:00') },
				status: 'in-progress',
			},
		];

		it('renders trip items', async () => {
			mockSubscribeToRiderTrips.mockImplementation((userId, callback) => {
				callback(mockTrips);
				return mockUnsubscribeTrips;
			});
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('Mike Driver')).toBeTruthy();
			expect(getByText('Confirmed')).toBeTruthy();
		});

		it('shows trip status badges', async () => {
			mockSubscribeToRiderTrips.mockImplementation((userId, callback) => {
				callback(mockTrips);
				return mockUnsubscribeTrips;
			});
			
			const store = createMockStore();
			const { getByText, getAllByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('Confirmed')).toBeTruthy();
			// "In Progress" appears as section title and status badge
			const inProgressTexts = getAllByText('In Progress');
			expect(inProgressTexts.length).toBeGreaterThanOrEqual(2);
		});

		it('shows chat button for trips with chat', async () => {
			mockSubscribeToRiderTrips.mockImplementation((userId, callback) => {
				callback(mockTrips);
				return mockUnsubscribeTrips;
			});
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Chat icon should be present for trip with chatId
			expect(getByText('chatbubble-outline')).toBeTruthy();
		});

		it('navigates to trip details on press', async () => {
			mockSubscribeToRiderTrips.mockImplementation((userId, callback) => {
				callback(mockTrips);
				return mockUnsubscribeTrips;
			});
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Find and press a trip row (using the driver name as identifier)
			const driverName = getByText('Mike Driver');
			fireEvent.press(driverName.parent.parent.parent);
			
			expect(global.mockRouterPush).toHaveBeenCalledWith('/trip/trip1');
		});
	});

	describe('pending ratings', () => {
		const mockUnratedTrips = [
			{
				id: 'unrated1',
				driverName: 'Rate Me Driver',
				startLocation: { placeName: 'Start City' },
				endLocation: { placeName: 'End City' },
				userRole: 'rider',
			},
		];

		it('shows pending ratings section when unrated trips exist', async () => {
			const store = createMockStore({ reviews: { unratedTrips: mockUnratedTrips } });
			const { getByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('Rate Your Trips')).toBeTruthy();
			expect(getByText('You have 1 trip waiting for your review')).toBeTruthy();
		});

		it('navigates to rating page on rate button press', async () => {
			const store = createMockStore({ reviews: { unratedTrips: mockUnratedTrips } });
			const { getByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			fireEvent.press(getByText('Rate'));
			expect(global.mockRouterPush).toHaveBeenCalledWith('/rating/unrated1');
		});
	});

	describe('user not logged in', () => {
		it('handles missing user gracefully', async () => {
			const store = createMockStore({ auth: { user: null } });
			const { getByText, getAllByText } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Should still render section headers
			expect(getByText('My Trips')).toBeTruthy();
			// All sections should be empty
			const noneTexts = getAllByText('None');
			expect(noneTexts.length).toBeGreaterThan(0);
		});
	});

	describe('cleanup', () => {
		it('unsubscribes from requests and trips on unmount', async () => {
			const store = createMockStore();
			const { unmount } = render(
				<Provider store={store}>
					<MyTripsScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			unmount();
			expect(mockUnsubscribeRequests).toHaveBeenCalled();
			expect(mockUnsubscribeTrips).toHaveBeenCalled();
		});
	});
});
