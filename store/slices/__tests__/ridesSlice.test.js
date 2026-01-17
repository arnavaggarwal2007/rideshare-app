import { configureStore } from '@reduxjs/toolkit';
import ridesReducer, {
	fetchMyRides,
	createRideThunk,
	updateRideThunk,
	deleteRideThunk,
	setRides,
	addRide,
	updateRide,
	deleteRide,
	setMyRides,
	setLoading,
	setError,
} from '../ridesSlice';

// Mock the firestore module
jest.mock('../../../services/firebase/firestore', () => ({
	getUserRides: jest.fn(),
	createRide: jest.fn(),
	updateRide: jest.fn(),
	deleteRide: jest.fn(),
}));

import {
	getUserRides,
	createRide,
	updateRide as updateRideService,
	deleteRide as deleteRideService,
} from '../../../services/firebase/firestore';

describe('ridesSlice', () => {
	let store;

	beforeEach(() => {
		store = configureStore({
			reducer: { rides: ridesReducer },
		});
		jest.clearAllMocks();
	});

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const state = store.getState().rides;
			expect(state.rides).toEqual([]);
			expect(state.myRides).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
		});
	});

	describe('synchronous reducers', () => {
		it('setRides should update rides array', () => {
			const rides = [{ id: '1', name: 'Ride 1' }, { id: '2', name: 'Ride 2' }];
			store.dispatch(setRides(rides));
			expect(store.getState().rides.rides).toEqual(rides);
		});

		it('addRide should add a ride to rides array', () => {
			store.dispatch(addRide({ id: '1', name: 'New Ride' }));
			expect(store.getState().rides.rides).toHaveLength(1);
			expect(store.getState().rides.rides[0].name).toBe('New Ride');
		});

		it('updateRide should update an existing ride', () => {
			store.dispatch(setRides([{ id: '1', name: 'Old Name' }]));
			store.dispatch(updateRide({ id: '1', name: 'New Name' }));
			expect(store.getState().rides.rides[0].name).toBe('New Name');
		});

		it('updateRide should not update if ride not found', () => {
			store.dispatch(setRides([{ id: '1', name: 'Ride 1' }]));
			store.dispatch(updateRide({ id: '999', name: 'New Name' }));
			expect(store.getState().rides.rides[0].name).toBe('Ride 1');
		});

		it('deleteRide should remove a ride from rides array', () => {
			store.dispatch(setRides([{ id: '1', name: 'Ride 1' }, { id: '2', name: 'Ride 2' }]));
			store.dispatch(deleteRide('1'));
			expect(store.getState().rides.rides).toHaveLength(1);
			expect(store.getState().rides.rides[0].id).toBe('2');
		});

		it('setMyRides should update myRides array', () => {
			const myRides = [{ id: '1', name: 'My Ride' }];
			store.dispatch(setMyRides(myRides));
			expect(store.getState().rides.myRides).toEqual(myRides);
		});

		it('setLoading should update loading state', () => {
			store.dispatch(setLoading(true));
			expect(store.getState().rides.loading).toBe(true);
			store.dispatch(setLoading(false));
			expect(store.getState().rides.loading).toBe(false);
		});

		it('setError should update error state', () => {
			store.dispatch(setError('Test error'));
			expect(store.getState().rides.error).toBe('Test error');
		});
	});

	describe('fetchMyRides thunk', () => {
		it('should fetch rides successfully', async () => {
			const mockRides = [
				{ id: '1', name: 'Ride 1' },
				{ id: '2', name: 'Ride 2' },
			];
			getUserRides.mockResolvedValueOnce(mockRides);

			await store.dispatch(fetchMyRides('user123'));

			const state = store.getState().rides;
			expect(state.loading).toBe(false);
			expect(state.myRides).toEqual(mockRides);
			expect(state.error).toBeNull();
			expect(getUserRides).toHaveBeenCalledWith('user123');
		});

		it('should handle fetch error', async () => {
			getUserRides.mockRejectedValueOnce(new Error('Network error'));

			await store.dispatch(fetchMyRides('user123'));

			const state = store.getState().rides;
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Network error');
		});

		it('should handle error without message', async () => {
			getUserRides.mockRejectedValueOnce({});

			await store.dispatch(fetchMyRides('user123'));

			const state = store.getState().rides;
			expect(state.error).toBe('Failed to fetch rides');
		});

		it('should set loading state while fetching', async () => {
			let resolvePromise;
			getUserRides.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(fetchMyRides('user123'));
			expect(store.getState().rides.loading).toBe(true);
			
			resolvePromise([]);
			await promise;
			
			expect(store.getState().rides.loading).toBe(false);
		});
	});

	describe('createRideThunk', () => {
		const mockRideData = {
			startLocation: { address: 'NYC' },
			endLocation: { address: 'Boston' },
			totalSeats: 4,
			pricePerSeat: 25,
		};

		const mockUserProfile = {
			name: 'John Doe',
			photoURL: 'http://example.com/photo.jpg',
			averageRating: 4.5,
		};

		it('should create ride successfully', async () => {
			createRide.mockResolvedValueOnce('new-ride-id');

			const result = await store.dispatch(createRideThunk({
				rideData: mockRideData,
				userId: 'user123',
				userProfile: mockUserProfile,
			}));

			expect(result.payload.id).toBe('new-ride-id');
			expect(result.payload.driverId).toBe('user123');
			expect(result.payload.driverName).toBe('John Doe');
			expect(result.payload.status).toBe('active');
			
			const state = store.getState().rides;
			expect(state.myRides).toHaveLength(1);
			expect(state.loading).toBe(false);
		});

		it('should handle missing userProfile name', async () => {
			createRide.mockResolvedValueOnce('new-ride-id');

			const result = await store.dispatch(createRideThunk({
				rideData: mockRideData,
				userId: 'user123',
				userProfile: {},
			}));

			expect(result.payload.driverName).toBe('Driver');
			expect(result.payload.driverPhotoURL).toBe('');
			expect(result.payload.driverRating).toBe(0);
		});

		it('should handle create error', async () => {
			createRide.mockRejectedValueOnce(new Error('Create failed'));

			await store.dispatch(createRideThunk({
				rideData: mockRideData,
				userId: 'user123',
				userProfile: mockUserProfile,
			}));

			const state = store.getState().rides;
			expect(state.error).toBe('Create failed');
			expect(state.myRides).toHaveLength(0);
		});

		it('should handle error without message', async () => {
			createRide.mockRejectedValueOnce({});

			await store.dispatch(createRideThunk({
				rideData: mockRideData,
				userId: 'user123',
				userProfile: mockUserProfile,
			}));

			expect(store.getState().rides.error).toBe('Failed to create ride');
		});
	});

	describe('updateRideThunk', () => {
		it('should update ride successfully', async () => {
			// Setup initial state
			store.dispatch(setMyRides([{ id: 'ride1', name: 'Original', pricePerSeat: 20 }]));
			
			updateRideService.mockResolvedValueOnce();

			await store.dispatch(updateRideThunk({
				rideId: 'ride1',
				updates: { pricePerSeat: 30 },
			}));

			const state = store.getState().rides;
			expect(state.myRides[0].pricePerSeat).toBe(30);
			expect(state.myRides[0].name).toBe('Original');
			expect(state.loading).toBe(false);
		});

		it('should handle update error', async () => {
			updateRideService.mockRejectedValueOnce(new Error('Update failed'));

			await store.dispatch(updateRideThunk({
				rideId: 'ride1',
				updates: { pricePerSeat: 30 },
			}));

			expect(store.getState().rides.error).toBe('Update failed');
		});

		it('should handle error without message', async () => {
			updateRideService.mockRejectedValueOnce({});

			await store.dispatch(updateRideThunk({
				rideId: 'ride1',
				updates: {},
			}));

			expect(store.getState().rides.error).toBe('Failed to update ride');
		});

		it('should not crash if ride not in myRides', async () => {
			store.dispatch(setMyRides([{ id: 'ride1', name: 'Ride 1' }]));
			updateRideService.mockResolvedValueOnce();

			await store.dispatch(updateRideThunk({
				rideId: 'nonexistent',
				updates: { pricePerSeat: 30 },
			}));

			// Should not crash, ride1 should be unchanged
			expect(store.getState().rides.myRides[0].name).toBe('Ride 1');
		});
	});

	describe('deleteRideThunk', () => {
		it('should delete ride successfully', async () => {
			store.dispatch(setMyRides([
				{ id: 'ride1', name: 'Ride 1' },
				{ id: 'ride2', name: 'Ride 2' },
			]));
			
			deleteRideService.mockResolvedValueOnce();

			await store.dispatch(deleteRideThunk('ride1'));

			const state = store.getState().rides;
			expect(state.myRides).toHaveLength(1);
			expect(state.myRides[0].id).toBe('ride2');
			expect(state.loading).toBe(false);
		});

		it('should handle delete error', async () => {
			deleteRideService.mockRejectedValueOnce(new Error('Delete failed'));

			await store.dispatch(deleteRideThunk('ride1'));

			expect(store.getState().rides.error).toBe('Delete failed');
		});

		it('should handle error without message', async () => {
			deleteRideService.mockRejectedValueOnce({});

			await store.dispatch(deleteRideThunk('ride1'));

			expect(store.getState().rides.error).toBe('Failed to delete ride');
		});
	});

	describe('loading and error states', () => {
		it('should clear error on new fetch', async () => {
			store.dispatch(setError('Previous error'));
			
			getUserRides.mockResolvedValueOnce([]);
			await store.dispatch(fetchMyRides('user123'));

			expect(store.getState().rides.error).toBeNull();
		});

		it('should clear error on new create', async () => {
			store.dispatch(setError('Previous error'));
			
			createRide.mockResolvedValueOnce('new-id');
			await store.dispatch(createRideThunk({
				rideData: { totalSeats: 1, pricePerSeat: 10 },
				userId: 'user123',
				userProfile: {},
			}));

			expect(store.getState().rides.error).toBeNull();
		});
	});
});
