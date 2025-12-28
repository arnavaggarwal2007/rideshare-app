import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
    createRide as createRideService,
    deleteRide as deleteRideService,
    getUserRides,
    updateRide as updateRideService
} from '../../services/firebase/firestore';

// Async Thunks
export const fetchMyRides = createAsyncThunk(
	'rides/fetchMyRides',
	async (userId, { rejectWithValue }) => {
		try {
			const rides = await getUserRides(userId);
			return rides;
		} catch (error) {
			return rejectWithValue(error?.message || 'Failed to fetch rides');
		}
	}
);

export const createRideThunk = createAsyncThunk(
	'rides/createRide',
	async ({ rideData, userId, userProfile }, { rejectWithValue }) => {
		try {
			const rideId = await createRideService(rideData, userId, userProfile);
			// Return the full ride object for state update
			return {
				id: rideId,
				...rideData,
				driverId: userId,
				driverName: userProfile?.name || 'Driver',
				driverPhotoURL: userProfile?.photoURL || '',
				driverRating: userProfile?.averageRating || 0,
				availableSeats: rideData.totalSeats,
				status: 'active',
				isActive: true,
			};
		} catch (error) {
			return rejectWithValue(error?.message || 'Failed to create ride');
		}
	}
);

export const updateRideThunk = createAsyncThunk(
	'rides/updateRide',
	async ({ rideId, updates }, { rejectWithValue }) => {
		try {
			await updateRideService(rideId, updates);
			return { rideId, updates };
		} catch (error) {
			return rejectWithValue(error?.message || 'Failed to update ride');
		}
	}
);

export const deleteRideThunk = createAsyncThunk(
	'rides/deleteRide',
	async (rideId, { rejectWithValue }) => {
		try {
			await deleteRideService(rideId);
			return rideId;
		} catch (error) {
			return rejectWithValue(error?.message || 'Failed to delete ride');
		}
	}
);

const initialState = {
	rides: [],
	myRides: [],
	loading: false,
	error: null,
};

const ridesSlice = createSlice({
	name: 'rides',
	initialState,
	reducers: {
		setRides: (state, action) => {
			state.rides = action.payload;
		},
		addRide: (state, action) => {
			state.rides.push(action.payload);
		},
		updateRide: (state, action) => {
			const idx = state.rides.findIndex(r => r.id === action.payload.id);
			if (idx !== -1) state.rides[idx] = action.payload;
		},
		deleteRide: (state, action) => {
			state.rides = state.rides.filter(r => r.id !== action.payload);
		},
		setMyRides: (state, action) => {
			state.myRides = action.payload;
		},
		setLoading: (state, action) => {
			state.loading = action.payload;
		},
		setError: (state, action) => {
			state.error = action.payload;
		},
	},
	extraReducers: (builder) => {
		// fetchMyRides
		builder
			.addCase(fetchMyRides.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchMyRides.fulfilled, (state, action) => {
				state.loading = false;
				state.myRides = action.payload;
				state.error = null;
			})
			.addCase(fetchMyRides.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});

		// createRideThunk
		builder
			.addCase(createRideThunk.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(createRideThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.myRides.push(action.payload);
				state.error = null;
			})
			.addCase(createRideThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});

		// updateRideThunk
		builder
			.addCase(updateRideThunk.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(updateRideThunk.fulfilled, (state, action) => {
				state.loading = false;
				const { rideId, updates } = action.payload;
				const idx = state.myRides.findIndex(r => r.id === rideId);
				if (idx !== -1) {
					state.myRides[idx] = { ...state.myRides[idx], ...updates };
				}
				state.error = null;
			})
			.addCase(updateRideThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});

		// deleteRideThunk
		builder
			.addCase(deleteRideThunk.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(deleteRideThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.myRides = state.myRides.filter(r => r.id !== action.payload);
				state.error = null;
			})
			.addCase(deleteRideThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export const { setRides, addRide, updateRide, deleteRide, setMyRides, setLoading, setError } = ridesSlice.actions;
export default ridesSlice.reducer;
