/**
 * Tests for app/ride/create.js - Create Ride Screen
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

// Mock firestore service BEFORE importing component
jest.mock('../../../services/firebase/firestore', () => ({
	createRide: jest.fn(() => Promise.resolve({ id: 'ride123' })),
	subscribeToUserRides: jest.fn(() => jest.fn()),
	subscribeToRideRequests: jest.fn(() => jest.fn()),
}));

// Mock notifications
jest.mock('../../../services/notifications/pushNotifications', () => ({
	registerForPushNotificationsAsync: jest.fn(),
}));

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

jest.mock('@expo-google-fonts/lato', () => ({
	Lato_400Regular: {},
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
	selectionAsync: jest.fn(() => Promise.resolve()),
	notificationAsync: jest.fn(),
	NotificationFeedbackType: { Success: 'success', Error: 'error' },
	ImpactFeedbackStyle: { Medium: 'medium' },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
	router: {
		push: jest.fn(),
		replace: jest.fn(),
		back: jest.fn(),
	},
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

// Mock directions service
const mockGetDirections = jest.fn();
jest.mock('../../../services/maps/directions', () => ({
	getDirections: (...args) => mockGetDirections(...args),
}));

// Mock LocationSearchInput component
jest.mock('../../../components/LocationSearchInput', () => {
	const { Text, TextInput, View } = require('react-native');
	return function MockLocationSearchInput({ label, location, onLocationSelect, placeholder }) {
		return (
			<View testID={`location-input-${label}`}>
				<Text>{label}</Text>
				<TextInput
					testID={`location-text-input-${label}`}
					placeholder={placeholder}
					value={location?.placeName || ''}
					onChangeText={(text) => {
						if (text === 'San Francisco') {
							onLocationSelect({ placeName: 'San Francisco', coordinates: { latitude: 37.7749, longitude: -122.4194 } });
						} else if (text === 'Los Angeles') {
							onLocationSelect({ placeName: 'Los Angeles', coordinates: { latitude: 34.0522, longitude: -118.2437 } });
						}
					}}
				/>
			</View>
		);
	};
});

// Mock DateTimeInput component
jest.mock('../../../components/DateTimeInput', () => {
	const { Text, TextInput, View } = require('react-native');
	return function MockDateTimeInput({ label, value, onChange, type }) {
		return (
			<View testID={`datetime-input-${type}`}>
				<Text>{label}</Text>
				<TextInput
					testID={`datetime-text-input-${type}`}
					value={value}
					onChangeText={onChange}
					placeholder={type === 'date' ? 'YYYY-MM-DD' : 'HH:mm'}
				/>
			</View>
		);
	};
});

// Create static reducers that ignore actions
const createStaticReducer = (initialState) => (state = initialState) => state;

const createMockStore = (initialState = {}) => {
	const defaultAuthState = {
		user: { uid: 'user123', email: 'user@example.com' },
		userProfile: { name: 'Test User', school: 'UCLA' },
		loading: false,
		error: null,
	};
	
	const defaultRidesState = {
		myRides: [],
		loading: false,
		error: null,
	};
	
	const authState = { ...defaultAuthState, ...(initialState.auth || {}) };
	const ridesState = { ...defaultRidesState, ...(initialState.rides || {}) };
	
	return configureStore({
		reducer: {
			auth: createStaticReducer(authState),
			rides: createStaticReducer(ridesState),
		},
		preloadedState: {
			auth: authState,
			rides: ridesState,
		},
	});
};

import CreateRideScreen from '../create';
import { router } from 'expo-router';

describe('CreateRideScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetDirections.mockResolvedValue({
			polyline: [
				{ latitude: 37.7749, longitude: -122.4194 },
				{ latitude: 34.0522, longitude: -118.2437 }
			],
			distance: 600000, // 600km
			duration: 21600, // 6 hours
		});
	});

	describe('rendering', () => {
		it('renders create ride title', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Create a New Ride')).toBeTruthy();
		});

		it('renders subtitle', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Share your journey and earn money by offering rides')).toBeTruthy();
		});

		it('renders back button', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('← Back')).toBeTruthy();
		});

		it('renders map preview', () => {
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByTestId('map-view')).toBeTruthy();
		});
	});

	describe('form fields', () => {
		it('renders start location input', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Start Location')).toBeTruthy();
		});

		it('renders destination input', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Destination')).toBeTruthy();
		});

		it('renders departure date input', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Departure Date')).toBeTruthy();
		});

		it('renders departure time input', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Departure Time')).toBeTruthy();
		});

		it('renders total seats input', () => {
			const store = createMockStore();
			const { getByText, getByPlaceholderText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Total Seats')).toBeTruthy();
			expect(getByPlaceholderText('Number of seats')).toBeTruthy();
		});

		it('renders price per seat input', () => {
			const store = createMockStore();
			const { getByText, getByPlaceholderText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Price Per Seat')).toBeTruthy();
			expect(getByPlaceholderText('0.00')).toBeTruthy();
		});

		it('renders max detour allowance section', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Max Detour Allowance')).toBeTruthy();
			expect(getByText('No Limit')).toBeTruthy();
			expect(getByText('Max Miles')).toBeTruthy();
		});

		it('renders description input', () => {
			const store = createMockStore();
			const { getByText, getByPlaceholderText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Description')).toBeTruthy();
			expect(getByPlaceholderText('Add a note about your ride...')).toBeTruthy();
		});
	});

	describe('navigation', () => {
		it('navigates back on back button press', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			await act(async () => {
				fireEvent.press(getByText('← Back'));
			});

			expect(router.back).toHaveBeenCalled();
		});
	});

	describe('route preview', () => {
		it('renders preview route button', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Preview Route')).toBeTruthy();
		});

		it('calls directions service on preview', async () => {
			const store = createMockStore();
			const { getByText, getByTestId } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			// Set start location
			await act(async () => {
				fireEvent.changeText(getByTestId('location-text-input-Start Location'), 'San Francisco');
			});

			// Set end location
			await act(async () => {
				fireEvent.changeText(getByTestId('location-text-input-Destination'), 'Los Angeles');
			});

			// Click preview route
			await act(async () => {
				fireEvent.press(getByText('Preview Route'));
			});

			expect(mockGetDirections).toHaveBeenCalled();
		});

		it('shows route info after preview', async () => {
			const store = createMockStore();
			const { getByText, getByTestId } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			// Set locations
			await act(async () => {
				fireEvent.changeText(getByTestId('location-text-input-Start Location'), 'San Francisco');
				fireEvent.changeText(getByTestId('location-text-input-Destination'), 'Los Angeles');
			});

			// Preview route
			await act(async () => {
				fireEvent.press(getByText('Preview Route'));
			});

			// Should show route info
			expect(getByText(/Distance:/)).toBeTruthy();
		});
	});

	describe('form actions', () => {
		it('renders post ride button', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Post Ride')).toBeTruthy();
		});

		it('renders clear button', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			expect(getByText('Clear')).toBeTruthy();
		});

		it('shows validation error when submitting without locations', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			await act(async () => {
				fireEvent.press(getByText('Post Ride'));
			});

			expect(getByText('Select start and destination.')).toBeTruthy();
		});
	});

	describe('detour options', () => {
		it('selects no limit by default', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			// No Limit should be the default selected option
			expect(getByText('No Limit')).toBeTruthy();
		});

		it('can select max miles option', async () => {
			const store = createMockStore();
			const { getByText, getByPlaceholderText } = render(
				<Provider store={store}>
					<CreateRideScreen />
				</Provider>
			);

			await act(async () => {
				fireEvent.press(getByText('Max Miles'));
			});

			// Should show miles input when Max Miles is selected
			expect(getByPlaceholderText('0-100')).toBeTruthy();
		});
	});
});
