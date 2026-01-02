import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as Notifications from 'expo-notifications';
import { serverTimestamp } from 'firebase/firestore';
import { confirmTripCompletionByRider, notifyUserPush, updateTripStatus as updateTripStatusFirebase } from '../../services/firebase/firestore';
import { scheduleAllTripReminders } from '../../services/notifications/tripReminders';

const initialState = {
	trips: [],
	upcomingTrips: [],
	pastTrips: [],
	loading: false,
	error: null,
};

/**
 * Update trip status thunk
 * @param {{ tripId, driverId, newStatus, cancellationReason }} - Trip ID, driver ID, new status, and optional cancellation reason
 * @returns {Promise<Object>} - Updated trip object
 */
export const updateTripStatusThunk = createAsyncThunk(
	'trips/updateTripStatus',
	async ({ tripId, driverId, newStatus, cancellationReason = '' }, { rejectWithValue }) => {
		try {
			const updatedTrip = await updateTripStatusFirebase(
				tripId,
				driverId,
				newStatus,
				serverTimestamp(),
				newStatus === 'cancelled' ? cancellationReason : undefined
			);

			// Send local notification after status update
			const notificationText = getStatusNotificationText(newStatus);
			if (notificationText) {
				await Notifications.scheduleNotificationAsync({
					content: {
						title: 'Trip Update',
						body: notificationText,
						data: { tripId, newStatus },
					},
					trigger: null, // Show immediately
				});
			}

			// Send push notification to the other participant
			try {
				const otherParticipantId = updatedTrip.driverId === driverId ? updatedTrip.riderId : updatedTrip.driverId;
				const otherParticipantName = updatedTrip.driverId === driverId ? updatedTrip.riderName : updatedTrip.driverName;
				
				const pushTitle = getPushTitle(newStatus);
				const pushBody = `${(updatedTrip.driverId === driverId ? updatedTrip.riderName : updatedTrip.driverName)} ${getPushMessage(newStatus)}`;
				
				await notifyUserPush(otherParticipantId, {
					title: pushTitle,
					body: pushBody,
					data: { tripId, newStatus, type: 'trip_status_update' },
				});
			} catch (notificationError) {
				console.warn('[updateTripStatusThunk] Failed to send push notification:', notificationError?.message);
				// Don't reject the entire operation if notification fails
			}

			return updatedTrip;
		} catch (error) {
			console.error('[updateTripStatusThunk] Error:', error);
			return rejectWithValue(error.message || 'Failed to update trip status');
		}
	}
);

/**
 * Get push notification title based on status
 */
function getPushTitle(status) {
	switch (status?.toLowerCase()) {
		case 'in-progress':
			return 'Trip Started';
		case 'completed':
			return 'Trip Completed';
		case 'cancelled':
			return 'Trip Cancelled';
		default:
			return 'Trip Update';
	}
}

/**
 * Get push notification message based on status
 */
function getPushMessage(status) {
	switch (status?.toLowerCase()) {
		case 'in-progress':
			return 'started the trip';
		case 'completed':
			return 'completed the trip';
		case 'cancelled':
			return 'cancelled the trip';
		default:
			return 'updated the trip';
	}
}

/**
 * Get notification text based on status
 */
function getStatusNotificationText(status) {
	switch (status?.toLowerCase()) {
		case 'in-progress':
			return 'Your trip has started!';
		case 'completed':
			return 'Trip completed! Thanks for riding with us.';
		case 'cancelled':
			return 'This trip has been cancelled.';
		default:
			return '';
	}
}

/**
 * Rider confirms trip completion thunk
 * @param {{ tripId, riderId }} - Trip ID and rider ID
 * @returns {Promise<Object>} - Updated trip object
 */
export const confirmTripCompletionThunk = createAsyncThunk(
	'trips/confirmTripCompletion',
	async ({ tripId, riderId }, { rejectWithValue }) => {
		try {
			const updatedTrip = await confirmTripCompletionByRider(tripId, riderId);

			// Send local notification
			await Notifications.scheduleNotificationAsync({
				content: {
					title: 'Trip Confirmed',
					body: 'You have confirmed the trip completion. Thank you for riding with us!',
					data: { tripId },
				},
				trigger: null,
			});

			return updatedTrip;
		} catch (error) {
			console.error('[confirmTripCompletionThunk] Error:', error);
			return rejectWithValue(error.message || 'Failed to confirm trip completion');
		}
	}
);

const tripsSlice = createSlice({
	name: 'trips',
	initialState,
	reducers: {
		setTrips: (state, action) => {
			state.trips = action.payload;
			// Schedule reminders for all upcoming trips
			scheduleAllTripReminders(action.payload);
		},
		addTrip: (state, action) => {
			state.trips.push(action.payload);
		},
		updateTrip: (state, action) => {
			const idx = state.trips.findIndex(t => t.id === action.payload.id);
			if (idx !== -1) state.trips[idx] = action.payload;
		},
		deleteTrip: (state, action) => {
			state.trips = state.trips.filter(t => t.id !== action.payload);
		},
		setUpcomingTrips: (state, action) => {
			state.upcomingTrips = action.payload;
		},
		setPastTrips: (state, action) => {
			state.pastTrips = action.payload;
		},
		setLoading: (state, action) => {
			state.loading = action.payload;
		},
		setError: (state, action) => {
			state.error = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			// updateTripStatus thunk cases
			.addCase(updateTripStatusThunk.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(updateTripStatusThunk.fulfilled, (state, action) => {
				state.loading = false;
				// Update the trip in all arrays
				const updatedTrip = action.payload;
				const idx = state.trips.findIndex(t => t.id === updatedTrip.id);
				if (idx !== -1) {
					state.trips[idx] = updatedTrip;
				}
				// Update upcoming/past arrays if applicable
				const upIdx = state.upcomingTrips.findIndex(t => t.id === updatedTrip.id);
				if (upIdx !== -1) {
					state.upcomingTrips[upIdx] = updatedTrip;
				}
				const pastIdx = state.pastTrips.findIndex(t => t.id === updatedTrip.id);
				if (pastIdx !== -1) {
					state.pastTrips[pastIdx] = updatedTrip;
				}
			})
			.addCase(updateTripStatusThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			// confirmTripCompletion thunk cases
			.addCase(confirmTripCompletionThunk.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(confirmTripCompletionThunk.fulfilled, (state, action) => {
				state.loading = false;
				const updatedTrip = action.payload;
				const idx = state.trips.findIndex(t => t.id === updatedTrip.id);
				if (idx !== -1) {
					state.trips[idx] = updatedTrip;
				}
				const upIdx = state.upcomingTrips.findIndex(t => t.id === updatedTrip.id);
				if (upIdx !== -1) {
					state.upcomingTrips[upIdx] = updatedTrip;
				}
				const pastIdx = state.pastTrips.findIndex(t => t.id === updatedTrip.id);
				if (pastIdx !== -1) {
					state.pastTrips[pastIdx] = updatedTrip;
				}
			})
			.addCase(confirmTripCompletionThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export const { setTrips, addTrip, updateTrip, deleteTrip, setUpcomingTrips, setPastTrips, setLoading, setError } = tripsSlice.actions;
export default tripsSlice.reducer;
