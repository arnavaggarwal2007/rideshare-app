/**
 * Reviews Redux Slice
 * Manages review state, submission, and fetching
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
    getTripReview,
    getUnratedTripsForUser,
    getUserReviews,
    submitRating
} from '../../services/firebase/reviews';

// Initial state
const initialState = {
	userReviews: [],
	unratedTrips: [],
	currentReview: null,
	submitting: false,
	loading: false,
	error: null
};

/**
 * Submit a rating for a trip
 */
export const submitRatingThunk = createAsyncThunk(
	'reviews/submitRating',
	async ({ tripId, reviewerId, revieweeId, rating, reviewText, reviewerRole }, { rejectWithValue }) => {
		try {
			const review = await submitRating(
				tripId,
				reviewerId,
				revieweeId,
				rating,
				reviewText,
				reviewerRole
			);
			return review;
		} catch (error) {
			console.error('[submitRatingThunk] Error:', error);
			return rejectWithValue(error.message || 'Failed to submit rating');
		}
	}
);

/**
 * Fetch reviews for a specific user
 */
export const fetchUserReviewsThunk = createAsyncThunk(
	'reviews/fetchUserReviews',
	async ({ userId, limitCount = 10 }, { rejectWithValue }) => {
		try {
			const reviews = await getUserReviews(userId, limitCount);
			return reviews;
		} catch (error) {
			console.error('[fetchUserReviewsThunk] Error:', error);
			return rejectWithValue(error.message || 'Failed to fetch reviews');
		}
	}
);

/**
 * Fetch unrated trips for a user
 */
export const fetchUnratedTripsThunk = createAsyncThunk(
	'reviews/fetchUnratedTrips',
	async ({ userId }, { rejectWithValue }) => {
		try {
			const trips = await getUnratedTripsForUser(userId);
			return trips;
		} catch (error) {
			console.error('[fetchUnratedTripsThunk] Error:', error);
			return rejectWithValue(error.message || 'Failed to fetch unrated trips');
		}
	}
);

/**
 * Check if user has already reviewed a trip
 */
export const checkTripReviewThunk = createAsyncThunk(
	'reviews/checkTripReview',
	async ({ tripId, reviewerId }, { rejectWithValue }) => {
		try {
			const review = await getTripReview(tripId, reviewerId);
			return review;
		} catch (error) {
			console.error('[checkTripReviewThunk] Error:', error);
			return rejectWithValue(error.message || 'Failed to check trip review');
		}
	}
);

// Create the slice
const reviewsSlice = createSlice({
	name: 'reviews',
	initialState,
	reducers: {
		// Clear any error state
		clearReviewsError: (state) => {
			state.error = null;
		},
		// Clear user reviews (e.g., when changing viewed profile)
		clearUserReviews: (state) => {
			state.userReviews = [];
		},
		// Clear current review
		clearCurrentReview: (state) => {
			state.currentReview = null;
		},
		// Clear unrated trips
		clearUnratedTrips: (state) => {
			state.unratedTrips = [];
		},
		// Remove a trip from unrated trips after rating
		removeFromUnratedTrips: (state, action) => {
			const tripId = action.payload;
			state.unratedTrips = state.unratedTrips.filter(trip => trip.id !== tripId);
		}
	},
	extraReducers: (builder) => {
		builder
			// submitRatingThunk
			.addCase(submitRatingThunk.pending, (state) => {
				state.submitting = true;
				state.error = null;
			})
			.addCase(submitRatingThunk.fulfilled, (state, action) => {
				state.submitting = false;
				state.error = null;
				// Remove the rated trip from unrated trips
				const tripId = action.payload.tripId;
				state.unratedTrips = state.unratedTrips.filter(trip => trip.id !== tripId);
			})
			.addCase(submitRatingThunk.rejected, (state, action) => {
				state.submitting = false;
				state.error = action.payload || 'Failed to submit rating';
			})

			// fetchUserReviewsThunk
			.addCase(fetchUserReviewsThunk.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchUserReviewsThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.userReviews = action.payload;
				state.error = null;
			})
			.addCase(fetchUserReviewsThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload || 'Failed to fetch reviews';
			})

			// fetchUnratedTripsThunk
			.addCase(fetchUnratedTripsThunk.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchUnratedTripsThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.unratedTrips = action.payload;
				state.error = null;
			})
			.addCase(fetchUnratedTripsThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload || 'Failed to fetch unrated trips';
			})

			// checkTripReviewThunk
			.addCase(checkTripReviewThunk.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(checkTripReviewThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.currentReview = action.payload;
				state.error = null;
			})
			.addCase(checkTripReviewThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload || 'Failed to check trip review';
			});
	}
});

// Export actions
export const {
	clearReviewsError,
	clearUserReviews,
	clearCurrentReview,
	clearUnratedTrips,
	removeFromUnratedTrips
} = reviewsSlice.actions;

// Export reducer
export default reviewsSlice.reducer;
