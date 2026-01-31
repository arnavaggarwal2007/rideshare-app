/**
 * Tests for app/chat/[id].js - Chat Screen
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
const mockGetChatById = jest.fn();
const mockGetTripById = jest.fn();
const mockSubscribeToChat = jest.fn();

jest.mock('../../../services/firebase/firestore', () => ({
	getChatById: (...args) => mockGetChatById(...args),
	getTripById: (...args) => mockGetTripById(...args),
	subscribeToChat: (...args) => mockSubscribeToChat(...args),
}));

// Mock notifications
jest.mock('../../../services/notifications/pushNotifications', () => ({
	registerForPushNotificationsAsync: jest.fn(),
}));

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

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

// Mock expo-router
jest.mock('expo-router', () => ({
	router: {
		push: jest.fn(),
		replace: jest.fn(),
		back: jest.fn(),
	},
	useLocalSearchParams: () => ({ id: 'chat123' }),
}));

// Mock react-native-gifted-chat
jest.mock('react-native-gifted-chat', () => {
	const { Text, View, FlatList } = require('react-native');
	return {
		GiftedChat: ({ messages, onSend, renderInputToolbar }) => (
			<View testID="gifted-chat">
				<FlatList
					data={messages}
					keyExtractor={(item) => item._id}
					renderItem={({ item }) => (
						<View testID={`message-${item._id}`}>
							<Text>{item.text}</Text>
						</View>
					)}
				/>
				{renderInputToolbar && renderInputToolbar()}
			</View>
		),
	};
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Create static reducers that ignore actions
const createStaticReducer = (initialState) => (state = initialState) => state;

const createMockStore = (initialState = {}) => {
	const defaultAuthState = {
		user: { uid: 'user123', email: 'user@example.com' },
		userProfile: { name: 'Test User', photoURL: null },
		loading: false,
		error: null,
	};
	
	const defaultChatsState = {
		currentChat: null,
		messages: [],
		loading: false,
		error: null,
	};
	
	const authState = { ...defaultAuthState, ...(initialState.auth || {}) };
	const chatsState = { ...defaultChatsState, ...(initialState.chats || {}) };
	
	return configureStore({
		reducer: {
			auth: createStaticReducer(authState),
			chats: createStaticReducer(chatsState),
		},
		preloadedState: {
			auth: authState,
			chats: chatsState,
		},
	});
};

import { router } from 'expo-router';
import ChatScreen from '../[id]';

describe('ChatScreen', () => {
	const mockChat = {
		id: 'chat123',
		participants: ['user123', 'user456'],
		participantDetails: {
			user456: { name: 'John Driver', photoURL: null }
		},
		tripId: 'trip123',
	};

	const mockMessages = [
		{
			id: 'msg1',
			text: 'Hello!',
			senderId: 'user456',
			senderName: 'John Driver',
			timestamp: { toDate: () => new Date('2025-01-20T10:00:00') },
		},
		{
			id: 'msg2',
			text: 'Hi there!',
			senderId: 'user123',
			senderName: 'Test User',
			timestamp: { toDate: () => new Date('2025-01-20T10:01:00') },
		},
	];

	const mockTrip = {
		id: 'trip123',
		startLocation: { placeName: 'San Francisco, California' },
		endLocation: { placeName: 'Los Angeles, California' },
		departureDate: '2025-01-25',
		departureTime: '10:00',
		seatsBooked: 2,
		status: 'confirmed',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockGetChatById.mockResolvedValue(mockChat);
		mockGetTripById.mockResolvedValue(mockTrip);
		mockSubscribeToChat.mockImplementation((chatId, callback) => {
			callback(mockMessages);
			return jest.fn(); // unsubscribe function
		});
	});

	describe('rendering', () => {
		it('renders chat header', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('John Driver')).toBeTruthy();
			});
		});

		it('renders back button', async () => {
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			expect(getByTestId('icon-arrow-back')).toBeTruthy();
		});

		it('renders gifted chat component', async () => {
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('gifted-chat')).toBeTruthy();
			});
		});
	});

	describe('loading state', () => {
		it('shows loading indicator initially', async () => {
			mockSubscribeToChat.mockImplementation(() => jest.fn());
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			expect(getByText('Loading chat...')).toBeTruthy();
		});
	});

	describe('error state', () => {
		it('shows error when chat not found', async () => {
			mockGetChatById.mockResolvedValue(null);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Chat not found')).toBeTruthy();
			});
		});
	});

	describe('trip card', () => {
		it('shows trip route', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText(/San Francisco.*→.*Los Angeles/)).toBeTruthy();
			});
		});

		it('shows seats booked', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('2 seat(s) booked')).toBeTruthy();
			});
		});

		it('shows confirmation badge for confirmed trips', async () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText(/confirmed your seat request/)).toBeTruthy();
			});
		});
	});

	describe('navigation', () => {
		it('navigates back on back button press', async () => {
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('icon-arrow-back')).toBeTruthy();
			});

			const backButton = getByTestId('icon-arrow-back').parent;
			await act(async () => {
				fireEvent.press(backButton);
			});

			expect(router.back).toHaveBeenCalled();
		});
	});

	describe('header actions', () => {
		it('renders call button', async () => {
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('icon-call-outline')).toBeTruthy();
			});
		});

		it('renders video call button', async () => {
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('icon-videocam-outline')).toBeTruthy();
			});
		});

		it('renders info button', async () => {
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('icon-information-circle-outline')).toBeTruthy();
			});
		});
	});

	describe('input toolbar', () => {
		it('renders message input', async () => {
			const store = createMockStore();
			const { getByPlaceholderText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByPlaceholderText('Type a message...')).toBeTruthy();
			});
		});

		it('renders send button', async () => {
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('icon-send')).toBeTruthy();
			});
		});

		it('allows typing in message input', async () => {
			const store = createMockStore();
			const { getByPlaceholderText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				const input = getByPlaceholderText('Type a message...');
				fireEvent.changeText(input, 'Hello world');
				expect(input.props.value).toBe('Hello world');
			});
		});
	});

	describe('info modal', () => {
		it('opens info modal when info button pressed', async () => {
			const store = createMockStore();
			const { getByTestId, getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('icon-information-circle-outline')).toBeTruthy();
			});

			const infoButton = getByTestId('icon-information-circle-outline').parent;
			await act(async () => {
				fireEvent.press(infoButton);
			});

			await waitFor(() => {
				expect(getByText('Chat Information')).toBeTruthy();
			});
		});

		it('shows view profile option in modal', async () => {
			const store = createMockStore();
			const { getByTestId, getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('icon-information-circle-outline')).toBeTruthy();
			});

			const infoButton = getByTestId('icon-information-circle-outline').parent;
			await act(async () => {
				fireEvent.press(infoButton);
			});

			await waitFor(() => {
				expect(getByText("View John Driver's Profile")).toBeTruthy();
			});
		});

		it('shows view trip option in modal', async () => {
			const store = createMockStore();
			const { getByTestId, getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('icon-information-circle-outline')).toBeTruthy();
			});

			const infoButton = getByTestId('icon-information-circle-outline').parent;
			await act(async () => {
				fireEvent.press(infoButton);
			});

			await waitFor(() => {
				expect(getByText('View Trip Details')).toBeTruthy();
			});
		});

		it('navigates to profile when option pressed', async () => {
			const store = createMockStore();
			const { getByTestId, getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('icon-information-circle-outline')).toBeTruthy();
			});

			const infoButton = getByTestId('icon-information-circle-outline').parent;
			await act(async () => {
				fireEvent.press(infoButton);
			});

			await waitFor(() => {
				expect(getByText("View John Driver's Profile")).toBeTruthy();
			});

			await act(async () => {
				fireEvent.press(getByText("View John Driver's Profile"));
			});

			expect(router.push).toHaveBeenCalledWith('/user/user456');
		});

		it('navigates to trip when option pressed', async () => {
			const store = createMockStore();
			const { getByTestId, getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('icon-information-circle-outline')).toBeTruthy();
			});

			const infoButton = getByTestId('icon-information-circle-outline').parent;
			await act(async () => {
				fireEvent.press(infoButton);
			});

			await waitFor(() => {
				expect(getByText('View Trip Details')).toBeTruthy();
			});

			await act(async () => {
				fireEvent.press(getByText('View Trip Details'));
			});

			expect(router.push).toHaveBeenCalledWith('/trip/trip123');
		});

		it('closes modal when cancel pressed', async () => {
			const store = createMockStore();
			const { getByTestId, getByText, queryByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('icon-information-circle-outline')).toBeTruthy();
			});

			const infoButton = getByTestId('icon-information-circle-outline').parent;
			await act(async () => {
				fireEvent.press(infoButton);
			});

			await waitFor(() => {
				expect(getByText('Chat Information')).toBeTruthy();
			});

			await act(async () => {
				fireEvent.press(getByText('Cancel'));
			});

			await waitFor(() => {
				expect(queryByText('Chat Information')).toBeNull();
			});
		});
	});

	describe('trip card variations', () => {
		it('shows pending status without confirmation badge', async () => {
			const pendingTrip = { ...mockTrip, status: 'pending' };
			mockGetTripById.mockResolvedValue(pendingTrip);
			
			const store = createMockStore();
			const { queryByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(queryByText(/confirmed your seat request/)).toBeNull();
			});
		});

		it('handles trip without departureTimestamp', async () => {
			const tripWithoutTimestamp = { 
				...mockTrip, 
				departureTimestamp: null,
			};
			mockGetTripById.mockResolvedValue(tripWithoutTimestamp);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText(/San Francisco.*→.*Los Angeles/)).toBeTruthy();
			});
		});
	});

	describe('message handling', () => {
		it('handles messages without timestamp', async () => {
			const messagesWithoutTimestamp = [
				{
					id: 'msg1',
					text: 'Hello!',
					senderId: 'user456',
					senderName: 'John Driver',
					timestamp: null,
				},
			];
			
			mockSubscribeToChat.mockImplementation((chatId, callback) => {
				callback(messagesWithoutTimestamp);
				return jest.fn();
			});
			
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('gifted-chat')).toBeTruthy();
			});
		});

		it('handles invalid messages gracefully', async () => {
			const invalidMessages = [
				{ id: null, text: 'Invalid', senderId: null },
				{ id: 'valid', text: 'Valid message', senderId: 'user456', senderName: 'John' },
			];
			
			mockSubscribeToChat.mockImplementation((chatId, callback) => {
				callback(invalidMessages);
				return jest.fn();
			});
			
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('gifted-chat')).toBeTruthy();
			});
		});
	});

	describe('error handling', () => {
		it('shows error when chat fetch fails', async () => {
			mockGetChatById.mockRejectedValue(new Error('Network error'));
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Failed to load chat')).toBeTruthy();
			});
		});

		it('handles trip fetch error gracefully', async () => {
			mockGetTripById.mockRejectedValue(new Error('Trip not found'));
			
			const store = createMockStore();
			const { getByText, queryByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				// Chat should still render, just without trip card
				expect(getByText('John Driver')).toBeTruthy();
				expect(queryByText(/seat\(s\) booked/)).toBeNull();
			});
		});
	});

	describe('cleanup', () => {
		it('unsubscribes from chat on unmount', async () => {
			const mockUnsubscribe = jest.fn();
			mockSubscribeToChat.mockImplementation((chatId, callback) => {
				callback(mockMessages);
				return mockUnsubscribe;
			});
			
			const store = createMockStore();
			const { unmount } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(mockSubscribeToChat).toHaveBeenCalled();
			});

			unmount();
			expect(mockUnsubscribe).toHaveBeenCalled();
		});
	});

	describe('message timestamps edge cases', () => {
		it('handles messages with Date object timestamp', async () => {
			const messagesWithDateTimestamp = [
				{
					id: 'msg-date',
					text: 'Message with Date',
					senderId: 'user456',
					senderName: 'John Driver',
					timestamp: new Date('2025-01-20T10:00:00'),
				},
			];
			
			mockSubscribeToChat.mockImplementation((chatId, callback) => {
				callback(messagesWithDateTimestamp);
				return jest.fn();
			});
			
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('gifted-chat')).toBeTruthy();
			});
		});

		it('handles messages with invalid date', async () => {
			const messagesWithInvalidDate = [
				{
					id: 'msg-invalid',
					text: 'Message with invalid date',
					senderId: 'user456',
					senderName: 'John Driver',
					timestamp: 'not-a-date',
				},
			];
			
			mockSubscribeToChat.mockImplementation((chatId, callback) => {
				callback(messagesWithInvalidDate);
				return jest.fn();
			});
			
			const store = createMockStore();
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('gifted-chat')).toBeTruthy();
			});
		});
	});

	describe('location formatting', () => {
		it('handles location with county in name', async () => {
			const tripWithCounty = { 
				...mockTrip, 
				startLocation: { placeName: 'San Francisco, San Francisco County, California, United States' },
			};
			mockGetTripById.mockResolvedValue(tripWithCounty);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				// Should filter out county and US
				expect(getByText(/San Francisco, California.*→/)).toBeTruthy();
			});
		});

		it('handles location with USA instead of United States', async () => {
			const tripWithUSA = { 
				...mockTrip, 
				startLocation: { placeName: 'San Jose, California, USA' },
			};
			mockGetTripById.mockResolvedValue(tripWithUSA);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText(/San Jose, California.*→/)).toBeTruthy();
			});
		});

		it('handles location with single part', async () => {
			const tripSinglePart = { 
				...mockTrip, 
				startLocation: { placeName: 'Downtown' },
			};
			mockGetTripById.mockResolvedValue(tripSinglePart);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText(/Downtown.*→/)).toBeTruthy();
			});
		});

		it('handles location with no placeName', async () => {
			const tripNoPlace = { 
				...mockTrip, 
				startLocation: { address: null, placeName: null },
			};
			mockGetTripById.mockResolvedValue(tripNoPlace);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText(/Unknown.*→/)).toBeTruthy();
			});
		});
	});

	describe('trip date/time formatting', () => {
		it('formats trip with departureTimestamp', async () => {
			const tripWithTimestamp = { 
				...mockTrip, 
				departureTimestamp: { toDate: () => new Date('2025-06-15T14:30:00') },
			};
			mockGetTripById.mockResolvedValue(tripWithTimestamp);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText(/Jun 15, 2025/)).toBeTruthy();
			});
		});

		it('formats trip with Date object timestamp', async () => {
			const tripWithDate = { 
				...mockTrip, 
				departureTimestamp: new Date('2025-07-20T10:00:00'),
			};
			mockGetTripById.mockResolvedValue(tripWithDate);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText(/Jul 20, 2025/)).toBeTruthy();
			});
		});

		it('shows Date TBD for invalid date', async () => {
			const tripInvalidDate = { 
				...mockTrip, 
				departureTimestamp: null,
				departureDate: null,
				createdAt: null,
			};
			mockGetTripById.mockResolvedValue(tripInvalidDate);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Date TBD')).toBeTruthy();
			});
		});

		it('shows Time TBD for invalid time', async () => {
			const tripInvalidTime = { 
				...mockTrip, 
				departureTimestamp: null,
				departureTime: null,
			};
			mockGetTripById.mockResolvedValue(tripInvalidTime);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('Time TBD')).toBeTruthy();
			});
		});

		it('falls back to createdAt for date', async () => {
			const tripWithCreatedAt = { 
				...mockTrip, 
				departureTimestamp: null,
				departureDate: null,
				createdAt: { toDate: () => new Date('2025-03-10T09:00:00') },
			};
			mockGetTripById.mockResolvedValue(tripWithCreatedAt);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText(/Mar 10, 2025/)).toBeTruthy();
			});
		});
	});

	describe('user state edge cases', () => {
		it('handles missing userProfile', async () => {
			const store = createMockStore({ 
				auth: { 
					user: { uid: 'user123', email: 'user@example.com' },
					userProfile: null 
				} 
			});
			const { getByTestId } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByTestId('gifted-chat')).toBeTruthy();
			});
		});

		it('handles missing user', async () => {
			const store = createMockStore({ 
				auth: { 
					user: null,
					userProfile: null 
				} 
			});
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			// When no user, shows loading (since subscription is skipped)
			expect(getByText('Loading chat...')).toBeTruthy();
		});
	});

	describe('chat without trip', () => {
		it('renders chat without trip card when no tripId', async () => {
			const chatNoTrip = { ...mockChat, tripId: null };
			mockGetChatById.mockResolvedValue(chatNoTrip);
			mockGetTripById.mockResolvedValue(null);
			
			const store = createMockStore();
			const { getByText, queryByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('John Driver')).toBeTruthy();
				expect(queryByText(/seat\(s\) booked/)).toBeNull();
			});
		});
	});

	describe('seats booked display', () => {
		it('shows default 1 seat when seatsBooked is missing', async () => {
			const tripNoSeats = { ...mockTrip, seatsBooked: null };
			mockGetTripById.mockResolvedValue(tripNoSeats);
			
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<ChatScreen />
				</Provider>
			);

			await waitFor(() => {
				expect(getByText('1 seat(s) booked')).toBeTruthy();
			});
		});
	});
});
