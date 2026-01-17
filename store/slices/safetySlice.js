/**
 * Safety Slice
 * Redux state management for safety features (reports, blocking)
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { submitReport } from '../../services/firebase/reports';
import { blockUser, getBlockedUsers, unblockUser } from '../../services/firebase/users';

/**
 * Submit a report against a user
 */
export const submitReportThunk = createAsyncThunk(
	'safety/submitReport',
	async ({ reporterId, reportedUserId, reason, description, relatedTripId, relatedReviewId }, { rejectWithValue }) => {
		try {
			const report = await submitReport(
				reporterId,
				reportedUserId,
				reason,
				description,
				relatedTripId,
				relatedReviewId
			);
			return report;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

/**
 * Block a user
 */
export const blockUserThunk = createAsyncThunk(
	'safety/blockUser',
	async ({ userId, blockedUserId }, { rejectWithValue }) => {
		try {
			await blockUser(userId, blockedUserId);
			return blockedUserId;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

/**
 * Unblock a user
 */
export const unblockUserThunk = createAsyncThunk(
	'safety/unblockUser',
	async ({ userId, blockedUserId }, { rejectWithValue }) => {
		try {
			await unblockUser(userId, blockedUserId);
			return blockedUserId;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

/**
 * Fetch blocked users list
 */
export const fetchBlockedUsersThunk = createAsyncThunk(
	'safety/fetchBlockedUsers',
	async ({ userId }, { rejectWithValue }) => {
		try {
			const blockedUsers = await getBlockedUsers(userId);
			return blockedUsers;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

const initialState = {
	// Report submission state
	submitting: false,
	submitError: null,
	lastReport: null,
	
	// Block state
	blocking: false,
	blockError: null,
	
	// Blocked users list
	blockedUsers: [],
	blockedUsersLoading: false,
	blockedUsersError: null,
};

const safetySlice = createSlice({
	name: 'safety',
	initialState,
	reducers: {
		clearSubmitError: (state) => {
			state.submitError = null;
		},
		clearBlockError: (state) => {
			state.blockError = null;
		},
		clearLastReport: (state) => {
			state.lastReport = null;
		},
		resetSafetyState: () => initialState,
	},
	extraReducers: (builder) => {
		// Submit Report
		builder
			.addCase(submitReportThunk.pending, (state) => {
				state.submitting = true;
				state.submitError = null;
			})
			.addCase(submitReportThunk.fulfilled, (state, action) => {
				state.submitting = false;
				state.lastReport = action.payload;
			})
			.addCase(submitReportThunk.rejected, (state, action) => {
				state.submitting = false;
				state.submitError = action.payload;
			});

		// Block User
		builder
			.addCase(blockUserThunk.pending, (state) => {
				state.blocking = true;
				state.blockError = null;
			})
			.addCase(blockUserThunk.fulfilled, (state, action) => {
				state.blocking = false;
				if (!state.blockedUsers.includes(action.payload)) {
					state.blockedUsers.push(action.payload);
				}
			})
			.addCase(blockUserThunk.rejected, (state, action) => {
				state.blocking = false;
				state.blockError = action.payload;
			});

		// Unblock User
		builder
			.addCase(unblockUserThunk.pending, (state) => {
				state.blocking = true;
				state.blockError = null;
			})
			.addCase(unblockUserThunk.fulfilled, (state, action) => {
				state.blocking = false;
				state.blockedUsers = state.blockedUsers.filter(id => id !== action.payload);
			})
			.addCase(unblockUserThunk.rejected, (state, action) => {
				state.blocking = false;
				state.blockError = action.payload;
			});

		// Fetch Blocked Users
		builder
			.addCase(fetchBlockedUsersThunk.pending, (state) => {
				state.blockedUsersLoading = true;
				state.blockedUsersError = null;
			})
			.addCase(fetchBlockedUsersThunk.fulfilled, (state, action) => {
				state.blockedUsersLoading = false;
				state.blockedUsers = action.payload;
			})
			.addCase(fetchBlockedUsersThunk.rejected, (state, action) => {
				state.blockedUsersLoading = false;
				state.blockedUsersError = action.payload;
			});
	},
});

export const {
	clearSubmitError,
	clearBlockError,
	clearLastReport,
	resetSafetyState,
} = safetySlice.actions;

export default safetySlice.reducer;
