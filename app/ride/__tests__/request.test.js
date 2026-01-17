/**
 * Tests for app/ride/request.js - Request Seat Screen
 */

// Mock firebase configs - MUST be before any imports that use Firebase
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

// Mock firestore service
const mockGetRideById = jest.fn();
jest.mock('../../../services/firebase/firestore', () => ({
	getRideById: (...args) => mockGetRideById(...args),
	createRequest: jest.fn(() => Promise.resolve({ id: 'request123' })),
}));

// Mock notifications
jest.mock('../../../services/notifications/pushNotifications', () => ({
	registerForPushNotificationsAsync: jest.fn(),
}));

import { fireEvent, render, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

// CRITICAL: Unmock react-redux to use real Provider and hooks
jest.unmock('react-redux');

import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock fonts
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
	selectionAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
	router: {
		push: jest.fn(),
		replace: jest.fn(),
		back: jest.fn(),
	},
	useLocalSearchParams: () => ({ rideId: 'ride123' }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock LocationMapPicker component
jest.mock('../../../components/LocationMapPicker', () => {
	const { TouchableOpacity, Text, View } = require('react-native');
	return function MockLocationMapPicker({ onLocationsSelected }) {
		return (
			<View testID="location-map-picker">
				<TouchableOpacity
					testID="select-locations-btn"
					onPress={() => {
						onLocationsSelected(
							{ latitude: 37.77, longitude: -122.42 },
							{ latitude: 34.05, longitude: -118.24 },
							true
						);
					}}
				>
					<Text>Select Locations</Text>
				</TouchableOpacity>
			</View>
		);
	};
});

// Create static reducers that ignore actions
const createStaticReducer = (initialState) => (state = initialState) => state;

const createMockStore = (initialState = {}) => {
	const defaultAuthState = {
		user: { uid: 'rider123', email: 'rider@example.com' },
		userProfile: { name: 'Test Rider', school: 'UCLA' },
		loading: false,
		error: null,
	};
	
	const defaultRequestsState = {
		myRequests: [],
		submitting: false,
		error: null,
	};
	
	const authState = { ...defaultAuthState, ...(initialState.auth || {}) };
	const requestsState = { ...defaultRequestsState, ...(initialState.requests || {}) };
	
	return configureStore({
		reducer: {
			auth: createStaticReducer(authState),
			requests: createStaticReducer(requestsState),
		},
		preloadedState: {
			auth: authState,
			requests: requestsState,
		},
	});
};

import RequestSeatScreen from '../request';
import { router } from 'expo-router';

describe('RequestSeatScreen', () => {
	const mockRide = {
		id: 'ride123',
		driverId: 'driver123',
		driverName: 'John Driver',
		driverRating: 4.8,
		startLocation: {
			placeName: 'San Francisco, CA',
			coordinates: { latitude: 37.7749, longitude: -122.4194 }
		},
		endLocation: {
			placeName: 'Los Angeles, CA',
			coordinates: { latitude: 34.0522, longitude: -118.2437 }
		},
		departureDate: '2025-01-20',
		departureTime: '10:00 AM',
		pricePerSeat: 50,
		availableSeats: 3,
		totalSeats: 4,
		routePolyline: '[]',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockGetRideById.mockResolvedValue(mockRide);
		jest.spyOn(Alert, 'alert').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('rendering', () => {
		it('renders title', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Request a Seat')).toBeTruthy();
			});
		});

		it('renders subtitle', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Send a seat request to the driver with optional notes.')).toBeTruthy();
			});
		});

		it('renders back button', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			expect(getByText('← Back')).toBeTruthy();
		});
	});

	describe('ride details', () => {
		it('shows ride from location', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('San Francisco, CA')).toBeTruthy();
			});
		});

		it('shows ride to location', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Los Angeles, CA')).toBeTruthy();
			});
		});

		it('shows departure date and time', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('2025-01-20 • 10:00 AM')).toBeTruthy();
			});
		});

		it('shows price per seat', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('$50.00 / seat')).toBeTruthy();
			});
		});

		it('shows available seats', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('3')).toBeTruthy();
			});
		});
	});

	describe('driver info', () => {
		it('shows driver name', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('John Driver')).toBeTruthy();
			});
		});

		it('shows driver rating', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Rating: 4.8')).toBeTruthy();
			});
		});
	});

	describe('seat selection', () => {
		it('renders seat stepper', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Seats Requested')).toBeTruthy();
			});

			// Default is 1 seat
			expect(getByText('1')).toBeTruthy();
		});

		it('can increment seats', async () => {
			const store = createMockStore();
			const { getByText, getByLabelText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Seats Requested')).toBeTruthy();
			});

			await act(async () => {
				fireEvent.press(getByLabelText('Increase seats'));
			});

			expect(getByText('2')).toBeTruthy();
		});

		it('can decrement seats', async () => {
			const store = createMockStore();
			const { getByText, getByLabelText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Seats Requested')).toBeTruthy();
			});

			// First increment to 2
			await act(async () => {
				fireEvent.press(getByLabelText('Increase seats'));
			});

			// Then decrement back to 1
			await act(async () => {
				fireEvent.press(getByLabelText('Decrease seats'));
			});

			expect(getByText('1')).toBeTruthy();
		});
	});

	describe('message', () => {
		it('renders message input', async () => {
			const store = createMockStore();
			const { getByText, getByPlaceholderText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Message to Driver (optional)')).toBeTruthy();
			});

			expect(getByPlaceholderText('Share pickup details or preferences')).toBeTruthy();
		});

		it('shows character count', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('0/300')).toBeTruthy();
			});
		});
	});

	describe('navigation', () => {
		it('navigates back on back button press', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await act(async () => {
				fireEvent.press(getByText('← Back'));
			});

			expect(router.back).toHaveBeenCalled();
		});
	});

	describe('error states', () => {
		it('shows error when ride not found', async () => {
			mockGetRideById.mockResolvedValue(null);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Ride not found.')).toBeTruthy();
			});
		});

		it('shows error on fetch failure', async () => {
			mockGetRideById.mockRejectedValue(new Error('Network error'));
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Network error')).toBeTruthy();
			});
		});
	});

	describe('submit button', () => {
		it('shows send request button', async () => {
			const store = createMockStore();
			const { getByText, getByTestId } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Seats Requested')).toBeTruthy();
			});

			// Select locations first to enable the button
			await act(async () => {
				fireEvent.press(getByTestId('select-locations-btn'));
			});

			expect(getByText('Send Request')).toBeTruthy();
		});

		it('shows pending state when already requested', async () => {
			const store = createMockStore({
				requests: {
					myRequests: [{ id: 'req1', rideId: 'ride123', status: 'pending' }],
					submitting: false,
				}
			});
			
			const { getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Request Pending')).toBeTruthy();
			});
		});
	});

	describe('location picker', () => {
		it('renders location map picker', async () => {
			const store = createMockStore();
			const { getByTestId, getByText } = render(
				<Provider store={store}>
					<RequestSeatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Select Pickup & Dropoff')).toBeTruthy();
			});

			expect(getByTestId('location-map-picker')).toBeTruthy();
		});
	});
});
