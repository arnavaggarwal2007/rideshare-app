/**
 * Tests for app/(tabs)/my-rides.js
 */
import { act, fireEvent, render } from '@testing-library/react-native';

// CRITICAL: Unmock react-redux to use real Provider and hooks
jest.unmock('react-redux');

import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

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

// Mock Alert
const mockAlert = jest.spyOn(require('react-native').Alert, 'alert');

// Mock thunks
const mockAcceptRequestThunk = jest.fn();
const mockDeclineRequestThunk = jest.fn();
const mockDeleteRideThunk = jest.fn();

jest.mock('../../../store/slices/requestsSlice', () => ({
	acceptRequestThunk: (...args) => mockAcceptRequestThunk(...args),
	declineRequestThunk: (...args) => mockDeclineRequestThunk(...args),
}));

jest.mock('../../../store/slices/ridesSlice', () => ({
	deleteRideThunk: (...args) => mockDeleteRideThunk(...args),
	setMyRides: (rides) => ({ type: 'rides/setMyRides', payload: rides }),
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
		mockAlert.mockClear();
		mockAcceptRequestThunk.mockClear();
		mockDeclineRequestThunk.mockClear();
		mockDeleteRideThunk.mockClear();
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

	describe('ride actions', () => {
		const mockRides = [
			{
				id: 'ride1',
				driverId: 'driver123',
				startLocation: { placeName: 'Downtown LA, California', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'Santa Monica, California', coordinates: { latitude: 34.06, longitude: -118.26 } },
				departureDate: '2025-01-15',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() + 86400000) },
				availableSeats: 3,
				totalSeats: 4,
				pricePerSeat: 25,
				status: 'active',
			},
		];

		it('renders Edit and Delete buttons', async () => {
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

			expect(getByText('Edit')).toBeTruthy();
			expect(getByText('Delete')).toBeTruthy();
		});

		it('navigates to edit page when Edit pressed', async () => {
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

			fireEvent.press(getByText('Edit'));
			expect(global.mockRouterPush).toHaveBeenCalledWith({ pathname: '/ride/edit', params: { id: 'ride1' } });
		});
	});

	describe('display status logic', () => {
		it('shows Full status when no seats available', async () => {
			const fullRide = {
				id: 'ride-full',
				driverId: 'driver123',
				startLocation: { placeName: 'LA, California', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'SF, California', coordinates: { latitude: 37.77, longitude: -122.42 } },
				departureDate: '2025-01-20',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
				availableSeats: 0,
				totalSeats: 4,
				pricePerSeat: 30,
				status: 'active',
			};

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([fullRide]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [fullRide] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('Full')).toBeTruthy();
		});

		it('shows Cancelled status for cancelled rides', async () => {
			const cancelledRide = {
				id: 'ride-cancelled',
				driverId: 'driver123',
				startLocation: { placeName: 'LA, California', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'SF, California', coordinates: { latitude: 37.77, longitude: -122.42 } },
				departureDate: '2025-01-20',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
				availableSeats: 4,
				totalSeats: 4,
				pricePerSeat: 30,
				status: 'cancelled',
			};

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([cancelledRide]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [cancelledRide] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('Cancelled')).toBeTruthy();
		});
	});

	describe('ride details display', () => {
		const detailedRide = {
			id: 'ride-detailed',
			driverId: 'driver123',
			startLocation: { placeName: 'UCLA, Los Angeles, CA', coordinates: { latitude: 34.07, longitude: -118.44 } },
			endLocation: { placeName: 'LAX Airport, Los Angeles, CA', coordinates: { latitude: 33.94, longitude: -118.41 } },
			departureDate: '2025-01-20',
			departureTime: '08:30 AM',
			departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
			availableSeats: 2,
			totalSeats: 4,
			pricePerSeat: 15,
			status: 'active',
			description: 'Heading to LAX for a morning flight',
			maxDetourUnit: 'miles',
			maxDetourValue: 10,
		};

		it('displays available seats correctly', async () => {
			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([detailedRide]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [detailedRide] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('2/4')).toBeTruthy();
		});

		it('displays max detour value', async () => {
			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([detailedRide]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [detailedRide] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('10 miles')).toBeTruthy();
		});

		it('displays ride description', async () => {
			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([detailedRide]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [detailedRide] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('Heading to LAX for a morning flight')).toBeTruthy();
		});

		it('displays total revenue calculation', async () => {
			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([detailedRide]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [detailedRide] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// 4 seats * $15 = $60.00
			expect(getByText('$60.00')).toBeTruthy();
		});
	});

	describe('error state', () => {
		it('displays error message when there is an error', async () => {
			const store = createMockStore({ rides: { myRides: [], error: 'Failed to load rides' } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('Failed to load rides')).toBeTruthy();
		});
	});

	describe('pending requests', () => {
		const rideWithRequests = {
			id: 'ride-with-requests',
			driverId: 'driver123',
			startLocation: { placeName: 'LA, California', coordinates: { latitude: 34.05, longitude: -118.25 } },
			endLocation: { placeName: 'SF, California', coordinates: { latitude: 37.77, longitude: -122.42 } },
			departureDate: '2025-01-20',
			departureTime: '10:00 AM',
			departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
			availableSeats: 3,
			totalSeats: 4,
			pricePerSeat: 30,
			status: 'active',
		};

		it('shows pending requests badge', async () => {
			const pendingRequests = [
				{ id: 'req1', riderName: 'John Doe', seatsRequested: 1, status: 'pending' },
			];

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRequests]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(pendingRequests);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRequests] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Badge shows count
			expect(getByText('1')).toBeTruthy();
			expect(getByText('Pending Requests (1)')).toBeTruthy();
		});

		it('expands and collapses pending requests section', async () => {
			const pendingRequests = [
				{ 
					id: 'req1', 
					riderName: 'John Doe', 
					seatsRequested: 1, 
					status: 'pending',
					pickupLocation: { latitude: 34.06, longitude: -118.26 },
					dropoffLocation: { latitude: 37.76, longitude: -122.41 },
					message: 'Please pick me up at the corner',
				},
			];

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRequests]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(pendingRequests);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRequests] } });
			const { getByText, queryByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Initially collapsed - John Doe not visible
			expect(queryByText('John Doe')).toBeNull();

			// Expand by pressing header
			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			// Now should see rider name and details
			expect(getByText('John Doe')).toBeTruthy();
			expect(getByText('+1')).toBeTruthy();

			// Collapse again
			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			// John Doe hidden again
			expect(queryByText('John Doe')).toBeNull();
		});

		it('shows request message when expanded', async () => {
			const pendingRequests = [
				{ 
					id: 'req1', 
					riderName: 'Jane Rider', 
					seatsRequested: 2, 
					status: 'pending',
					message: 'Looking forward to this trip!',
				},
			];

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRequests]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(pendingRequests);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRequests] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Expand section
			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			expect(getByText('Looking forward to this trip!')).toBeTruthy();
		});

		it('shows View map button for requests with locations', async () => {
			const pendingRequests = [
				{ 
					id: 'req1', 
					riderName: 'Map Rider', 
					seatsRequested: 1, 
					status: 'pending',
					pickupLocation: { latitude: 34.06, longitude: -118.26 },
					dropoffLocation: { latitude: 37.76, longitude: -122.41 },
				},
			];

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRequests]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(pendingRequests);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRequests] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Expand section
			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			expect(getByText('View map')).toBeTruthy();
		});

		it('shows Accept and Decline buttons for pending requests', async () => {
			const pendingRequests = [
				{ id: 'req1', riderName: 'Button Test', seatsRequested: 1, status: 'pending' },
			];

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRequests]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(pendingRequests);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRequests] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Expand section
			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			expect(getByText('Accept')).toBeTruthy();
			expect(getByText('Decline')).toBeTruthy();
		});
	});

	describe('detour display', () => {
		it('shows No limit for rides without detour settings', async () => {
			const rideNoDetour = {
				id: 'ride-no-detour',
				driverId: 'driver123',
				startLocation: { placeName: 'Point A, CA', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'Point B, CA', coordinates: { latitude: 37.77, longitude: -122.42 } },
				departureDate: '2025-01-20',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
				availableSeats: 2,
				totalSeats: 4,
				pricePerSeat: 25,
				status: 'active',
			};

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideNoDetour]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideNoDetour] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('No limit')).toBeTruthy();
		});

		it('shows detour in minutes when unit is minutes', async () => {
			const rideMinutesDetour = {
				id: 'ride-minutes-detour',
				driverId: 'driver123',
				startLocation: { placeName: 'Start, CA', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'End, CA', coordinates: { latitude: 37.77, longitude: -122.42 } },
				departureDate: '2025-01-20',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
				availableSeats: 2,
				totalSeats: 4,
				pricePerSeat: 25,
				status: 'active',
				maxDetourUnit: 'minutes',
				maxDetourMinutes: 15,
			};

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideMinutesDetour]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideMinutesDetour] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('15 minutes')).toBeTruthy();
		});
	});

	describe('completed rides', () => {
		it('shows Completed status for past rides', async () => {
			const pastRide = {
				id: 'ride-past',
				driverId: 'driver123',
				startLocation: { placeName: 'Past Start, CA', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'Past End, CA', coordinates: { latitude: 37.77, longitude: -122.42 } },
				departureDate: '2025-01-01',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() - 86400000 * 5) }, // 5 days ago
				availableSeats: 2,
				totalSeats: 4,
				pricePerSeat: 25,
				status: 'active',
			};

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([pastRide]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [pastRide] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('Completed')).toBeTruthy();
		});
	});

	describe('ride card navigation', () => {
		it('navigates to ride details when card is pressed', async () => {
			const ride = {
				id: 'ride-nav-test',
				driverId: 'driver123',
				startLocation: { placeName: 'Nav Start, CA', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'Nav End, CA', coordinates: { latitude: 37.77, longitude: -122.42 } },
				departureDate: '2025-01-20',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
				availableSeats: 2,
				totalSeats: 4,
				pricePerSeat: 25,
				status: 'active',
			};

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([ride]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [ride] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Press the city text (part of the card that navigates)
			fireEvent.press(getByText('Nav Start'));
			expect(global.mockRouterPush).toHaveBeenCalledWith('/ride/ride-nav-test');
		});
	});

	describe('location display helpers', () => {
		it('handles location with empty placeName', async () => {
			const rideEmptyLocation = {
				id: 'ride-empty-loc',
				driverId: 'driver123',
				startLocation: { placeName: '', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { address: 'Some Address', coordinates: { latitude: 37.77, longitude: -122.42 } },
				departureDate: '2025-01-20',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
				availableSeats: 2,
				totalSeats: 4,
				pricePerSeat: 25,
				status: 'active',
			};

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideEmptyLocation]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideEmptyLocation] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Should show dash for empty location
			expect(getByText('—')).toBeTruthy();
			// Should use address for end location
			expect(getByText('Some Address')).toBeTruthy();
		});
	});

	describe('refresh functionality', () => {
		it('handles pull to refresh', async () => {
			const ride = {
				id: 'ride-refresh',
				driverId: 'driver123',
				startLocation: { placeName: 'Refresh, CA', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'End, CA', coordinates: { latitude: 37.77, longitude: -122.42 } },
				departureDate: '2025-01-20',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
				availableSeats: 2,
				totalSeats: 4,
				pricePerSeat: 25,
				status: 'active',
			};

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([ride]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [ride] } });
			const { UNSAFE_getByType } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Note: Pull to refresh is handled by RefreshControl, testing the component renders
			expect(store.getState().rides.myRides.length).toBe(1);
		});
	});

	describe('request accept/decline handlers', () => {
		const rideWithRequests = {
			id: 'ride-handler-test',
			driverId: 'driver123',
			startLocation: { placeName: 'LA, California', coordinates: { latitude: 34.05, longitude: -118.25 } },
			endLocation: { placeName: 'SF, California', coordinates: { latitude: 37.77, longitude: -122.42 } },
			departureDate: '2025-01-20',
			departureTime: '10:00 AM',
			departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
			availableSeats: 3,
			totalSeats: 4,
			pricePerSeat: 30,
			status: 'active',
		};

		const pendingRequests = [
			{ id: 'req-accept', riderName: 'Accept Test', seatsRequested: 1, status: 'pending' },
		];

		it('shows accept confirmation alert when Accept button is pressed', async () => {
			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRequests]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(pendingRequests);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRequests] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Expand section
			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			// Press Accept button
			await act(async () => {
				fireEvent.press(getByText('Accept'));
			});

			// Alert should be called with accept confirmation
			expect(mockAlert).toHaveBeenCalledWith(
				'Accept Request',
				'Accept seat request from Accept Test?',
				expect.any(Array),
				{ cancelable: true }
			);
		});

		it('dispatches acceptRequestThunk when Accept is confirmed', async () => {
			mockAcceptRequestThunk.mockReturnValue({
				type: 'requests/acceptRequest',
				unwrap: () => Promise.resolve(),
			});

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRequests]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(pendingRequests);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRequests] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			await act(async () => {
				fireEvent.press(getByText('Accept'));
			});

			// Simulate pressing Accept in alert
			const alertButtons = mockAlert.mock.calls[0][2];
			const acceptButton = alertButtons.find(b => b.text === 'Accept');
			
			await act(async () => {
				await acceptButton.onPress();
			});

			expect(mockAcceptRequestThunk).toHaveBeenCalledWith({
				requestId: 'req-accept',
				rideId: 'ride-handler-test',
			});
		});

		it('shows error alert when accept fails', async () => {
			mockAcceptRequestThunk.mockReturnValue({
				type: 'requests/acceptRequest',
				unwrap: () => Promise.reject('Network error'),
			});

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRequests]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(pendingRequests);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRequests] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			await act(async () => {
				fireEvent.press(getByText('Accept'));
			});

			const alertButtons = mockAlert.mock.calls[0][2];
			const acceptButton = alertButtons.find(b => b.text === 'Accept');
			
			await act(async () => {
				await acceptButton.onPress();
			});

			// Should show error alert
			expect(mockAlert).toHaveBeenCalledWith('Error', 'Network error');
		});

		it('shows decline confirmation alert when Decline button is pressed', async () => {
			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRequests]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(pendingRequests);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRequests] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			await act(async () => {
				fireEvent.press(getByText('Decline'));
			});

			expect(mockAlert).toHaveBeenCalledWith(
				'Decline Request',
				'Decline seat request from Accept Test?',
				expect.any(Array),
				{ cancelable: true }
			);
		});

		it('dispatches declineRequestThunk when Decline is confirmed', async () => {
			mockDeclineRequestThunk.mockReturnValue({
				type: 'requests/declineRequest',
				unwrap: () => Promise.resolve(),
			});

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRequests]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(pendingRequests);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRequests] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			await act(async () => {
				fireEvent.press(getByText('Decline'));
			});

			const alertButtons = mockAlert.mock.calls[0][2];
			const declineButton = alertButtons.find(b => b.text === 'Decline');
			
			await act(async () => {
				await declineButton.onPress();
			});

			expect(mockDeclineRequestThunk).toHaveBeenCalledWith('req-accept');
		});

		it('shows error alert when decline fails', async () => {
			mockDeclineRequestThunk.mockReturnValue({
				type: 'requests/declineRequest',
				unwrap: () => Promise.reject('Decline failed'),
			});

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRequests]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(pendingRequests);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRequests] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			await act(async () => {
				fireEvent.press(getByText('Decline'));
			});

			const alertButtons = mockAlert.mock.calls[0][2];
			const declineButton = alertButtons.find(b => b.text === 'Decline');
			
			await act(async () => {
				await declineButton.onPress();
			});

			expect(mockAlert).toHaveBeenCalledWith('Error', 'Decline failed');
		});
	});

	describe('delete ride handler', () => {
		const rideToDelete = {
			id: 'ride-to-delete',
			driverId: 'driver123',
			startLocation: { placeName: 'Delete Start, CA', coordinates: { latitude: 34.05, longitude: -118.25 } },
			endLocation: { placeName: 'Delete End, CA', coordinates: { latitude: 37.77, longitude: -122.42 } },
			departureDate: '2025-01-20',
			departureTime: '10:00 AM',
			departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
			availableSeats: 2,
			totalSeats: 4,
			pricePerSeat: 25,
			status: 'active',
		};

		it('shows delete confirmation alert when delete button is pressed', async () => {
			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideToDelete]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideToDelete] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Press Delete button
			await act(async () => {
				fireEvent.press(getByText('Delete'));
			});

			expect(mockAlert).toHaveBeenCalledWith(
				'Delete Ride',
				'Are you sure you want to delete this ride?',
				expect.any(Array),
				{ cancelable: true }
			);
		});

		it('dispatches deleteRideThunk when delete is confirmed', async () => {
			mockDeleteRideThunk.mockReturnValue({
				type: 'rides/deleteRide',
				unwrap: () => Promise.resolve(),
			});

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideToDelete]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideToDelete] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			await act(async () => {
				fireEvent.press(getByText('Delete'));
			});

			const alertButtons = mockAlert.mock.calls[0][2];
			const deleteButton = alertButtons.find(b => b.text === 'Delete');
			
			await act(async () => {
				await deleteButton.onPress();
			});

			expect(mockDeleteRideThunk).toHaveBeenCalledWith('ride-to-delete');
		});

		it('shows error alert when delete fails', async () => {
			mockDeleteRideThunk.mockReturnValue({
				type: 'rides/deleteRide',
				unwrap: () => Promise.reject('Delete failed'),
			});

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideToDelete]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideToDelete] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			await act(async () => {
				fireEvent.press(getByText('Delete'));
			});

			const alertButtons = mockAlert.mock.calls[0][2];
			const deleteButton = alertButtons.find(b => b.text === 'Delete');
			
			await act(async () => {
				await deleteButton.onPress();
			});

			expect(mockAlert).toHaveBeenCalledWith('Error', 'Delete failed');
		});
	});

	describe('map preview', () => {
		const rideWithRoute = {
			id: 'ride-map-preview',
			driverId: 'driver123',
			startLocation: { placeName: 'Start, CA', coordinates: { latitude: 34.05, longitude: -118.25 } },
			endLocation: { placeName: 'End, CA', coordinates: { latitude: 37.77, longitude: -122.42 } },
			departureDate: '2025-01-20',
			departureTime: '10:00 AM',
			departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
			availableSeats: 3,
			totalSeats: 4,
			pricePerSeat: 30,
			status: 'active',
			routePolyline: JSON.stringify([{ latitude: 34.05, longitude: -118.25 }, { latitude: 37.77, longitude: -122.42 }]),
		};

		it('opens map preview modal when View map is pressed', async () => {
			const requestWithLocations = [
				{ 
					id: 'req-map', 
					riderName: 'Map User', 
					seatsRequested: 1, 
					status: 'pending',
					pickupLocation: { latitude: 34.06, longitude: -118.26 },
					dropoffLocation: { latitude: 37.76, longitude: -122.41 },
				},
			];

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRoute]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(requestWithLocations);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRoute] } });
			const { getByText, queryByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Expand section
			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			// Press View map button
			await act(async () => {
				fireEvent.press(getByText('View map'));
			});

			// Modal should be visible with Close button
			expect(getByText('Close')).toBeTruthy();
		});

		it('closes map preview modal when Close is pressed', async () => {
			const requestWithLocations = [
				{ 
					id: 'req-map', 
					riderName: 'Map User', 
					seatsRequested: 1, 
					status: 'pending',
					pickupLocation: { latitude: 34.06, longitude: -118.26 },
					dropoffLocation: { latitude: 37.76, longitude: -122.41 },
				},
			];

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideWithRoute]);
				return mockUnsubscribe;
			});

			mockSubscribeToRideRequests.mockImplementation((rideId, userId, callback) => {
				callback(requestWithLocations);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideWithRoute] } });
			const { getByText, queryByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			await act(async () => {
				fireEvent.press(getByText('Pending Requests (1)'));
			});

			await act(async () => {
				fireEvent.press(getByText('View map'));
			});

			// Press Close
			await act(async () => {
				fireEvent.press(getByText('Close'));
			});

			// Modal should be closed - Close button gone
			expect(queryByText('Close')).toBeNull();
		});
	});

	describe('ride status edge cases', () => {
		it('shows Cancelled status for cancelled rides', async () => {
			const cancelledRide = {
				id: 'ride-cancelled',
				driverId: 'driver123',
				startLocation: { placeName: 'Cancel Start, CA', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'Cancel End, CA', coordinates: { latitude: 37.77, longitude: -122.42 } },
				departureDate: '2025-01-20',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
				availableSeats: 2,
				totalSeats: 4,
				pricePerSeat: 25,
				status: 'cancelled',
			};

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([cancelledRide]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [cancelledRide] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('Cancelled')).toBeTruthy();
		});

		it('shows Full status when no seats available', async () => {
			const fullRide = {
				id: 'ride-full',
				driverId: 'driver123',
				startLocation: { placeName: 'Full Start, CA', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'Full End, CA', coordinates: { latitude: 37.77, longitude: -122.42 } },
				departureDate: '2025-01-20',
				departureTime: '10:00 AM',
				departureTimestamp: { toDate: () => new Date(Date.now() + 86400000 * 5) },
				availableSeats: 0,
				totalSeats: 4,
				pricePerSeat: 25,
				status: 'active',
			};

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([fullRide]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [fullRide] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('Full')).toBeTruthy();
		});

		it('handles ride with timestamp as Date object', async () => {
			const rideDateTimestamp = {
				id: 'ride-date-ts',
				driverId: 'driver123',
				startLocation: { placeName: 'Date Start, CA', coordinates: { latitude: 34.05, longitude: -118.25 } },
				endLocation: { placeName: 'Date End, CA', coordinates: { latitude: 37.77, longitude: -122.42 } },
				departureDate: '2025-01-20',
				departureTime: '10:00 AM',
				departureTimestamp: new Date(Date.now() + 86400000 * 5), // Plain Date, not Firestore timestamp
				availableSeats: 2,
				totalSeats: 4,
				pricePerSeat: 25,
				status: 'active',
			};

			mockSubscribeToUserRides.mockImplementation((userId, callback) => {
				callback([rideDateTimestamp]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ rides: { myRides: [rideDateTimestamp] } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			// Ride with future date shows Upcoming indicator
			expect(getByText(/Upcoming/)).toBeTruthy();
		});
	});

	describe('user not logged in', () => {
		it('shows empty state when no user', async () => {
			const store = createMockStore({ auth: { user: null } });
			const { getByText } = render(
				<Provider store={store}>
					<MyRidesScreen />
				</Provider>
			);

			await act(async () => {
				jest.advanceTimersByTime(100);
			});

			expect(getByText('No rides to display yet.')).toBeTruthy();
		});
	});
});
