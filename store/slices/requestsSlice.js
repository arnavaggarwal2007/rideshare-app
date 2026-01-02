import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { acceptRideRequest, cancelRideRequest, createRideRequest, declineRideRequest, getRiderRequests } from '../../services/firebase/firestore';

// Async Thunks
export const createRequestThunk = createAsyncThunk(
  'requests/createRequest',
  async ({ rideId, riderId, riderProfile, rideData, seatsRequested = 1, message = null, pickupLocation = null, dropoffLocation = null }, { rejectWithValue }) => {
    try {
      const requestId = await createRideRequest(rideId, riderId, riderProfile, rideData, seatsRequested, message, pickupLocation, dropoffLocation);
      // Optimistic local object so UI can update immediately
      return {
        id: requestId,
        rideId,
        riderId,
        driverId: rideData.driverId,
        driverName: rideData.driverName || 'Driver',
        riderName: riderProfile?.name || 'Rider',
        riderPhotoURL: riderProfile?.photoURL || '',
        riderRating: riderProfile?.averageRating || 0,
        startLocation: rideData.startLocation || null,
        endLocation: rideData.endLocation || null,
        pickupLocation,
        dropoffLocation,
        seatsRequested,
        status: 'pending',
        message: message || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        respondedAt: null,
      };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to create request');
    }
  }
);

export const fetchMyRequestsThunk = createAsyncThunk(
  'requests/fetchMyRequests',
  async (riderId, { rejectWithValue }) => {
    try {
      const requests = await getRiderRequests(riderId);
      return requests;
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load requests');
    }
  }
);

export const cancelRequestThunk = createAsyncThunk(
  'requests/cancelRequest',
  async (requestId, { rejectWithValue }) => {
    try {
      await cancelRideRequest(requestId);
      return requestId;
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to cancel request');
    }
  }
);

export const acceptRequestThunk = createAsyncThunk(
  'requests/acceptRequest',
  async ({ requestId, rideId }, { rejectWithValue }) => {
    try {
      const { tripId, chatId } = await acceptRideRequest(requestId, rideId);
      return { requestId, tripId, chatId };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to accept request');
    }
  }
);

export const declineRequestThunk = createAsyncThunk(
  'requests/declineRequest',
  async (requestId, { rejectWithValue }) => {
    try {
      await declineRideRequest(requestId);
      return requestId;
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to decline request');
    }
  }
);

const initialState = {
  myRequests: [],
  loading: false,
  submitting: false,
  accepting: false,
  declining: false,
  error: null,
};

const requestsSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {
    setMyRequests: (state, action) => {
      state.myRequests = action.payload;
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
      // fetchMyRequestsThunk
      .addCase(fetchMyRequestsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyRequestsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.myRequests = action.payload;
        state.error = null;
      })
      .addCase(fetchMyRequestsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // createRequestThunk
      .addCase(createRequestThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createRequestThunk.fulfilled, (state, action) => {
        state.submitting = false;
        state.myRequests = [action.payload, ...state.myRequests];
        state.error = null;
      })
      .addCase(createRequestThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })

      // cancelRequestThunk
      .addCase(cancelRequestThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelRequestThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.myRequests = state.myRequests.filter((req) => req.id !== action.payload);
        state.error = null;
      })
      .addCase(cancelRequestThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // acceptRequestThunk
      .addCase(acceptRequestThunk.pending, (state) => {
        state.accepting = true;
        state.error = null;
      })
      .addCase(acceptRequestThunk.fulfilled, (state, action) => {
        state.accepting = false;
        // Update request status in myRequests if it exists
        const index = state.myRequests.findIndex((req) => req.id === action.payload.requestId);
        if (index !== -1) {
          state.myRequests[index].status = 'accepted';
          state.myRequests[index].tripId = action.payload.tripId;
        }
        state.error = null;
      })
      .addCase(acceptRequestThunk.rejected, (state, action) => {
        state.accepting = false;
        state.error = action.payload;
      })

      // declineRequestThunk
      .addCase(declineRequestThunk.pending, (state) => {
        state.declining = true;
        state.error = null;
      })
      .addCase(declineRequestThunk.fulfilled, (state, action) => {
        state.declining = false;
        // Update request status in myRequests if it exists
        const index = state.myRequests.findIndex((req) => req.id === action.payload);
        if (index !== -1) {
          state.myRequests[index].status = 'declined';
        }
        state.error = null;
      })
      .addCase(declineRequestThunk.rejected, (state, action) => {
        state.declining = false;
        state.error = action.payload;
      });
  },
});

export const { setMyRequests, setLoading, setError } = requestsSlice.actions;
export default requestsSlice.reducer;
