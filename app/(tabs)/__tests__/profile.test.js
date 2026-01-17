/**
 * Tests for app/(tabs)/profile.js
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

// Mock expo-router with useFocusEffect
jest.mock('expo-router', () => ({
	router: {
		push: jest.fn(),
		replace: jest.fn(),
	},
	useFocusEffect: (callback) => {
		// Execute the callback immediately for testing
		const React = require('react');
		React.useEffect(() => {
			const cleanup = callback();
			return cleanup;
		}, []);
	},
}));

// Mock firebase auth
const mockSignOut = jest.fn(() => Promise.resolve());
jest.mock('firebase/auth', () => ({
	signOut: (...args) => mockSignOut(...args),
}));

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

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock AuthContext
const mockRefreshProfile = jest.fn();
jest.mock('../../../hooks/AuthContext', () => ({
	useAuth: () => ({
		refreshProfile: mockRefreshProfile,
	}),
}));

// Mock ReviewCard component
jest.mock('../../../components/ReviewCard', () => {
	const { Text, View } = require('react-native');
	return function MockReviewCard({ review }) {
		return (
			<View testID="review-card">
				<Text>{review?.reviewerName || 'Anonymous'}</Text>
				<Text>{review?.comment || ''}</Text>
			</View>
		);
	};
});

// Mock StarRating component
jest.mock('../../../components/StarRating', () => {
	const { Text, View } = require('react-native');
	return function MockStarRating({ rating }) {
		return (
			<View testID="star-rating">
				<Text>Rating: {rating}</Text>
			</View>
		);
	};
});

// Create static reducers that ignore actions
const createStaticReducer = (initialState) => (state = initialState) => state;

const createMockStore = (initialState = {}) => {
	const defaultAuthState = {
		user: { uid: 'user123', email: 'user@example.com' },
		userProfile: {
			name: 'Test User',
			email: 'user@example.com',
			school: 'UCLA',
			major: 'Computer Science',
			graduationYear: '2025',
			pronouns: 'they/them',
			bio: 'Test bio here',
			averageRating: 4.5,
			totalRatings: 10,
			totalTripsCompleted: 15,
			emergencyContacts: [
				{ name: 'John Doe', phone: '555-123-4567', relationship: 'Parent' }
			],
			ridePreferences: {
				chattiness: 'Moderate',
				musicTaste: 'Pop',
				petFriendly: true,
				smokingOk: false,
			}
		},
		loading: false,
		error: null,
	};
	
	const defaultReviewsState = {
		userReviews: [],
		loading: false,
		error: null,
	};
	
	const authState = { ...defaultAuthState, ...(initialState.auth || {}) };
	const reviewsState = { ...defaultReviewsState, ...(initialState.reviews || {}) };
	
	return configureStore({
		reducer: {
			auth: createStaticReducer(authState),
			reviews: createStaticReducer(reviewsState),
		},
		preloadedState: {
			auth: authState,
			reviews: reviewsState,
		},
	});
};

import ProfileScreen from '../profile';
import { router } from 'expo-router';

describe('ProfileScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders profile header with name', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('Test User')).toBeTruthy();
		});

		it('renders user email', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('user@example.com')).toBeTruthy();
		});

		it('shows loading state', async () => {
			const store = createMockStore({ auth: { loading: true } });
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('Loading your profile...')).toBeTruthy();
		});
	});

	describe('user details', () => {
		it('renders user school', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('School: UCLA')).toBeTruthy();
		});

		it('renders user major', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('Major: Computer Science')).toBeTruthy();
		});

		it('renders graduation year', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('Graduation Year: 2025')).toBeTruthy();
		});

		it('renders user bio', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('Bio: Test bio here')).toBeTruthy();
		});
	});

	describe('rating display', () => {
		it('shows rating when available', async () => {
			const store = createMockStore();
			const { getByText, getByTestId } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByTestId('star-rating')).toBeTruthy();
			expect(getByText('4.5 (10 reviews)')).toBeTruthy();
		});

		it('shows trips completed count', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('15 trips completed')).toBeTruthy();
		});

		it('navigates to reviews page on rating tap', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			fireEvent.press(getByText('Tap to view all reviews'));
			expect(router.push).toHaveBeenCalledWith('/reviews/user123');
		});
	});

	describe('emergency contacts', () => {
		it('shows emergency contact name', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('Emergency Contacts')).toBeTruthy();
			expect(getByText('Name: John Doe')).toBeTruthy();
		});

		it('shows emergency contact phone', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('Phone: 555-123-4567')).toBeTruthy();
		});

		it('shows empty state when no contacts', async () => {
			const store = createMockStore({
				auth: {
					userProfile: {
						name: 'Test',
						emergencyContacts: [],
					}
				}
			});
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('No emergency contacts added.')).toBeTruthy();
		});
	});

	describe('ride preferences', () => {
		it('shows chattiness preference', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('Chattiness: Moderate')).toBeTruthy();
		});

		it('shows music preference', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('Music Taste: Pop')).toBeTruthy();
		});

		it('shows pet friendly preference', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('Pet Friendly: Yes')).toBeTruthy();
		});

		it('shows no preferences message when not set', async () => {
			const store = createMockStore({
				auth: {
					userProfile: {
						name: 'Test',
						ridePreferences: null,
					}
				}
			});
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('No ride preferences set.')).toBeTruthy();
		});
	});

	describe('reviews section', () => {
		it('shows no reviews message when empty', async () => {
			const store = createMockStore({ reviews: { userReviews: [] } });
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('No reviews yet')).toBeTruthy();
			expect(getByText('Complete trips to receive reviews')).toBeTruthy();
		});

		it('renders review cards when reviews exist', async () => {
			const mockReviews = [
				{ id: 'r1', reviewerName: 'Reviewer 1', comment: 'Great!', rating: 5 },
				{ id: 'r2', reviewerName: 'Reviewer 2', comment: 'Good', rating: 4 },
			];
			const store = createMockStore({ reviews: { userReviews: mockReviews } });
			const { getAllByTestId } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			const reviewCards = getAllByTestId('review-card');
			expect(reviewCards.length).toBe(2);
		});

		it('shows view all button when more than 3 reviews', async () => {
			const mockReviews = [
				{ id: 'r1', reviewerName: 'R1', comment: 'A', rating: 5 },
				{ id: 'r2', reviewerName: 'R2', comment: 'B', rating: 4 },
				{ id: 'r3', reviewerName: 'R3', comment: 'C', rating: 5 },
				{ id: 'r4', reviewerName: 'R4', comment: 'D', rating: 4 },
			];
			const store = createMockStore({ reviews: { userReviews: mockReviews } });
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('View all 4 reviews')).toBeTruthy();
		});

		it('shows loading state for reviews', async () => {
			const store = createMockStore({ reviews: { userReviews: [], loading: true } });
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			expect(getByText('Loading reviews...')).toBeTruthy();
		});
	});

	describe('navigation', () => {
		it('navigates to edit profile on button press', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			fireEvent.press(getByText('Edit Profile'));
			expect(router.push).toHaveBeenCalledWith('/modal/edit-profile');
		});
	});

	describe('logout', () => {
		it('signs out and redirects on logout', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ProfileScreen />
				</Provider>
			);

			await act(async () => {
				fireEvent.press(getByText('Logout'));
			});

			expect(mockSignOut).toHaveBeenCalled();
			expect(router.replace).toHaveBeenCalledWith('/(auth)/signin');
		});
	});
});
