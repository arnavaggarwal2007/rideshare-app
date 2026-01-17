/**
 * Reviews Slice Tests
 * Week 7: Rating & Review System Redux State Management
 */

import reviewsReducer, {
    checkTripReviewThunk,
    clearCurrentReview,
    clearReviewsError,
    clearUnratedTrips,
    clearUserReviews,
    fetchUnratedTripsThunk,
    fetchUserReviewsThunk,
    removeFromUnratedTrips,
    submitRatingThunk,
} from '../reviewsSlice';

// Mock Firebase services - using exact function names from reviewsSlice imports
jest.mock('../../../services/firebase/reviews', () => ({
	submitRating: jest.fn(),
	getUserReviews: jest.fn(),
	getUnratedTripsForUser: jest.fn(),
	getTripReview: jest.fn(),
}));

import {
    getTripReview,
    getUnratedTripsForUser,
    getUserReviews,
    submitRating,
} from '../../../services/firebase/reviews';

describe('reviewsSlice', () => {
	const initialState = {
		userReviews: [],
		unratedTrips: [],
		currentReview: null,
		submitting: false,
		loading: false,
		error: null,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('initial state', () => {
		it('should return the initial state', () => {
			expect(reviewsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
		});
	});

	describe('clearReviewsError', () => {
		it('should clear the error', () => {
			const stateWithError = { ...initialState, error: 'Some error' };
			expect(reviewsReducer(stateWithError, clearReviewsError()).error).toBeNull();
		});
	});

	describe('clearUserReviews', () => {
		it('should clear user reviews', () => {
			const stateWithReviews = { ...initialState, userReviews: [{ id: '1' }] };
			expect(reviewsReducer(stateWithReviews, clearUserReviews()).userReviews).toEqual([]);
		});
	});

	describe('clearCurrentReview', () => {
		it('should clear current review', () => {
			const stateWithCurrentReview = { ...initialState, currentReview: { id: '1' } };
			expect(reviewsReducer(stateWithCurrentReview, clearCurrentReview()).currentReview).toBeNull();
		});
	});

	describe('clearUnratedTrips', () => {
		it('should clear unrated trips', () => {
			const stateWithUnrated = { ...initialState, unratedTrips: [{ id: '1' }] };
			expect(reviewsReducer(stateWithUnrated, clearUnratedTrips()).unratedTrips).toEqual([]);
		});
	});

	describe('removeFromUnratedTrips', () => {
		it('should remove a trip from unrated trips by id', () => {
			const stateWithTrips = {
				...initialState,
				unratedTrips: [{ id: 'trip-1' }, { id: 'trip-2' }],
			};
			const result = reviewsReducer(stateWithTrips, removeFromUnratedTrips('trip-1'));
			expect(result.unratedTrips).toEqual([{ id: 'trip-2' }]);
		});

		it('should not modify array if trip not found', () => {
			const stateWithTrips = {
				...initialState,
				unratedTrips: [{ id: 'trip-1' }],
			};
			const result = reviewsReducer(stateWithTrips, removeFromUnratedTrips('trip-999'));
			expect(result.unratedTrips).toEqual([{ id: 'trip-1' }]);
		});
	});

	describe('submitRatingThunk', () => {
		const reviewData = {
			tripId: 'trip-123',
			reviewerId: 'reviewer-1',
			revieweeId: 'reviewee-1',
			rating: 5,
			reviewText: 'Great ride!',
			reviewerRole: 'rider',
		};

		it('sets submitting to true on pending', () => {
			const action = { type: submitRatingThunk.pending.type };
			const state = reviewsReducer(initialState, action);
			expect(state.submitting).toBe(true);
			expect(state.error).toBeNull();
		});

		it('removes trip from unrated and clears submitting on fulfilled', () => {
			const stateWithUnrated = {
				...initialState,
				unratedTrips: [{ id: 'trip-123' }, { id: 'trip-456' }],
			};
			const action = {
				type: submitRatingThunk.fulfilled.type,
				payload: { ...reviewData, id: 'review-1', tripId: 'trip-123' },
			};
			const state = reviewsReducer(stateWithUnrated, action);
			expect(state.submitting).toBe(false);
			expect(state.unratedTrips).toEqual([{ id: 'trip-456' }]);
			expect(state.error).toBeNull();
		});

		it('sets error on rejected', () => {
			const action = {
				type: submitRatingThunk.rejected.type,
				payload: 'Submission failed',
			};
			const state = reviewsReducer(initialState, action);
			expect(state.submitting).toBe(false);
			expect(state.error).toBe('Submission failed');
		});

		it('executes thunk successfully', async () => {
			const mockReview = { id: 'review-1', ...reviewData };

			submitRating.mockResolvedValue(mockReview);

			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = submitRatingThunk(reviewData);
			const result = await thunk(dispatch, getState, undefined);

			expect(submitRating).toHaveBeenCalledWith(
				'trip-123',
				'reviewer-1',
				'reviewee-1',
				5,
				'Great ride!',
				'rider'
			);
			expect(result.payload).toEqual(mockReview);
		});

		it('handles submission error', async () => {
			submitRating.mockRejectedValue(new Error('Network error'));

			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = submitRatingThunk(reviewData);
			const result = await thunk(dispatch, getState, undefined);

			expect(result.payload).toBe('Network error');
		});

		it('handles error without message', async () => {
			submitRating.mockRejectedValue({ code: 'UNKNOWN' });

			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = submitRatingThunk(reviewData);
			const result = await thunk(dispatch, getState, undefined);

			expect(result.payload).toBe('Failed to submit rating');
		});
	});

	describe('fetchUserReviewsThunk', () => {
		it('sets loading to true on pending', () => {
			const action = { type: fetchUserReviewsThunk.pending.type };
			const state = reviewsReducer(initialState, action);
			expect(state.loading).toBe(true);
		});

		it('stores reviews on fulfilled', () => {
			const mockReviews = [
				{ id: 'review-1', rating: 5 },
				{ id: 'review-2', rating: 4 },
			];
			const action = {
				type: fetchUserReviewsThunk.fulfilled.type,
				payload: mockReviews,
			};
			const state = reviewsReducer(initialState, action);
			expect(state.loading).toBe(false);
			expect(state.userReviews).toEqual(mockReviews);
		});

		it('sets error on rejected', () => {
			const action = {
				type: fetchUserReviewsThunk.rejected.type,
				payload: 'Fetch failed',
			};
			const state = reviewsReducer(initialState, action);
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Fetch failed');
		});

		it('executes thunk successfully', async () => {
			const mockReviews = [{ id: 'review-1', rating: 5 }];
			getUserReviews.mockResolvedValue(mockReviews);

			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = fetchUserReviewsThunk({ userId: 'user-123', limitCount: 10 });
			const result = await thunk(dispatch, getState, undefined);

			expect(getUserReviews).toHaveBeenCalledWith('user-123', 10);
			expect(result.payload).toEqual(mockReviews);
		});

		it('uses default limit when not provided', async () => {
			const mockReviews = [{ id: 'review-1', rating: 5 }];
			getUserReviews.mockResolvedValue(mockReviews);

			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = fetchUserReviewsThunk({ userId: 'user-123' });
			await thunk(dispatch, getState, undefined);

			expect(getUserReviews).toHaveBeenCalledWith('user-123', 10);
		});

		it('handles fetch error', async () => {
			getUserReviews.mockRejectedValue(new Error('Database error'));

			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = fetchUserReviewsThunk({ userId: 'user-123' });
			const result = await thunk(dispatch, getState, undefined);

			expect(result.payload).toBe('Database error');
		});
	});

	describe('fetchUnratedTripsThunk', () => {
		it('sets loading to true on pending', () => {
			const action = { type: fetchUnratedTripsThunk.pending.type };
			const state = reviewsReducer(initialState, action);
			expect(state.loading).toBe(true);
		});

		it('stores unrated trips on fulfilled', () => {
			const mockTrips = [
				{ id: 'trip-1', destination: 'NYC' },
				{ id: 'trip-2', destination: 'LA' },
			];
			const action = {
				type: fetchUnratedTripsThunk.fulfilled.type,
				payload: mockTrips,
			};
			const state = reviewsReducer(initialState, action);
			expect(state.loading).toBe(false);
			expect(state.unratedTrips).toEqual(mockTrips);
		});

		it('sets error on rejected', () => {
			const action = {
				type: fetchUnratedTripsThunk.rejected.type,
				payload: 'Error fetching trips',
			};
			const state = reviewsReducer(initialState, action);
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Error fetching trips');
		});

		it('executes thunk successfully', async () => {
			const mockTrips = [{ id: 'trip-1' }];
			getUnratedTripsForUser.mockResolvedValue(mockTrips);

			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = fetchUnratedTripsThunk({ userId: 'user-123' });
			const result = await thunk(dispatch, getState, undefined);

			expect(getUnratedTripsForUser).toHaveBeenCalledWith('user-123');
			expect(result.payload).toEqual(mockTrips);
		});

		it('handles fetch error', async () => {
			getUnratedTripsForUser.mockRejectedValue(new Error('Network error'));

			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = fetchUnratedTripsThunk({ userId: 'user-123' });
			const result = await thunk(dispatch, getState, undefined);

			expect(result.payload).toBe('Network error');
		});
	});

	describe('checkTripReviewThunk', () => {
		it('sets loading to true on pending', () => {
			const action = { type: checkTripReviewThunk.pending.type };
			const state = reviewsReducer(initialState, action);
			expect(state.loading).toBe(true);
		});

		it('stores existing review on fulfilled', () => {
			const mockReview = { id: 'review-1', rating: 5 };
			const action = {
				type: checkTripReviewThunk.fulfilled.type,
				payload: mockReview,
			};
			const state = reviewsReducer(initialState, action);
			expect(state.loading).toBe(false);
			expect(state.currentReview).toEqual(mockReview);
		});

		it('sets currentReview to null when no review exists', () => {
			const action = {
				type: checkTripReviewThunk.fulfilled.type,
				payload: null,
			};
			const state = reviewsReducer({ ...initialState, currentReview: { id: 'old' } }, action);
			expect(state.currentReview).toBeNull();
		});

		it('sets error on rejected', () => {
			const action = {
				type: checkTripReviewThunk.rejected.type,
				payload: 'Check failed',
			};
			const state = reviewsReducer(initialState, action);
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Check failed');
		});

		it('executes thunk successfully with existing review', async () => {
			const mockReview = { id: 'review-1', rating: 5 };
			getTripReview.mockResolvedValue(mockReview);

			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = checkTripReviewThunk({ tripId: 'trip-123', reviewerId: 'user-1' });
			const result = await thunk(dispatch, getState, undefined);

			expect(getTripReview).toHaveBeenCalledWith('trip-123', 'user-1');
			expect(result.payload).toEqual(mockReview);
		});

		it('executes thunk successfully with no existing review', async () => {
			getTripReview.mockResolvedValue(null);

			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = checkTripReviewThunk({ tripId: 'trip-123', reviewerId: 'user-1' });
			const result = await thunk(dispatch, getState, undefined);

			expect(result.payload).toBeNull();
		});

		it('handles check error', async () => {
			getTripReview.mockRejectedValue(new Error('Database error'));

			const dispatch = jest.fn();
			const getState = jest.fn();

			const thunk = checkTripReviewThunk({ tripId: 'trip-123', reviewerId: 'user-1' });
			const result = await thunk(dispatch, getState, undefined);

			expect(result.payload).toBe('Database error');
		});
	});
});
