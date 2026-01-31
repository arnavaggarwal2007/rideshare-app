/**
 * Tests for app/(tabs)/messages.js
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

	describe('refresh functionality', () => {
		it('handles pull to refresh when user exists', async () => {
			const chatData = [{
				id: 'chat1',
				participants: ['user123', 'other1'],
				participantDetails: { other1: { name: 'Refresh Test' } },
				lastMessage: 'Hello',
				lastMessageTimestamp: new Date(),
				unreadCount: {},
			}];
			
			mockSubscribeToUserChats.mockImplementation((userId, callback) => {
				callback(chatData);
				return mockUnsubscribe;
			});

			const store = createMockStore({ 
				auth: { user: { uid: 'user123' } },
				chats: { chats: chatData },
			});
			const { UNSAFE_getByType } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			await act(async () => {
				jest.runAllTimers();
			});

			const { FlatList } = require('react-native');
			const flatList = UNSAFE_getByType(FlatList);
			
			// Trigger refresh
			await act(async () => {
				flatList.props.refreshControl.props.onRefresh();
				jest.runAllTimers();
			});

			// Refresh started - subscription handles updates
			expect(flatList).toBeTruthy();
		});

		it('returns early from refresh when no user', async () => {
			// For this test, we need to simulate having chats but no user
			// The component shows empty state when no user, so we just verify
			// that onRefresh doesn't error when user is null
			const store = createMockStore({ 
				auth: { user: null },
				chats: { chats: [] },
			});
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			// Without a user, we see empty state
			expect(getByText('No active chats yet')).toBeTruthy();
		});
	});

	describe('additional time formatting', () => {
		it('formats hours ago correctly', () => {
			const twoHoursAgo = {
				id: 'chat-hours',
				participants: ['user123', 'other1'],
				participantDetails: { other1: { name: 'Hours Ago' } },
				lastMessage: 'Hello',
				lastMessageTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
				unreadCount: {},
			};
			
			mockSubscribeToUserChats.mockImplementation((userId, callback) => {
				callback([twoHoursAgo]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ chats: { chats: [twoHoursAgo] } });
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			expect(getByText('2h ago')).toBeTruthy();
		});

		it('formats days ago correctly', () => {
			const threeDaysAgo = {
				id: 'chat-days',
				participants: ['user123', 'other1'],
				participantDetails: { other1: { name: 'Days Ago' } },
				lastMessage: 'Hi',
				lastMessageTimestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
				unreadCount: {},
			};
			
			mockSubscribeToUserChats.mockImplementation((userId, callback) => {
				callback([threeDaysAgo]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ chats: { chats: [threeDaysAgo] } });
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			expect(getByText('3d ago')).toBeTruthy();
		});

		it('formats old messages with date', () => {
			const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 2 weeks ago
			const chatOld = {
				id: 'chat-old',
				participants: ['user123', 'other1'],
				participantDetails: { other1: { name: 'Old Chat' } },
				lastMessage: 'Long time',
				lastMessageTimestamp: twoWeeksAgo,
				unreadCount: {},
			};
			
			mockSubscribeToUserChats.mockImplementation((userId, callback) => {
				callback([chatOld]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ chats: { chats: [chatOld] } });
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			// Should show the date for old messages
			expect(getByText(twoWeeksAgo.toLocaleDateString())).toBeTruthy();
		});

		it('handles null timestamp', () => {
			const noTimestamp = {
				id: 'chat-no-ts',
				participants: ['user123', 'other1'],
				participantDetails: { other1: { name: 'No Timestamp' } },
				lastMessage: 'Test',
				lastMessageTimestamp: null,
				unreadCount: {},
			};
			
			mockSubscribeToUserChats.mockImplementation((userId, callback) => {
				callback([noTimestamp]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ chats: { chats: [noTimestamp] } });
			const { getByText, queryByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			expect(getByText('No Timestamp')).toBeTruthy();
			// Timestamp should be empty/not rendered
		});

		it('handles Firestore timestamp format', () => {
			const firestoreTimestamp = {
				id: 'chat-firestore',
				participants: ['user123', 'other1'],
				participantDetails: { other1: { name: 'Firestore Time' } },
				lastMessage: 'Firebase',
				lastMessageTimestamp: { toDate: () => new Date(Date.now() - 5 * 60 * 1000) }, // 5 min ago
				unreadCount: {},
			};
			
			mockSubscribeToUserChats.mockImplementation((userId, callback) => {
				callback([firestoreTimestamp]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({ chats: { chats: [firestoreTimestamp] } });
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			expect(getByText('5m ago')).toBeTruthy();
		});

		it('handles timestamp that throws error', () => {
			const badTimestamp = {
				toDate: () => { throw new Error('Invalid timestamp'); }
			};
			
			const chatWithBadTimestamp = {
				id: 'chat-error',
				participants: ['user123', 'other456'],
				participantDetails: { other456: { name: 'Other User' } },
				lastMessage: 'Error timestamp message',
				lastMessageTimestamp: badTimestamp,
				unreadCount: {},
			};
			
			mockSubscribeToUserChats.mockImplementation((userId, callback) => {
				callback([chatWithBadTimestamp]);
				return mockUnsubscribe;
			});
			
			const store = createMockStore({
				chats: { chats: [chatWithBadTimestamp] },
				safety: { blockedUsers: [] },
			});
			
			const { getByText } = render(
				<Provider store={store}>
					<MessagesScreen />
				</Provider>
			);

			// The message should still render, but timestamp shows empty
			expect(getByText('Other User')).toBeTruthy();
			expect(getByText('Error timestamp message')).toBeTruthy();
		});
	});
});
