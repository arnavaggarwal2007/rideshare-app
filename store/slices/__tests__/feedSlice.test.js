import { configureStore } from '@reduxjs/toolkit';
import feedReducer, {
	fetchFeedPage,
	refreshFeed,
	setFilters,
	clearFilters,
	resetFeed,
} from '../feedSlice';

// Mock the firestore module
jest.mock('../../../services/firebase/firestore', () => ({
	getActiveRidesPage: jest.fn(),
}));

import { getActiveRidesPage } from '../../../services/firebase/firestore';

describe('feedSlice', () => {
	let store;

	beforeEach(() => {
		store = configureStore({
			reducer: { feed: feedReducer },
		});
		jest.clearAllMocks();
	});

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const state = store.getState().feed;
			expect(state.items).toEqual([]);
			expect(state.pageSize).toBe(20);
			expect(state.lastVisible).toBeNull();
			expect(state.hasMore).toBe(true);
			expect(state.loading).toBe(false);
			expect(state.refreshing).toBe(false);
			expect(state.error).toBeNull();
			expect(state.filters).toEqual({
				startLocationKeyword: '',
				endLocationKeyword: '',
				startDate: null,
				endDate: null,
				maxPrice: null,
				minSeats: null,
			});
		});
	});

	describe('reducers', () => {
		it('setFilters should update filters and reset pagination', () => {
			// First set some items to verify they're preserved
			store.dispatch(setFilters({ startLocationKeyword: 'New York' }));
			
			const state = store.getState().feed;
			expect(state.filters.startLocationKeyword).toBe('New York');
			expect(state.lastVisible).toBeNull();
			expect(state.hasMore).toBe(true);
		});

		it('setFilters should merge with existing filters', () => {
			store.dispatch(setFilters({ startLocationKeyword: 'Boston' }));
			store.dispatch(setFilters({ maxPrice: 50 }));
			
			const state = store.getState().feed;
			expect(state.filters.startLocationKeyword).toBe('Boston');
			expect(state.filters.maxPrice).toBe(50);
		});

		it('clearFilters should reset filters to initial state', () => {
			store.dispatch(setFilters({ 
				startLocationKeyword: 'Test', 
				maxPrice: 100,
				minSeats: 2 
			}));
			store.dispatch(clearFilters());
			
			const state = store.getState().feed;
			expect(state.filters).toEqual({
				startLocationKeyword: '',
				endLocationKeyword: '',
				startDate: null,
				endDate: null,
				maxPrice: null,
				minSeats: null,
			});
		});

		it('resetFeed should clear items and reset pagination', () => {
			store.dispatch(resetFeed());
			
			const state = store.getState().feed;
			expect(state.items).toEqual([]);
			expect(state.lastVisible).toBeNull();
			expect(state.hasMore).toBe(true);
			expect(state.error).toBeNull();
		});
	});

	describe('fetchFeedPage thunk', () => {
		it('should fetch initial page successfully', async () => {
			const mockItems = [
				{ id: '1', startSearchKeywords: ['new', 'york'], endSearchKeywords: ['boston'], pricePerSeat: 25, availableSeats: 3 },
				{ id: '2', startSearchKeywords: ['new', 'york'], endSearchKeywords: ['la'], pricePerSeat: 30, availableSeats: 2 },
			];
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: { id: 'cursor' },
			});

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			expect(state.loading).toBe(false);
			expect(state.items).toHaveLength(2);
			expect(state.hasMore).toBe(false); // items.length < pageSize
			expect(state.error).toBeNull();
		});

		it('should append items when not initial load', async () => {
			// First load
			getActiveRidesPage.mockResolvedValueOnce({
				items: [{ id: '1', startSearchKeywords: [], endSearchKeywords: [], pricePerSeat: 25, availableSeats: 3 }],
				lastVisible: { id: 'cursor1' },
			});
			await store.dispatch(fetchFeedPage({ isInitial: true }));

			// Second load (pagination)
			getActiveRidesPage.mockResolvedValueOnce({
				items: [{ id: '2', startSearchKeywords: [], endSearchKeywords: [], pricePerSeat: 30, availableSeats: 2 }],
				lastVisible: { id: 'cursor2' },
			});
			await store.dispatch(fetchFeedPage({ isInitial: false }));
			
			const state = store.getState().feed;
			expect(state.items).toHaveLength(2);
		});

		it('should handle fetch error', async () => {
			getActiveRidesPage.mockRejectedValueOnce(new Error('Network error'));

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Network error');
		});

		it('should filter by startLocationKeyword with multiple words', async () => {
			store.dispatch(setFilters({ startLocationKeyword: 'new york' }));
			
			const mockItems = [
				{ id: '1', startSearchKeywords: ['new', 'york', 'city'], endSearchKeywords: ['boston'], pricePerSeat: 25, availableSeats: 3 },
				{ id: '2', startSearchKeywords: ['new'], endSearchKeywords: ['la'], pricePerSeat: 30, availableSeats: 2 },
			];
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: null,
			});

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			// Only item with both 'new' AND 'york' should be included
			expect(state.items).toHaveLength(1);
			expect(state.items[0].id).toBe('1');
		});

		it('should filter by endLocationKeyword with multi-word search', async () => {
			// Multi-word end keyword search triggers client-side filtering
			store.dispatch(setFilters({ endLocationKeyword: 'boston south' }));
			
			const mockItems = [
				{ id: '1', startSearchKeywords: ['nyc'], endSearchKeywords: ['boston', 'south', 'station'], pricePerSeat: 25, availableSeats: 3 },
				{ id: '2', startSearchKeywords: ['nyc'], endSearchKeywords: ['la'], pricePerSeat: 30, availableSeats: 2 },
			];
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: null,
			});

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			expect(state.items).toHaveLength(1);
			expect(state.items[0].id).toBe('1');
		});

		it('should filter by endDate', async () => {
			const endDate = new Date('2026-01-15');
			store.dispatch(setFilters({ endDate }));
			
			const mockItems = [
				{ id: '1', startSearchKeywords: [], endSearchKeywords: [], departureTimestamp: new Date('2026-01-10'), pricePerSeat: 25, availableSeats: 3 },
				{ id: '2', startSearchKeywords: [], endSearchKeywords: [], departureTimestamp: new Date('2026-01-20'), pricePerSeat: 30, availableSeats: 2 },
			];
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: null,
			});

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			expect(state.items).toHaveLength(1);
			expect(state.items[0].id).toBe('1');
		});

		it('should filter by maxPrice', async () => {
			store.dispatch(setFilters({ maxPrice: 30 }));
			
			const mockItems = [
				{ id: '1', startSearchKeywords: [], endSearchKeywords: [], pricePerSeat: 25, availableSeats: 3 },
				{ id: '2', startSearchKeywords: [], endSearchKeywords: [], pricePerSeat: 35, availableSeats: 2 },
			];
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: null,
			});

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			expect(state.items).toHaveLength(1);
			expect(state.items[0].id).toBe('1');
		});

		it('should filter by minSeats', async () => {
			store.dispatch(setFilters({ minSeats: 3 }));
			
			const mockItems = [
				{ id: '1', startSearchKeywords: [], endSearchKeywords: [], pricePerSeat: 25, availableSeats: 4 },
				{ id: '2', startSearchKeywords: [], endSearchKeywords: [], pricePerSeat: 30, availableSeats: 2 },
			];
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: null,
			});

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			expect(state.items).toHaveLength(1);
			expect(state.items[0].id).toBe('1');
		});

		it('should handle price as string', async () => {
			store.dispatch(setFilters({ maxPrice: 30 }));
			
			const mockItems = [
				{ id: '1', startSearchKeywords: [], endSearchKeywords: [], pricePerSeat: '25', availableSeats: 3 },
			];
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: null,
			});

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			expect(state.items).toHaveLength(1);
		});

		it('should handle seats as string', async () => {
			store.dispatch(setFilters({ minSeats: 2 }));
			
			const mockItems = [
				{ id: '1', startSearchKeywords: [], endSearchKeywords: [], pricePerSeat: 25, availableSeats: '3' },
			];
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: null,
			});

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			expect(state.items).toHaveLength(1);
		});

		it('should handle Firestore timestamp in endDate filter', async () => {
			const endDate = new Date('2026-01-15');
			store.dispatch(setFilters({ endDate }));
			
			const mockItems = [
				{ 
					id: '1', 
					startSearchKeywords: [], 
					endSearchKeywords: [], 
					departureTimestamp: { toDate: () => new Date('2026-01-10') }, 
					pricePerSeat: 25, 
					availableSeats: 3 
				},
			];
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: null,
			});

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			expect(state.items).toHaveLength(1);
		});

		it('should set hasMore based on pageSize', async () => {
			const mockItems = Array(20).fill(null).map((_, i) => ({
				id: `${i}`,
				startSearchKeywords: [],
				endSearchKeywords: [],
				pricePerSeat: 25,
				availableSeats: 3,
			}));
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: { id: 'cursor' },
			});

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			expect(state.hasMore).toBe(true); // items.length === pageSize
		});
	});

	describe('refreshFeed thunk', () => {
		it('should refresh feed successfully', async () => {
			const mockItems = [{ id: '1', startSearchKeywords: [], endSearchKeywords: [], pricePerSeat: 25, availableSeats: 3 }];
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: null,
			});

			await store.dispatch(refreshFeed());
			
			const state = store.getState().feed;
			expect(state.refreshing).toBe(false);
			expect(state.error).toBeNull();
		});

		it('should handle refresh error', async () => {
			getActiveRidesPage.mockRejectedValueOnce(new Error('Refresh failed'));

			await store.dispatch(refreshFeed());
			
			const state = store.getState().feed;
			expect(state.refreshing).toBe(false);
			expect(state.error).toBeTruthy();
		});

		it('should set refreshing state while loading', async () => {
			let resolvePromise;
			getActiveRidesPage.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(refreshFeed());
			
			// Check state while loading
			expect(store.getState().feed.refreshing).toBe(true);
			
			// Resolve the promise
			resolvePromise({ items: [], lastVisible: null });
			await promise;
			
			expect(store.getState().feed.refreshing).toBe(false);
		});
	});

	describe('combined filters', () => {
		it('should apply multiple filters together', async () => {
			store.dispatch(setFilters({
				startLocationKeyword: 'new york city', // Multi-word triggers client-side start filtering
				endLocationKeyword: 'boston south', // Multi-word triggers client-side end filtering
				maxPrice: 50,
				minSeats: 2,
			}));
			
			const mockItems = [
				{ id: '1', startSearchKeywords: ['new', 'york', 'city'], endSearchKeywords: ['boston', 'south'], pricePerSeat: 25, availableSeats: 3 },
				{ id: '2', startSearchKeywords: ['new'], endSearchKeywords: ['la'], pricePerSeat: 30, availableSeats: 2 },
				{ id: '3', startSearchKeywords: ['chicago'], endSearchKeywords: ['boston', 'south'], pricePerSeat: 40, availableSeats: 4 },
				{ id: '4', startSearchKeywords: ['new', 'york', 'city'], endSearchKeywords: ['boston', 'south'], pricePerSeat: 60, availableSeats: 3 },
				{ id: '5', startSearchKeywords: ['new', 'york', 'city'], endSearchKeywords: ['boston', 'south'], pricePerSeat: 30, availableSeats: 1 },
			];
			getActiveRidesPage.mockResolvedValueOnce({
				items: mockItems,
				lastVisible: null,
			});

			await store.dispatch(fetchFeedPage({ isInitial: true }));
			
			const state = store.getState().feed;
			// Only item 1 should match all filters (correct start keywords, end keywords, price <= 50, seats >= 2)
			expect(state.items).toHaveLength(1);
			expect(state.items[0].id).toBe('1');
		});
	});
});
