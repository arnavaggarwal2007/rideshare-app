/**
 * Safety Slice Tests
 * Phase 5: Week 7 Implementation Plan
 */

import safetyReducer, {
    blockUserThunk,
    clearBlockError,
    clearLastReport,
    clearSubmitError,
    fetchBlockedUsersThunk,
    resetSafetyState,
    submitReportThunk,
    unblockUserThunk,
} from '../safetySlice';

// Mock the firebase services
jest.mock('../../../services/firebase/reports', () => ({
	submitReport: jest.fn(),
}));

jest.mock('../../../services/firebase/users', () => ({
	blockUser: jest.fn(),
	unblockUser: jest.fn(),
	getBlockedUsers: jest.fn(),
}));

import { submitReport } from '../../../services/firebase/reports';
import { blockUser, getBlockedUsers, unblockUser } from '../../../services/firebase/users';

describe('Safety Slice', () => {
	const initialState = {
		submitting: false,
		submitError: null,
		lastReport: null,
		blocking: false,
		blockError: null,
		blockedUsers: [],
		blockedUsersLoading: false,
		blockedUsersError: null,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('initial state', () => {
		it('should return the initial state', () => {
			const state = safetyReducer(undefined, { type: 'unknown' });
			expect(state).toEqual(initialState);
		});
	});

	describe('reducers', () => {
		describe('clearSubmitError', () => {
			it('clears the submit error', () => {
				const stateWithError = { ...initialState, submitError: 'Some error' };
				const state = safetyReducer(stateWithError, clearSubmitError());
				expect(state.submitError).toBeNull();
			});
		});

		describe('clearBlockError', () => {
			it('clears the block error', () => {
				const stateWithError = { ...initialState, blockError: 'Block error' };
				const state = safetyReducer(stateWithError, clearBlockError());
				expect(state.blockError).toBeNull();
			});
		});

		describe('clearLastReport', () => {
			it('clears the last report', () => {
				const stateWithReport = { ...initialState, lastReport: { id: 'report1' } };
				const state = safetyReducer(stateWithReport, clearLastReport());
				expect(state.lastReport).toBeNull();
			});
		});

		describe('resetSafetyState', () => {
			it('resets all state to initial values', () => {
				const modifiedState = {
					submitting: true,
					submitError: 'error',
					lastReport: { id: 'report1' },
					blocking: true,
					blockError: 'block error',
					blockedUsers: ['user1', 'user2'],
					blockedUsersLoading: true,
					blockedUsersError: 'load error',
				};
				const state = safetyReducer(modifiedState, resetSafetyState());
				expect(state).toEqual(initialState);
			});
		});
	});

	describe('submitReportThunk', () => {
		it('sets submitting to true when pending', () => {
			const action = { type: submitReportThunk.pending.type };
			const state = safetyReducer(initialState, action);
			expect(state.submitting).toBe(true);
			expect(state.submitError).toBeNull();
		});

		it('stores report and sets submitting to false when fulfilled', () => {
			const mockReport = { id: 'report1', reason: 'harassment' };
			const action = { type: submitReportThunk.fulfilled.type, payload: mockReport };
			const state = safetyReducer({ ...initialState, submitting: true }, action);
			expect(state.submitting).toBe(false);
			expect(state.lastReport).toEqual(mockReport);
		});

		it('sets error and submitting to false when rejected', () => {
			const action = { type: submitReportThunk.rejected.type, payload: 'Submit failed' };
			const state = safetyReducer({ ...initialState, submitting: true }, action);
			expect(state.submitting).toBe(false);
			expect(state.submitError).toBe('Submit failed');
		});

		it('calls submitReport with correct parameters', async () => {
			submitReport.mockResolvedValue({ id: 'new-report' });
			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = submitReportThunk({
				reporterId: 'user1',
				reportedUserId: 'user2',
				reason: 'harassment',
				description: 'Bad behavior',
				relatedTripId: 'trip1',
				relatedReviewId: null,
			});

			await thunk(dispatch, getState, undefined);

			expect(submitReport).toHaveBeenCalledWith(
				'user1',
				'user2',
				'harassment',
				'Bad behavior',
				'trip1',
				null
			);
		});

		it('returns error message on rejection', async () => {
			submitReport.mockRejectedValue(new Error('Network error'));
			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = submitReportThunk({
				reporterId: 'user1',
				reportedUserId: 'user2',
				reason: 'spam',
			});

			const result = await thunk(dispatch, getState, undefined);
			expect(result.payload).toBe('Network error');
		});
	});

	describe('blockUserThunk', () => {
		it('sets blocking to true when pending', () => {
			const action = { type: blockUserThunk.pending.type };
			const state = safetyReducer(initialState, action);
			expect(state.blocking).toBe(true);
			expect(state.blockError).toBeNull();
		});

		it('adds user to blockedUsers and sets blocking to false when fulfilled', () => {
			const action = { type: blockUserThunk.fulfilled.type, payload: 'blockedUser1' };
			const state = safetyReducer({ ...initialState, blocking: true }, action);
			expect(state.blocking).toBe(false);
			expect(state.blockedUsers).toContain('blockedUser1');
		});

		it('does not add duplicate blocked users', () => {
			const stateWithBlocked = { ...initialState, blockedUsers: ['user1'] };
			const action = { type: blockUserThunk.fulfilled.type, payload: 'user1' };
			const state = safetyReducer(stateWithBlocked, action);
			expect(state.blockedUsers).toEqual(['user1']);
		});

		it('sets error when rejected', () => {
			const action = { type: blockUserThunk.rejected.type, payload: 'Block failed' };
			const state = safetyReducer({ ...initialState, blocking: true }, action);
			expect(state.blocking).toBe(false);
			expect(state.blockError).toBe('Block failed');
		});

		it('calls blockUser with correct parameters', async () => {
			blockUser.mockResolvedValue();
			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = blockUserThunk({
				userId: 'currentUser',
				blockedUserId: 'userToBlock',
			});

			await thunk(dispatch, getState, undefined);

			expect(blockUser).toHaveBeenCalledWith('currentUser', 'userToBlock');
		});

		it('returns blockedUserId on success', async () => {
			blockUser.mockResolvedValue();
			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = blockUserThunk({
				userId: 'user1',
				blockedUserId: 'user2',
			});

			const result = await thunk(dispatch, getState, undefined);
			expect(result.payload).toBe('user2');
		});
	});

	describe('unblockUserThunk', () => {
		it('sets blocking to true when pending', () => {
			const action = { type: unblockUserThunk.pending.type };
			const state = safetyReducer(initialState, action);
			expect(state.blocking).toBe(true);
			expect(state.blockError).toBeNull();
		});

		it('removes user from blockedUsers when fulfilled', () => {
			const stateWithBlocked = { 
				...initialState, 
				blockedUsers: ['user1', 'user2', 'user3'],
				blocking: true 
			};
			const action = { type: unblockUserThunk.fulfilled.type, payload: 'user2' };
			const state = safetyReducer(stateWithBlocked, action);
			expect(state.blocking).toBe(false);
			expect(state.blockedUsers).toEqual(['user1', 'user3']);
		});

		it('sets error when rejected', () => {
			const action = { type: unblockUserThunk.rejected.type, payload: 'Unblock failed' };
			const state = safetyReducer({ ...initialState, blocking: true }, action);
			expect(state.blocking).toBe(false);
			expect(state.blockError).toBe('Unblock failed');
		});

		it('calls unblockUser with correct parameters', async () => {
			unblockUser.mockResolvedValue();
			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = unblockUserThunk({
				userId: 'currentUser',
				blockedUserId: 'userToUnblock',
			});

			await thunk(dispatch, getState, undefined);

			expect(unblockUser).toHaveBeenCalledWith('currentUser', 'userToUnblock');
		});
	});

	describe('fetchBlockedUsersThunk', () => {
		it('sets blockedUsersLoading to true when pending', () => {
			const action = { type: fetchBlockedUsersThunk.pending.type };
			const state = safetyReducer(initialState, action);
			expect(state.blockedUsersLoading).toBe(true);
			expect(state.blockedUsersError).toBeNull();
		});

		it('sets blockedUsers and loading to false when fulfilled', () => {
			const blockedList = ['user1', 'user2'];
			const action = { type: fetchBlockedUsersThunk.fulfilled.type, payload: blockedList };
			const state = safetyReducer({ ...initialState, blockedUsersLoading: true }, action);
			expect(state.blockedUsersLoading).toBe(false);
			expect(state.blockedUsers).toEqual(blockedList);
		});

		it('sets error when rejected', () => {
			const action = { type: fetchBlockedUsersThunk.rejected.type, payload: 'Fetch failed' };
			const state = safetyReducer({ ...initialState, blockedUsersLoading: true }, action);
			expect(state.blockedUsersLoading).toBe(false);
			expect(state.blockedUsersError).toBe('Fetch failed');
		});

		it('calls getBlockedUsers with correct userId', async () => {
			getBlockedUsers.mockResolvedValue(['blocked1', 'blocked2']);
			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = fetchBlockedUsersThunk({ userId: 'currentUser' });

			await thunk(dispatch, getState, undefined);

			expect(getBlockedUsers).toHaveBeenCalledWith('currentUser');
		});

		it('returns blocked users list on success', async () => {
			const blockedList = ['user1', 'user2', 'user3'];
			getBlockedUsers.mockResolvedValue(blockedList);
			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = fetchBlockedUsersThunk({ userId: 'user1' });

			const result = await thunk(dispatch, getState, undefined);
			expect(result.payload).toEqual(blockedList);
		});

		it('returns error on failure', async () => {
			getBlockedUsers.mockRejectedValue(new Error('Database error'));
			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = fetchBlockedUsersThunk({ userId: 'user1' });

			const result = await thunk(dispatch, getState, undefined);
			expect(result.payload).toBe('Database error');
		});
	});

	describe('action creators export', () => {
		it('exports all action creators', () => {
			expect(clearSubmitError).toBeDefined();
			expect(clearBlockError).toBeDefined();
			expect(clearLastReport).toBeDefined();
			expect(resetSafetyState).toBeDefined();
		});

		it('exports all thunks', () => {
			expect(submitReportThunk).toBeDefined();
			expect(blockUserThunk).toBeDefined();
			expect(unblockUserThunk).toBeDefined();
			expect(fetchBlockedUsersThunk).toBeDefined();
		});
	});
});
