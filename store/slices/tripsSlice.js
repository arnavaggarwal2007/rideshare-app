import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	trips: [],
	upcomingTrips: [],
	pastTrips: [],
	loading: false,
	error: null,
};

const tripsSlice = createSlice({
	name: 'trips',
	initialState,
	reducers: {
		setTrips: (state, action) => {
			state.trips = action.payload;
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
});

export const { setTrips, addTrip, updateTrip, deleteTrip, setUpcomingTrips, setPastTrips, setLoading, setError } = tripsSlice.actions;
export default tripsSlice.reducer;
