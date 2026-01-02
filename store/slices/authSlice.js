import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	user: null,
	userProfile: null,
	isAuthenticated: false,
	loading: true, // Start with loading=true until AuthContext completes initial auth check
	error: null,
};

const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {
		setUser: (state, action) => {
			state.user = action.payload;
			state.isAuthenticated = !!action.payload;
		},
		setUserProfile: (state, action) => {
			state.userProfile = action.payload;
		},
		logout: (state) => {
			state.user = null;
			state.userProfile = null;
			state.isAuthenticated = false;
			state.loading = false;
			state.error = null;
		},
		setLoading: (state, action) => {
			state.loading = action.payload;
		},
		setError: (state, action) => {
			state.error = action.payload;
		},
	},
});

export const { setUser, setUserProfile, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
