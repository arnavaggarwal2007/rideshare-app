import { configureStore } from '@reduxjs/toolkit';
import requestsReducer, {
	createRequestThunk,
	fetchMyRequestsThunk,
	cancelRequestThunk,
	acceptRequestThunk,
	declineRequestThunk,
	setMyRequests,
	setLoading,
	setError,
} from '../requestsSlice';

// Mock the firestore module
jest.mock('../../../services/firebase/firestore', () => ({
	createRideRequest: jest.fn(),
	getRiderRequests: jest.fn(),
	cancelRideRequest: jest.fn(),
	acceptRideRequest: jest.fn(),
	declineRideRequest: jest.fn(),
}));

import {
	createRideRequest,
	getRiderRequests,
	cancelRideRequest,
	acceptRideRequest,
	declineRideRequest,
} from '../../../services/firebase/firestore';

describe('requestsSlice', () => {
	let store;

	beforeEach(() => {
		store = configureStore({
			reducer: { requests: requestsReducer },
		});
		jest.clearAllMocks();
	});

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const state = store.getState().requests;
			expect(state.myRequests).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.submitting).toBe(false);
			expect(state.accepting).toBe(false);
			expect(state.declining).toBe(false);
			expect(state.error).toBeNull();
		});
	});

	describe('synchronous reducers', () => {
		it('setMyRequests should update myRequests', () => {
			const requests = [{ id: '1', status: 'pending' }];
			store.dispatch(setMyRequests(requests));
			expect(store.getState().requests.myRequests).toEqual(requests);
		});

		it('setLoading should update loading state', () => {
			store.dispatch(setLoading(true));
			expect(store.getState().requests.loading).toBe(true);
		});

		it('setError should update error state', () => {
			store.dispatch(setError('Test error'));
			expect(store.getState().requests.error).toBe('Test error');
		});
	});

	describe('createRequestThunk', () => {
		const requestParams = {
			rideId: 'ride1',
			riderId: 'rider1',
			riderProfile: {
				name: 'John',
				photoURL: 'http://photo.jpg',
				averageRating: 4.5,
			},
			rideData: {
				driverId: 'driver1',
				driverName: 'Jane Driver',
				startLocation: { address: 'NYC' },
				endLocation: { address: 'Boston' },
			},
			seatsRequested: 2,
			message: 'Please pick me up!',
			pickupLocation: { address: 'Pickup' },
			dropoffLocation: { address: 'Dropoff' },
		};

		it('should create request successfully', async () => {
			createRideRequest.mockResolvedValueOnce('request-id');

			await store.dispatch(createRequestThunk(requestParams));

			const state = store.getState().requests;
			expect(state.myRequests).toHaveLength(1);
			expect(state.myRequests[0].id).toBe('request-id');
			expect(state.myRequests[0].riderName).toBe('John');
			expect(state.myRequests[0].status).toBe('pending');
			expect(state.submitting).toBe(false);
		});

		it('should handle missing profile data', async () => {
			createRideRequest.mockResolvedValueOnce('request-id');

			await store.dispatch(createRequestThunk({
				...requestParams,
				riderProfile: {},
				rideData: { driverId: 'driver1' },
			}));

			const state = store.getState().requests;
			expect(state.myRequests[0].riderName).toBe('Rider');
			expect(state.myRequests[0].driverName).toBe('Driver');
			expect(state.myRequests[0].riderPhotoURL).toBe('');
			expect(state.myRequests[0].riderRating).toBe(0);
		});

		it('should handle default seatsRequested', async () => {
			createRideRequest.mockResolvedValueOnce('request-id');

			await store.dispatch(createRequestThunk({
				rideId: 'ride1',
				riderId: 'rider1',
				riderProfile: {},
				rideData: { driverId: 'driver1' },
			}));

			const state = store.getState().requests;
			expect(state.myRequests[0].seatsRequested).toBe(1);
		});

		it('should handle create error', async () => {
			createRideRequest.mockRejectedValueOnce(new Error('Create failed'));

			await store.dispatch(createRequestThunk(requestParams));

			expect(store.getState().requests.error).toBe('Create failed');
			expect(store.getState().requests.myRequests).toHaveLength(0);
		});

		it('should handle error without message', async () => {
			createRideRequest.mockRejectedValueOnce({});

			await store.dispatch(createRequestThunk(requestParams));

			expect(store.getState().requests.error).toBe('Failed to create request');
		});

		it('should set submitting state while creating', async () => {
			let resolvePromise;
			createRideRequest.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(createRequestThunk(requestParams));
			expect(store.getState().requests.submitting).toBe(true);

			resolvePromise('request-id');
			await promise;

			expect(store.getState().requests.submitting).toBe(false);
		});
	});

	describe('fetchMyRequestsThunk', () => {
		it('should fetch requests successfully', async () => {
			const mockRequests = [
				{ id: '1', status: 'pending' },
				{ id: '2', status: 'accepted' },
			];
			getRiderRequests.mockResolvedValueOnce(mockRequests);

			await store.dispatch(fetchMyRequestsThunk('rider1'));

			const state = store.getState().requests;
			expect(state.myRequests).toEqual(mockRequests);
			expect(state.loading).toBe(false);
			expect(getRiderRequests).toHaveBeenCalledWith('rider1');
		});

		it('should handle fetch error', async () => {
			getRiderRequests.mockRejectedValueOnce(new Error('Fetch failed'));

			await store.dispatch(fetchMyRequestsThunk('rider1'));

			expect(store.getState().requests.error).toBe('Fetch failed');
		});

		it('should handle error without message', async () => {
			getRiderRequests.mockRejectedValueOnce({});

			await store.dispatch(fetchMyRequestsThunk('rider1'));

			expect(store.getState().requests.error).toBe('Failed to load requests');
		});

		it('should set loading state while fetching', async () => {
			let resolvePromise;
			getRiderRequests.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(fetchMyRequestsThunk('rider1'));
			expect(store.getState().requests.loading).toBe(true);

			resolvePromise([]);
			await promise;

			expect(store.getState().requests.loading).toBe(false);
		});
	});

	describe('cancelRequestThunk', () => {
		it('should cancel request successfully', async () => {
			store.dispatch(setMyRequests([
				{ id: '1', status: 'pending' },
				{ id: '2', status: 'pending' },
			]));
			
			cancelRideRequest.mockResolvedValueOnce();

			await store.dispatch(cancelRequestThunk('1'));

			const state = store.getState().requests;
			expect(state.myRequests).toHaveLength(1);
			expect(state.myRequests[0].id).toBe('2');
		});

		it('should handle cancel error', async () => {
			cancelRideRequest.mockRejectedValueOnce(new Error('Cancel failed'));

			await store.dispatch(cancelRequestThunk('1'));

			expect(store.getState().requests.error).toBe('Cancel failed');
		});

		it('should handle error without message', async () => {
			cancelRideRequest.mockRejectedValueOnce({});

			await store.dispatch(cancelRequestThunk('1'));

			expect(store.getState().requests.error).toBe('Failed to cancel request');
		});
	});

	describe('acceptRequestThunk', () => {
		it('should accept request successfully', async () => {
			store.dispatch(setMyRequests([{ id: '1', status: 'pending' }]));
			
			acceptRideRequest.mockResolvedValueOnce({
				tripId: 'trip1',
				chatId: 'chat1',
			});

			await store.dispatch(acceptRequestThunk({
				requestId: '1',
				rideId: 'ride1',
			}));

			const state = store.getState().requests;
			expect(state.myRequests[0].status).toBe('accepted');
			expect(state.myRequests[0].tripId).toBe('trip1');
			expect(state.accepting).toBe(false);
		});

		it('should handle accept error', async () => {
			acceptRideRequest.mockRejectedValueOnce(new Error('Accept failed'));

			await store.dispatch(acceptRequestThunk({
				requestId: '1',
				rideId: 'ride1',
			}));

			expect(store.getState().requests.error).toBe('Accept failed');
		});

		it('should handle error without message', async () => {
			acceptRideRequest.mockRejectedValueOnce({});

			await store.dispatch(acceptRequestThunk({
				requestId: '1',
				rideId: 'ride1',
			}));

			expect(store.getState().requests.error).toBe('Failed to accept request');
		});

		it('should set accepting state while accepting', async () => {
			let resolvePromise;
			acceptRideRequest.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(acceptRequestThunk({
				requestId: '1',
				rideId: 'ride1',
			}));
			expect(store.getState().requests.accepting).toBe(true);

			resolvePromise({ tripId: 'trip1', chatId: 'chat1' });
			await promise;

			expect(store.getState().requests.accepting).toBe(false);
		});

		it('should handle request not found in myRequests', async () => {
			store.dispatch(setMyRequests([{ id: '2', status: 'pending' }]));
			
			acceptRideRequest.mockResolvedValueOnce({
				tripId: 'trip1',
				chatId: 'chat1',
			});

			await store.dispatch(acceptRequestThunk({
				requestId: '1',
				rideId: 'ride1',
			}));

			// Should not crash, request 2 unchanged
			expect(store.getState().requests.myRequests[0].status).toBe('pending');
		});
	});

	describe('declineRequestThunk', () => {
		it('should decline request successfully', async () => {
			store.dispatch(setMyRequests([{ id: '1', status: 'pending' }]));
			
			declineRideRequest.mockResolvedValueOnce();

			await store.dispatch(declineRequestThunk('1'));

			expect(store.getState().requests.myRequests[0].status).toBe('declined');
			expect(store.getState().requests.declining).toBe(false);
		});

		it('should handle decline error', async () => {
			declineRideRequest.mockRejectedValueOnce(new Error('Decline failed'));

			await store.dispatch(declineRequestThunk('1'));

			expect(store.getState().requests.error).toBe('Decline failed');
		});

		it('should handle error without message', async () => {
			declineRideRequest.mockRejectedValueOnce({});

			await store.dispatch(declineRequestThunk('1'));

			expect(store.getState().requests.error).toBe('Failed to decline request');
		});

		it('should set declining state while declining', async () => {
			let resolvePromise;
			declineRideRequest.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(declineRequestThunk('1'));
			expect(store.getState().requests.declining).toBe(true);

			resolvePromise();
			await promise;

			expect(store.getState().requests.declining).toBe(false);
		});

		it('should handle request not found in myRequests', async () => {
			store.dispatch(setMyRequests([{ id: '2', status: 'pending' }]));
			
			declineRideRequest.mockResolvedValueOnce();

			await store.dispatch(declineRequestThunk('1'));

			// Should not crash, request 2 unchanged
			expect(store.getState().requests.myRequests[0].status).toBe('pending');
		});
	});

	describe('error clearing', () => {
		it('should clear error on pending fetchMyRequestsThunk', async () => {
			store.dispatch(setError('Previous error'));
			
			getRiderRequests.mockResolvedValueOnce([]);
			await store.dispatch(fetchMyRequestsThunk('rider1'));

			expect(store.getState().requests.error).toBeNull();
		});

		it('should clear error on pending createRequestThunk', async () => {
			store.dispatch(setError('Previous error'));
			
			createRideRequest.mockResolvedValueOnce('id');
			await store.dispatch(createRequestThunk({
				rideId: 'ride1',
				riderId: 'rider1',
				riderProfile: {},
				rideData: { driverId: 'driver1' },
			}));

			expect(store.getState().requests.error).toBeNull();
		});
	});
});
