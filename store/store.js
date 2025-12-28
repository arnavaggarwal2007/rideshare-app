import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import composeWithDevTools from './devtools';

// Sanitize sensitive fields from Redux state for DevTools
function stateSanitizer(state) {
	if (state && state.auth && state.auth.user && state.auth.user.stsTokenManager) {
		// Remove stsTokenManager from user object
		return {
			...state,
			auth: {
				...state.auth,
				user: {
					...state.auth.user,
					stsTokenManager: '[REDACTED]'
				}
			}
		};
	}
	return state;
}

import authReducer from './slices/authSlice';
import feedReducer from './slices/feedSlice';
import ridesReducer from './slices/ridesSlice';
import tripsReducer from './slices/tripsSlice';

const persistConfig = {
	key: 'root',
	storage: AsyncStorage,
	whitelist: ['auth', 'rides', 'trips'],
};

const rootReducer = combineReducers({
	auth: authReducer,
	feed: feedReducer,
	rides: ridesReducer,
	trips: tripsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = (__DEV__
	? configureStore(
			composeWithDevTools({
				reducer: persistedReducer,
				middleware: (getDefaultMiddleware) =>
					getDefaultMiddleware({
						serializableCheck: false,
					}),
				// Add stateSanitizer for DevTools
				devTools: {
					stateSanitizer,
				},
			})
		)
	: configureStore({
			reducer: persistedReducer,
			middleware: (getDefaultMiddleware) =>
				getDefaultMiddleware({
					serializableCheck: false,
				}),
		})
);

// Redux Thunk is enabled by default in Redux Toolkit's getDefaultMiddleware.
// You can use async thunks via createAsyncThunk for Firestore and other async actions.
// See Documents/THUNK_GUIDE.md for usage examples.

export const persistor = persistStore(store);
