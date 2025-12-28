import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getActiveRidesPage } from '../../services/firebase/firestore';

// Async Thunks
export const fetchFeedPage = createAsyncThunk(
	'feed/fetchFeedPage',
	async ({ isInitial = false }, { getState, rejectWithValue }) => {
		try {
			const state = getState();
			const { filters, lastVisible, pageSize } = state.feed;
			
			// If initial load, don't use cursor
			const cursor = isInitial ? null : lastVisible;
			
			// Split start location search keyword into words
			let startKeyword = null;
			if (filters.startLocationKeyword && filters.startLocationKeyword.trim()) {
				const words = filters.startLocationKeyword.trim().toLowerCase().split(/\s+/);
				startKeyword = words[0];
			}
			
			// End location search keyword - use first word for query (rest filtered client-side)
			let endKeyword = null;
			if (filters.endLocationKeyword && filters.endLocationKeyword.trim()) {
				const words = filters.endLocationKeyword.trim().toLowerCase().split(/\s+/);
				endKeyword = words[0];
			}
			
			const result = await getActiveRidesPage({
				limit: pageSize,
				startAfter: cursor,
				startKeyword: startKeyword,
				endKeyword: endKeyword,
				startDate: filters.startDate || null,
			});
			
			// Apply client-side filters for fields not supported by Firestore query
			let filteredItems = result.items;
			
			// Handle multi-word start location searches
			// (Firestore matched first word, now verify all words match)
			if (filters.startLocationKeyword && filters.startLocationKeyword.trim()) {
				const searchWords = filters.startLocationKeyword.trim().toLowerCase().split(/\s+/);
				if (searchWords.length > 1) {
					filteredItems = filteredItems.filter(item => {
						const itemKeywords = item.startSearchKeywords || [];
						return searchWords.every(word => 
							itemKeywords.some(keyword => keyword.includes(word))
						);
					});
				}
			}
			
			// Handle end location searches
			// If startKeyword wasn't used in Firestore query, we need to filter by end keywords
			const hasStartSearch = startKeyword !== null && startKeyword.trim();
			const hasEndSearch = endKeyword !== null && endKeyword.trim();
			
			if (filters.endLocationKeyword && filters.endLocationKeyword.trim()) {
				const searchWords = filters.endLocationKeyword.trim().toLowerCase().split(/\s+/);
				
				// Always filter by end keywords (for multi-word matches or when endKeyword wasn't in DB query)
				if (searchWords.length > 1 || !hasEndSearch || (hasStartSearch && hasEndSearch)) {
					filteredItems = filteredItems.filter(item => {
						const itemKeywords = item.endSearchKeywords || [];
						return searchWords.every(word => 
							itemKeywords.some(keyword => keyword.includes(word))
						);
					});
				}
				// If we only have end search and it's single word, it was already filtered by Firestore
				// (no additional client-side filtering needed)
			}
			
			// Filter by end date if specified
			if (filters.endDate) {
				filteredItems = filteredItems.filter(item => {
					const departureDate = item.departureTimestamp?.toDate ? item.departureTimestamp.toDate() : new Date(item.departureTimestamp);
					return departureDate <= filters.endDate;
				});
			}
			
			// Filter by max price if specified
			if (filters.maxPrice) {
				filteredItems = filteredItems.filter(item => {
					const price = typeof item.pricePerSeat === 'number' ? item.pricePerSeat : parseFloat(item.pricePerSeat);
					return price <= filters.maxPrice;
				});
			}
			
			// Filter by min seats if specified
			if (filters.minSeats) {
				filteredItems = filteredItems.filter(item => {
					const availableSeats = typeof item.availableSeats === 'number' ? item.availableSeats : parseInt(item.availableSeats, 10);
					return availableSeats >= filters.minSeats;
				});
			}
			
			return {
				items: filteredItems,
				lastVisible: result.lastVisible,
				isInitial,
			};
		} catch (error) {
			return rejectWithValue(error?.message || 'Failed to fetch feed');
		}
	}
);

export const refreshFeed = createAsyncThunk(
	'feed/refreshFeed',
	async (_, { dispatch, rejectWithValue }) => {
		try {
			// Reset and fetch first page
			const result = await dispatch(fetchFeedPage({ isInitial: true })).unwrap();
			return result;
		} catch (error) {
			return rejectWithValue(error?.message || 'Failed to refresh feed');
		}
	}
);

const initialState = {
	items: [],
	pageSize: 20,
	lastVisible: null,
	hasMore: true,
	loading: false,
	refreshing: false,
	error: null,
	filters: {
		startLocationKeyword: '',
		endLocationKeyword: '',
		startDate: null,
		endDate: null,
		maxPrice: null,
		minSeats: null,
	},
};

const feedSlice = createSlice({
	name: 'feed',
	initialState,
	reducers: {
		setFilters: (state, action) => {
			state.filters = { ...state.filters, ...action.payload };
			// Reset pagination when filters change (but NOT items to prevent flash)
			state.lastVisible = null;
			state.hasMore = true;
		},
		clearFilters: (state) => {
			state.filters = initialState.filters;
			// Reset pagination (but NOT items to prevent flash)
			state.lastVisible = null;
			state.hasMore = true;
		},
		resetFeed: (state) => {
			state.items = [];
			state.lastVisible = null;
			state.hasMore = true;
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		// fetchFeedPage
		builder
			.addCase(fetchFeedPage.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchFeedPage.fulfilled, (state, action) => {
				state.loading = false;
				const { items, lastVisible, isInitial } = action.payload;
				
				if (isInitial) {
					// Replace items on initial/refresh
					state.items = items;
				} else {
					// Append items for pagination
					state.items = [...state.items, ...items];
				}
				
				state.lastVisible = lastVisible;
				state.hasMore = items.length === state.pageSize;
				state.error = null;
			})
			.addCase(fetchFeedPage.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});

		// refreshFeed
		builder
			.addCase(refreshFeed.pending, (state) => {
				state.refreshing = true;
				state.error = null;
			})
			.addCase(refreshFeed.fulfilled, (state) => {
				state.refreshing = false;
				state.error = null;
			})
			.addCase(refreshFeed.rejected, (state, action) => {
				state.refreshing = false;
				state.error = action.payload;
			});
	},
});

export const { setFilters, clearFilters, resetFeed } = feedSlice.actions;
export default feedSlice.reducer;
