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

import { fireEvent, render, act, waitFor } from '@testing-library/react-native';
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

import ChatScreen from '../[id]';
import { router } from 'expo-router';

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
	});
});
