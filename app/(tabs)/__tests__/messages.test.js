/**
 * Tests for app/(tabs)/messages.js
 */
import { fireEvent, render, waitFor, act } from '@testing-library/react-native';
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

// Mock firestore subscription
const mockUnsubscribe = jest.fn();
const mockSubscribeToUserChats = jest.fn((userId, callback) => {
	// Simulate immediate callback with empty data
	setTimeout(() => callback([]), 0);
	return mockUnsubscribe;
});

jest.mock('../../../services/firebase/firestore', () => ({
	subscribeToUserChats: (userId, callback) => mockSubscribeToUserChats(userId, callback),
	getActiveRidesPage: jest.fn(),
}));

// Create static reducers that ignore actions
const createStaticReducer = (initialState) => (state = initialState) => state;

const createMockStore = (initialState = {}) => {
	const defaultAuthState = {
		user: { uid: 'user123', email: 'test@example.com' },
		userProfile: { name: 'Test User' },
		loading: false,
		error: null,
	};
	
	const defaultChatsState = {
		chats: [],
		currentChat: null,
		messages: [],
		loading: false,
		error: null,
	};
	
	const defaultSafetyState = {
		blockedUsers: [],
		blockedByUsers: [],
		loading: false,
		error: null,
	};
	
	const authState = { ...defaultAuthState, ...(initialState.auth || {}) };
	const chatsState = { ...defaultChatsState, ...(initialState.chats || {}) };
	const safetyState = { ...defaultSafetyState, ...(initialState.safety || {}) };
	
	return configureStore({
		reducer: {
			auth: createStaticReducer(authState),
			chats: createStaticReducer(chatsState),
			safety: createStaticReducer(safetyState),
		},
		preloadedState: {
			auth: authState,
			chats: chatsState,
			safety: safetyState,
		},
	});
};

import MessagesScreen from '../messages';

describe('MessagesScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		mockSubscribeToUserChats.mockImplementation((userId, callback) => {
			setTimeout(() => callback([]), 0);
			return mockUnsubscribe;
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('rendering', () => {
		it('renders messages header', () => {
			const store = createMockStore();
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			expect(getByText('Messages')).toBeTruthy();
		});

		it('shows empty state when no chats', async () => {
			const store = createMockStore();
			const { getByText, getByTestId } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			// Advance timers to trigger the subscription callback
			await act(async () => {
				jest.runAllTimers();
			});

			expect(getByText('No active chats yet')).toBeTruthy();
			expect(getByText('Chats will appear here once you confirm a trip')).toBeTruthy();
			expect(getByTestId('icon-chatbubbles-outline')).toBeTruthy();
		});
	});

	describe('chat list', () => {
		const mockChats = [
			{
				id: 'chat1',
				participants: ['user123', 'other1'],
				participantDetails: {
					other1: { name: 'Alice', photoURL: 'https://example.com/alice.jpg' },
				},
				lastMessage: 'Hello there!',
				lastMessageTimestamp: new Date(Date.now() - 300000), // 5 min ago
				unreadCount: { user123: 2 },
			},
			{
				id: 'chat2',
				participants: ['user123', 'other2'],
				participantDetails: {
					other2: { name: 'Bob' },
				},
				lastMessage: 'See you tomorrow',
				lastMessageTimestamp: new Date(Date.now() - 7200000), // 2 hours ago
				unreadCount: { user123: 0 },
			},
		];

		beforeEach(() => {
			mockSubscribeToUserChats.mockImplementation((userId, callback) => {
				callback(mockChats);
				return mockUnsubscribe;
			});
		});

		it('renders chat list items', () => {
			const store = createMockStore({ chats: { chats: mockChats } });
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			expect(getByText('Alice')).toBeTruthy();
			expect(getByText('Bob')).toBeTruthy();
			expect(getByText('Hello there!')).toBeTruthy();
			expect(getByText('See you tomorrow')).toBeTruthy();
		});

		it('shows unread badge for unread messages', () => {
			const store = createMockStore({ chats: { chats: mockChats } });
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			expect(getByText('2')).toBeTruthy(); // Unread count for Alice's chat
		});

		it('navigates to chat on press', () => {
			const store = createMockStore({ chats: { chats: mockChats } });
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			fireEvent.press(getByText('Alice'));
			expect(global.mockRouterPush).toHaveBeenCalledWith('/chat/chat1');
		});
	});

	describe('blocked users', () => {
		const mockChatsWithBlocked = [
			{
				id: 'chat1',
				participants: ['user123', 'blocked_user'],
				participantDetails: {
					blocked_user: { name: 'Blocked Person' },
				},
				lastMessage: 'Some message',
				lastMessageTimestamp: new Date(),
				unreadCount: { user123: 0 },
			},
			{
				id: 'chat2',
				participants: ['user123', 'normal_user'],
				participantDetails: {
					normal_user: { name: 'Normal Person' },
				},
				lastMessage: 'Hi there',
				lastMessageTimestamp: new Date(),
				unreadCount: { user123: 0 },
			},
		];

		it('shows blocked badge for blocked users', async () => {
			mockSubscribeToUserChats.mockImplementation((userId, callback) => {
				setTimeout(() => callback(mockChatsWithBlocked), 0);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({
				chats: { chats: mockChatsWithBlocked },
				safety: { blockedUsers: ['blocked_user'] },
			});
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			await act(async () => {
				jest.runAllTimers();
			});

			expect(getByText('Blocked')).toBeTruthy();
			expect(getByText('User blocked')).toBeTruthy();
		});

		it('shows normal chat for non-blocked users', async () => {
			mockSubscribeToUserChats.mockImplementation((userId, callback) => {
				setTimeout(() => callback(mockChatsWithBlocked), 0);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({
				chats: { chats: mockChatsWithBlocked },
				safety: { blockedUsers: ['blocked_user'] },
			});
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			await act(async () => {
				jest.runAllTimers();
			});

			expect(getByText('Normal Person')).toBeTruthy();
			expect(getByText('Hi there')).toBeTruthy();
		});
	});

	describe('loading state', () => {
		it('shows loading indicator while loading', () => {
			// Simulate loading by not calling callback immediately
			mockSubscribeToUserChats.mockImplementation(() => mockUnsubscribe);
			
			const store = createMockStore({ auth: { user: { uid: 'user123' } } });
			const { getByText, UNSAFE_getByType } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			// The component should show Messages header and loading indicator
			expect(getByText('Messages')).toBeTruthy();
			// The loading state shows ActivityIndicator
			const { ActivityIndicator } = require('react-native');
			expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
		});
	});

	describe('user not logged in', () => {
		it('handles missing user gracefully', () => {
			const store = createMockStore({ auth: { user: null } });
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			expect(getByText('No active chats yet')).toBeTruthy();
		});
	});

	describe('time formatting', () => {
		it('formats recent timestamps correctly', () => {
			const recentChat = {
				id: 'chat1',
				participants: ['user123', 'other1'],
				participantDetails: { other1: { name: 'Recent' } },
				lastMessage: 'Hey',
				lastMessageTimestamp: new Date(Date.now() - 30000), // 30 seconds ago
				unreadCount: {},
			};
			
			mockSubscribeToUserChats.mockImplementation((userId, callback) => {
				callback([recentChat]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ chats: { chats: [recentChat] } });
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			// Should show "Just now" for very recent messages
			expect(getByText('Just now')).toBeTruthy();
		});
	});

	describe('cleanup', () => {
		it('unsubscribes from chats on unmount', () => {
			const store = createMockStore();
			const { unmount } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			unmount();
			expect(mockUnsubscribe).toHaveBeenCalled();
		});
	});
});
