import { configureStore } from '@reduxjs/toolkit';
import chatsReducer, {
	createChatThunk,
	sendMessageThunk,
	markMessagesReadThunk,
	setChats,
	setCurrentChat,
	setMessages,
	addMessage,
	updateChatPreview,
	incrementUnreadCount,
	resetUnreadCount,
	setError,
	clearError,
} from '../chatsSlice';

// Mock the firestore module
jest.mock('../../../services/firebase/firestore', () => ({
	createChatRoom: jest.fn(),
	sendChatMessage: jest.fn(),
	markChatMessagesAsRead: jest.fn(),
}));

import { createChatRoom, sendChatMessage, markChatMessagesAsRead } from '../../../services/firebase/firestore';

describe('chatsSlice', () => {
	let store;

	beforeEach(() => {
		store = configureStore({
			reducer: { chats: chatsReducer },
		});
		jest.clearAllMocks();
	});

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const state = store.getState().chats;
			expect(state.chats).toEqual([]);
			expect(state.currentChat).toBeNull();
			expect(state.messages).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.sendingMessage).toBe(false);
			expect(state.error).toBeNull();
			expect(state.unreadCounts).toEqual({});
		});
	});

	describe('synchronous reducers', () => {
		it('setChats should update chats array', () => {
			const chats = [{ id: '1', participants: ['user1', 'user2'] }];
			store.dispatch(setChats(chats));
			expect(store.getState().chats.chats).toEqual(chats);
		});

		it('setCurrentChat should update currentChat', () => {
			const chat = { id: '1', participants: ['user1', 'user2'] };
			store.dispatch(setCurrentChat(chat));
			expect(store.getState().chats.currentChat).toEqual(chat);
		});

		it('setMessages should update messages array', () => {
			const messages = [{ id: '1', text: 'Hello' }];
			store.dispatch(setMessages(messages));
			expect(store.getState().chats.messages).toEqual(messages);
		});

		it('addMessage should add message to messages array', () => {
			store.dispatch(addMessage({ id: '1', text: 'Hello' }));
			expect(store.getState().chats.messages).toHaveLength(1);
		});

		it('updateChatPreview should update chat lastMessage', () => {
			store.dispatch(setChats([{ id: '1', lastMessage: 'Old', updatedAt: new Date() }]));
			store.dispatch(updateChatPreview({
				chatId: '1',
				lastMessage: 'New message',
				updatedAt: new Date(),
			}));
			
			expect(store.getState().chats.chats[0].lastMessage).toBe('New message');
		});

		it('updateChatPreview should not crash if chat not found', () => {
			store.dispatch(setChats([{ id: '1' }]));
			store.dispatch(updateChatPreview({
				chatId: '999',
				lastMessage: 'New',
				updatedAt: new Date(),
			}));
			
			expect(store.getState().chats.chats[0].lastMessage).toBeUndefined();
		});

		it('incrementUnreadCount should increment unread count for user', () => {
			store.dispatch(setChats([{
				id: '1',
				unreadCount: { user1: 0, user2: 0 },
			}]));
			store.dispatch(incrementUnreadCount({ chatId: '1', userId: 'user1' }));
			
			expect(store.getState().chats.chats[0].unreadCount.user1).toBe(1);
		});

		it('incrementUnreadCount should handle missing unreadCount', () => {
			store.dispatch(setChats([{ id: '1' }]));
			// Should not crash
			store.dispatch(incrementUnreadCount({ chatId: '1', userId: 'user1' }));
			expect(store.getState().chats.chats[0].unreadCount).toBeUndefined();
		});

		it('resetUnreadCount should reset unread count for user', () => {
			store.dispatch(setChats([{
				id: '1',
				unreadCount: { user1: 5, user2: 3 },
			}]));
			store.dispatch(resetUnreadCount({ chatId: '1', userId: 'user1' }));
			
			expect(store.getState().chats.chats[0].unreadCount.user1).toBe(0);
			expect(store.getState().chats.chats[0].unreadCount.user2).toBe(3);
		});

		it('setError should set error state', () => {
			store.dispatch(setError('Test error'));
			expect(store.getState().chats.error).toBe('Test error');
		});

		it('clearError should clear error state', () => {
			store.dispatch(setError('Test error'));
			store.dispatch(clearError());
			expect(store.getState().chats.error).toBeNull();
		});
	});

	describe('createChatThunk', () => {
		const chatParams = {
			driverId: 'driver1',
			riderId: 'rider1',
			tripId: 'trip1',
			rideId: 'ride1',
			driverProfile: { name: 'John', photoURL: 'http://photo.jpg' },
			riderProfile: { name: 'Jane', photoURL: 'http://photo2.jpg' },
		};

		it('should create chat successfully', async () => {
			createChatRoom.mockResolvedValueOnce('new-chat-id');

			await store.dispatch(createChatThunk(chatParams));

			const state = store.getState().chats;
			expect(state.chats).toHaveLength(1);
			expect(state.chats[0].id).toBe('new-chat-id');
			expect(state.chats[0].participants).toEqual(['driver1', 'rider1']);
			expect(state.currentChat.id).toBe('new-chat-id');
			expect(state.loading).toBe(false);
		});

		it('should handle missing profile names', async () => {
			createChatRoom.mockResolvedValueOnce('new-chat-id');

			await store.dispatch(createChatThunk({
				...chatParams,
				driverProfile: {},
				riderProfile: {},
			}));

			const state = store.getState().chats;
			expect(state.chats[0].participantDetails.driver1.name).toBe('Driver');
			expect(state.chats[0].participantDetails.rider1.name).toBe('Rider');
		});

		it('should handle create error', async () => {
			createChatRoom.mockRejectedValueOnce(new Error('Create failed'));

			await store.dispatch(createChatThunk(chatParams));

			expect(store.getState().chats.error).toBe('Create failed');
			expect(store.getState().chats.chats).toHaveLength(0);
		});

		it('should handle error without message', async () => {
			createChatRoom.mockRejectedValueOnce({});

			await store.dispatch(createChatThunk(chatParams));

			expect(store.getState().chats.error).toBe('Failed to create chat');
		});

		it('should set loading state while creating', async () => {
			let resolvePromise;
			createChatRoom.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(createChatThunk(chatParams));
			expect(store.getState().chats.loading).toBe(true);

			resolvePromise('chat-id');
			await promise;

			expect(store.getState().chats.loading).toBe(false);
		});
	});

	describe('sendMessageThunk', () => {
		const messageParams = {
			chatId: 'chat1',
			text: 'Hello!',
			senderId: 'user1',
			senderName: 'John',
			senderPhotoURL: 'http://photo.jpg',
		};

		it('should send message successfully', async () => {
			sendChatMessage.mockResolvedValueOnce('msg-id');

			const result = await store.dispatch(sendMessageThunk(messageParams));

			expect(result.payload.id).toBe('msg-id');
			expect(result.payload.text).toBe('Hello!');
			expect(sendChatMessage).toHaveBeenCalledWith(
				'chat1',
				'Hello!',
				'user1',
				'John',
				'http://photo.jpg'
			);
		});

		it('should handle send error', async () => {
			sendChatMessage.mockRejectedValueOnce(new Error('Send failed'));

			await store.dispatch(sendMessageThunk(messageParams));

			expect(store.getState().chats.error).toBe('Send failed');
		});

		it('should handle error without message', async () => {
			sendChatMessage.mockRejectedValueOnce({});

			await store.dispatch(sendMessageThunk(messageParams));

			expect(store.getState().chats.error).toBe('Failed to send message');
		});

		it('should set sendingMessage state while sending', async () => {
			let resolvePromise;
			sendChatMessage.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(sendMessageThunk(messageParams));
			expect(store.getState().chats.sendingMessage).toBe(true);

			resolvePromise('msg-id');
			await promise;

			expect(store.getState().chats.sendingMessage).toBe(false);
		});
	});

	describe('markMessagesReadThunk', () => {
		it('should mark messages as read successfully', async () => {
			store.dispatch(setChats([{
				id: 'chat1',
				unreadCount: { user1: 5, user2: 3 },
			}]));

			markChatMessagesAsRead.mockResolvedValueOnce();

			await store.dispatch(markMessagesReadThunk({
				chatId: 'chat1',
				userId: 'user1',
			}));

			expect(store.getState().chats.chats[0].unreadCount.user1).toBe(0);
			expect(store.getState().chats.chats[0].unreadCount.user2).toBe(3);
		});

		it('should handle mark read error', async () => {
			markChatMessagesAsRead.mockRejectedValueOnce(new Error('Mark failed'));

			await store.dispatch(markMessagesReadThunk({
				chatId: 'chat1',
				userId: 'user1',
			}));

			expect(store.getState().chats.error).toBe('Mark failed');
		});

		it('should handle error without message', async () => {
			markChatMessagesAsRead.mockRejectedValueOnce({});

			await store.dispatch(markMessagesReadThunk({
				chatId: 'chat1',
				userId: 'user1',
			}));

			expect(store.getState().chats.error).toBe('Failed to mark messages as read');
		});

		it('should handle chat not found gracefully', async () => {
			store.dispatch(setChats([{
				id: 'chat1',
				unreadCount: { user1: 5 },
			}]));

			markChatMessagesAsRead.mockResolvedValueOnce();

			// Should not crash if chat doesn't exist
			await store.dispatch(markMessagesReadThunk({
				chatId: 'nonexistent',
				userId: 'user1',
			}));

			// Original chat unchanged
			expect(store.getState().chats.chats[0].unreadCount.user1).toBe(5);
		});
	});

	describe('error handling in reducers', () => {
		it('should clear error on pending createChatThunk', async () => {
			store.dispatch(setError('Previous error'));
			
			let resolvePromise;
			createChatRoom.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(createChatThunk({
				driverId: 'driver1',
				riderId: 'rider1',
				tripId: 'trip1',
				rideId: 'ride1',
			}));

			expect(store.getState().chats.error).toBeNull();

			resolvePromise('chat-id');
			await promise;
		});

		it('should clear error on pending sendMessageThunk', async () => {
			store.dispatch(setError('Previous error'));
			
			let resolvePromise;
			sendChatMessage.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(sendMessageThunk({
				chatId: 'chat1',
				text: 'Hello',
				senderId: 'user1',
			}));

			expect(store.getState().chats.error).toBeNull();

			resolvePromise('msg-id');
			await promise;
		});
	});
});
