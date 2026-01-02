import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
    createChatRoom,
    markChatMessagesAsRead,
    sendChatMessage,
} from '../../services/firebase/firestore';

// Async Thunks
export const createChatThunk = createAsyncThunk(
  'chats/createChat',
  async ({ driverId, riderId, tripId, rideId, driverProfile, riderProfile }, { rejectWithValue }) => {
    try {
      const chatId = await createChatRoom(driverId, riderId, tripId, rideId, driverProfile, riderProfile);
      // Return optimistic chat object for immediate UI update
      return {
        id: chatId,
        participants: [driverId, riderId],
        participantDetails: {
          [driverId]: {
            name: driverProfile?.name || 'Driver',
            photoURL: driverProfile?.photoURL || null,
          },
          [riderId]: {
            name: riderProfile?.name || 'Rider',
            photoURL: riderProfile?.photoURL || null,
          },
        },
        tripId,
        rideId,
        lastMessage: null,
        unreadCount: {
          [driverId]: 0,
          [riderId]: 0,
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to create chat');
    }
  }
);

export const sendMessageThunk = createAsyncThunk(
  'chats/sendMessage',
  async ({ chatId, text, senderId, senderName, senderPhotoURL }, { rejectWithValue }) => {
    try {
      const messageId = await sendChatMessage(chatId, text, senderId, senderName, senderPhotoURL);
      // Return message for optimistic update
      return {
        id: messageId,
        chatId,
        text,
        senderId,
        senderName,
        senderPhotoURL,
        timestamp: new Date(),
        isRead: false,
        type: 'text',
      };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to send message');
    }
  }
);

export const markMessagesReadThunk = createAsyncThunk(
  'chats/markMessagesRead',
  async ({ chatId, userId }, { rejectWithValue }) => {
    try {
      await markChatMessagesAsRead(chatId, userId);
      return { chatId, userId };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to mark messages as read');
    }
  }
);

// Initial State
const initialState = {
  chats: [],
  currentChat: null,
  messages: [],
  loading: false,
  sendingMessage: false,
  error: null,
  unreadCounts: {}, // { chatId: count }
};

// Slice
const chatsSlice = createSlice({
  name: 'chats',
  initialState,
  reducers: {
    setChats: (state, action) => {
      state.chats = action.payload;
    },
    setCurrentChat: (state, action) => {
      state.currentChat = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    updateChatPreview: (state, action) => {
      const { chatId, lastMessage, updatedAt } = action.payload;
      const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
      if (chatIndex !== -1) {
        state.chats[chatIndex].lastMessage = lastMessage;
        state.chats[chatIndex].updatedAt = updatedAt;
      }
    },
    incrementUnreadCount: (state, action) => {
      const { chatId, userId } = action.payload;
      const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
      if (chatIndex !== -1 && state.chats[chatIndex].unreadCount) {
        state.chats[chatIndex].unreadCount[userId] = 
          (state.chats[chatIndex].unreadCount[userId] || 0) + 1;
      }
    },
    resetUnreadCount: (state, action) => {
      const { chatId, userId } = action.payload;
      const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
      if (chatIndex !== -1 && state.chats[chatIndex].unreadCount) {
        state.chats[chatIndex].unreadCount[userId] = 0;
      }
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create Chat
    builder
      .addCase(createChatThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createChatThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.chats.push(action.payload);
        state.currentChat = action.payload;
      })
      .addCase(createChatThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Send Message
    builder
      .addCase(sendMessageThunk.pending, (state) => {
        state.sendingMessage = true;
        state.error = null;
      })
      .addCase(sendMessageThunk.fulfilled, (state) => {
        state.sendingMessage = false;
        // Don't add message here - let the real-time subscription handle it
        // This prevents duplicate/malformed messages in the Redux state
      })
      .addCase(sendMessageThunk.rejected, (state, action) => {
        state.sendingMessage = false;
        state.error = action.payload;
      });

    // Mark Messages Read
    builder
      .addCase(markMessagesReadThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(markMessagesReadThunk.fulfilled, (state, action) => {
        const { chatId, userId } = action.payload;
        // Reset unread count for this chat
        const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
        if (chatIndex !== -1 && state.chats[chatIndex].unreadCount) {
          state.chats[chatIndex].unreadCount[userId] = 0;
        }
      })
      .addCase(markMessagesReadThunk.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  setChats,
  setCurrentChat,
  setMessages,
  addMessage,
  updateChatPreview,
  incrementUnreadCount,
  resetUnreadCount,
  setError,
  clearError,
} = chatsSlice.actions;

export default chatsSlice.reducer;
