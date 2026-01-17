import authReducer, {
	setUser,
	setUserProfile,
	logout,
	setLoading,
	setError,
} from '../authSlice';

describe('authSlice', () => {
	const initialState = {
		user: null,
		userProfile: null,
		isAuthenticated: false,
		loading: true,
		error: null,
	};

	describe('initial state', () => {
		it('should return the initial state', () => {
			expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
		});

		it('should have loading true initially', () => {
			const state = authReducer(undefined, { type: 'unknown' });
			expect(state.loading).toBe(true);
		});
	});

	describe('setUser reducer', () => {
		it('should set user and isAuthenticated to true', () => {
			const user = { uid: 'user123', email: 'test@example.com' };
			const state = authReducer(initialState, setUser(user));
			
			expect(state.user).toEqual(user);
			expect(state.isAuthenticated).toBe(true);
		});

		it('should set isAuthenticated to false when user is null', () => {
			const stateWithUser = {
				...initialState,
				user: { uid: 'user123' },
				isAuthenticated: true,
			};
			const state = authReducer(stateWithUser, setUser(null));
			
			expect(state.user).toBeNull();
			expect(state.isAuthenticated).toBe(false);
		});

		it('should set isAuthenticated to false when user is undefined', () => {
			const stateWithUser = {
				...initialState,
				user: { uid: 'user123' },
				isAuthenticated: true,
			};
			const state = authReducer(stateWithUser, setUser(undefined));
			
			expect(state.user).toBeUndefined();
			expect(state.isAuthenticated).toBe(false);
		});
	});

	describe('setUserProfile reducer', () => {
		it('should set user profile', () => {
			const profile = {
				name: 'John Doe',
				email: 'john@example.com',
				photoURL: 'http://photo.jpg',
				school: 'Test University',
				averageRating: 4.5,
			};
			const state = authReducer(initialState, setUserProfile(profile));
			
			expect(state.userProfile).toEqual(profile);
		});

		it('should allow setting profile to null', () => {
			const stateWithProfile = {
				...initialState,
				userProfile: { name: 'John' },
			};
			const state = authReducer(stateWithProfile, setUserProfile(null));
			
			expect(state.userProfile).toBeNull();
		});
	});

	describe('logout reducer', () => {
		it('should reset all auth state', () => {
			const loggedInState = {
				user: { uid: 'user123', email: 'test@example.com' },
				userProfile: { name: 'John' },
				isAuthenticated: true,
				loading: false,
				error: 'Some error',
			};
			const state = authReducer(loggedInState, logout());
			
			expect(state.user).toBeNull();
			expect(state.userProfile).toBeNull();
			expect(state.isAuthenticated).toBe(false);
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
		});
	});

	describe('setLoading reducer', () => {
		it('should set loading to true', () => {
			const state = authReducer(initialState, setLoading(true));
			expect(state.loading).toBe(true);
		});

		it('should set loading to false', () => {
			const state = authReducer(initialState, setLoading(false));
			expect(state.loading).toBe(false);
		});
	});

	describe('setError reducer', () => {
		it('should set error message', () => {
			const state = authReducer(initialState, setError('Authentication failed'));
			expect(state.error).toBe('Authentication failed');
		});

		it('should clear error when set to null', () => {
			const stateWithError = {
				...initialState,
				error: 'Some error',
			};
			const state = authReducer(stateWithError, setError(null));
			expect(state.error).toBeNull();
		});
	});

	describe('combined scenarios', () => {
		it('should handle login flow', () => {
			let state = authReducer(initialState, { type: 'unknown' });
			expect(state.loading).toBe(true);
			
			// User logs in
			const user = { uid: 'user123', email: 'test@example.com' };
			state = authReducer(state, setUser(user));
			expect(state.isAuthenticated).toBe(true);
			
			// Profile loads
			const profile = { name: 'John', email: 'test@example.com' };
			state = authReducer(state, setUserProfile(profile));
			expect(state.userProfile).toEqual(profile);
			
			// Loading completes
			state = authReducer(state, setLoading(false));
			expect(state.loading).toBe(false);
		});

		it('should handle logout flow', () => {
			const loggedInState = {
				user: { uid: 'user123' },
				userProfile: { name: 'John' },
				isAuthenticated: true,
				loading: false,
				error: null,
			};
			
			const state = authReducer(loggedInState, logout());
			
			expect(state.user).toBeNull();
			expect(state.userProfile).toBeNull();
			expect(state.isAuthenticated).toBe(false);
		});

		it('should handle auth error flow', () => {
			let state = authReducer(initialState, setLoading(true));
			
			// Error occurs
			state = authReducer(state, setError('Network error'));
			expect(state.error).toBe('Network error');
			
			// Loading stops
			state = authReducer(state, setLoading(false));
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Network error');
		});
	});
});
