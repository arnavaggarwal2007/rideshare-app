import { createSlice } from '@reduxjs/toolkit';

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
});

export const { setRides, addRide, updateRide, deleteRide, setMyRides, setLoading, setError } = ridesSlice.actions;
export default ridesSlice.reducer;
