import { configureStore } from '@reduxjs/toolkit';
import tripsReducer, {
	updateTripStatusThunk,
	confirmTripCompletionThunk,
	setTrips,
	addTrip,
	updateTrip,
	deleteTrip,
	setUpcomingTrips,
	setPastTrips,
	setLoading,
	setError,
} from '../tripsSlice';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
	scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
}));

// Mock the firestore module
jest.mock('../../../services/firebase/firestore', () => ({
	updateTripStatus: jest.fn(),
	confirmTripCompletionByRider: jest.fn(),
	notifyUserPush: jest.fn().mockResolvedValue(),
}));

// Mock trip reminders
jest.mock('../../../services/notifications/tripReminders', () => ({
	scheduleAllTripReminders: jest.fn(),
}));

import * as Notifications from 'expo-notifications';
import { updateTripStatus, confirmTripCompletionByRider, notifyUserPush } from '../../../services/firebase/firestore';
import { scheduleAllTripReminders } from '../../../services/notifications/tripReminders';

describe('tripsSlice', () => {
	let store;

	beforeEach(() => {
		store = configureStore({
			reducer: { trips: tripsReducer },
		});
		jest.clearAllMocks();
	});

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const state = store.getState().trips;
			expect(state.trips).toEqual([]);
			expect(state.upcomingTrips).toEqual([]);
			expect(state.pastTrips).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
		});
	});

	describe('synchronous reducers', () => {
		it('setTrips should update trips and schedule reminders', () => {
			const trips = [{ id: '1', destination: 'Boston' }];
			store.dispatch(setTrips(trips));
			
			expect(store.getState().trips.trips).toEqual(trips);
			expect(scheduleAllTripReminders).toHaveBeenCalledWith(trips);
		});

		it('addTrip should add trip to trips array', () => {
			store.dispatch(addTrip({ id: '1', destination: 'NYC' }));
			expect(store.getState().trips.trips).toHaveLength(1);
		});

		it('updateTrip should update existing trip', () => {
			store.dispatch(setTrips([{ id: '1', status: 'confirmed' }]));
			store.dispatch(updateTrip({ id: '1', status: 'in-progress' }));
			
			expect(store.getState().trips.trips[0].status).toBe('in-progress');
		});

		it('updateTrip should not update if trip not found', () => {
			store.dispatch(setTrips([{ id: '1', status: 'confirmed' }]));
			store.dispatch(updateTrip({ id: '999', status: 'in-progress' }));
			
			expect(store.getState().trips.trips[0].status).toBe('confirmed');
		});

		it('deleteTrip should remove trip', () => {
			store.dispatch(setTrips([
				{ id: '1', name: 'Trip 1' },
				{ id: '2', name: 'Trip 2' },
			]));
			store.dispatch(deleteTrip('1'));
			
			expect(store.getState().trips.trips).toHaveLength(1);
			expect(store.getState().trips.trips[0].id).toBe('2');
		});

		it('setUpcomingTrips should update upcomingTrips', () => {
			const trips = [{ id: '1' }];
			store.dispatch(setUpcomingTrips(trips));
			expect(store.getState().trips.upcomingTrips).toEqual(trips);
		});

		it('setPastTrips should update pastTrips', () => {
			const trips = [{ id: '1' }];
			store.dispatch(setPastTrips(trips));
			expect(store.getState().trips.pastTrips).toEqual(trips);
		});

		it('setLoading should update loading state', () => {
			store.dispatch(setLoading(true));
			expect(store.getState().trips.loading).toBe(true);
		});

		it('setError should update error state', () => {
			store.dispatch(setError('Test error'));
			expect(store.getState().trips.error).toBe('Test error');
		});
	});

	describe('updateTripStatusThunk', () => {
		const mockTrip = {
			id: 'trip1',
			driverId: 'driver1',
			riderId: 'rider1',
			driverName: 'John',
			riderName: 'Jane',
			status: 'in-progress',
		};

		it('should update trip status to in-progress', async () => {
			updateTripStatus.mockResolvedValueOnce(mockTrip);

			await store.dispatch(updateTripStatusThunk({
				tripId: 'trip1',
				driverId: 'driver1',
				newStatus: 'in-progress',
			}));

			expect(updateTripStatus).toHaveBeenCalled();
			expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.objectContaining({
						title: 'Trip Update',
						body: 'Your trip has started!',
					}),
				})
			);
		});

		it('should update trip status to completed', async () => {
			const completedTrip = { ...mockTrip, status: 'completed' };
			updateTripStatus.mockResolvedValueOnce(completedTrip);

			await store.dispatch(updateTripStatusThunk({
				tripId: 'trip1',
				driverId: 'driver1',
				newStatus: 'completed',
			}));

			expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.objectContaining({
						body: 'Trip completed! Thanks for riding with us.',
					}),
				})
			);
		});

		it('should update trip status to cancelled with reason', async () => {
			const cancelledTrip = { ...mockTrip, status: 'cancelled' };
			updateTripStatus.mockResolvedValueOnce(cancelledTrip);

			await store.dispatch(updateTripStatusThunk({
				tripId: 'trip1',
				driverId: 'driver1',
				newStatus: 'cancelled',
				cancellationReason: 'Weather',
			}));

			expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.objectContaining({
						body: 'This trip has been cancelled.',
					}),
				})
			);
		});

		it('should send push notification to other participant', async () => {
			updateTripStatus.mockResolvedValueOnce(mockTrip);

			await store.dispatch(updateTripStatusThunk({
				tripId: 'trip1',
				driverId: 'driver1',
				newStatus: 'in-progress',
			}));

			expect(notifyUserPush).toHaveBeenCalledWith(
				'rider1',
				expect.objectContaining({
					title: 'Trip Started',
					data: expect.objectContaining({
						tripId: 'trip1',
						newStatus: 'in-progress',
						type: 'trip_status_update',
					}),
				})
			);
		});

		it('should handle push notification failure gracefully', async () => {
			updateTripStatus.mockResolvedValueOnce(mockTrip);
			notifyUserPush.mockRejectedValueOnce(new Error('Push failed'));

			// Should not throw
			await store.dispatch(updateTripStatusThunk({
				tripId: 'trip1',
				driverId: 'driver1',
				newStatus: 'in-progress',
			}));

			expect(store.getState().trips.loading).toBe(false);
		});

		it('should handle status update error', async () => {
			updateTripStatus.mockRejectedValueOnce(new Error('Update failed'));

			await store.dispatch(updateTripStatusThunk({
				tripId: 'trip1',
				driverId: 'driver1',
				newStatus: 'in-progress',
			}));

			expect(store.getState().trips.error).toBe('Update failed');
		});

		it('should update trips in all arrays on success', async () => {
			store.dispatch(setTrips([mockTrip]));
			store.dispatch(setUpcomingTrips([mockTrip]));
			store.dispatch(setPastTrips([mockTrip]));

			const updatedTrip = { ...mockTrip, status: 'completed' };
			updateTripStatus.mockResolvedValueOnce(updatedTrip);

			await store.dispatch(updateTripStatusThunk({
				tripId: 'trip1',
				driverId: 'driver1',
				newStatus: 'completed',
			}));

			const state = store.getState().trips;
			expect(state.trips[0].status).toBe('completed');
			expect(state.upcomingTrips[0].status).toBe('completed');
			expect(state.pastTrips[0].status).toBe('completed');
		});

		it('should handle unknown status gracefully', async () => {
			const unknownStatusTrip = { ...mockTrip, status: 'unknown' };
			updateTripStatus.mockResolvedValueOnce(unknownStatusTrip);

			await store.dispatch(updateTripStatusThunk({
				tripId: 'trip1',
				driverId: 'driver1',
				newStatus: 'unknown',
			}));

			// Should still succeed, just with default notification text
			expect(store.getState().trips.error).toBeNull();
		});

		it('should handle error without message', async () => {
			updateTripStatus.mockRejectedValueOnce({});

			await store.dispatch(updateTripStatusThunk({
				tripId: 'trip1',
				driverId: 'driver1',
				newStatus: 'in-progress',
			}));

			expect(store.getState().trips.error).toBe('Failed to update trip status');
		});
	});

	describe('confirmTripCompletionThunk', () => {
		const mockTrip = {
			id: 'trip1',
			status: 'completed',
			riderConfirmedCompletion: true,
		};

		it('should confirm trip completion successfully', async () => {
			confirmTripCompletionByRider.mockResolvedValueOnce(mockTrip);

			await store.dispatch(confirmTripCompletionThunk({
				tripId: 'trip1',
				riderId: 'rider1',
			}));

			expect(confirmTripCompletionByRider).toHaveBeenCalledWith('trip1', 'rider1');
			expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.objectContaining({
						title: 'Trip Confirmed',
						body: 'You have confirmed the trip completion. Thank you for riding with us!',
					}),
				})
			);
		});

		it('should handle confirmation error', async () => {
			confirmTripCompletionByRider.mockRejectedValueOnce(new Error('Confirmation failed'));

			await store.dispatch(confirmTripCompletionThunk({
				tripId: 'trip1',
				riderId: 'rider1',
			}));

			expect(store.getState().trips.error).toBe('Confirmation failed');
		});

		it('should handle error without message', async () => {
			confirmTripCompletionByRider.mockRejectedValueOnce({});

			await store.dispatch(confirmTripCompletionThunk({
				tripId: 'trip1',
				riderId: 'rider1',
			}));

			expect(store.getState().trips.error).toBe('Failed to confirm trip completion');
		});

		it('should update trip in all arrays on success', async () => {
			const trip = { id: 'trip1', status: 'completed' };
			store.dispatch(setTrips([trip]));
			store.dispatch(setUpcomingTrips([trip]));
			store.dispatch(setPastTrips([trip]));

			const confirmedTrip = { ...trip, riderConfirmedCompletion: true };
			confirmTripCompletionByRider.mockResolvedValueOnce(confirmedTrip);

			await store.dispatch(confirmTripCompletionThunk({
				tripId: 'trip1',
				riderId: 'rider1',
			}));

			const state = store.getState().trips;
			expect(state.trips[0].riderConfirmedCompletion).toBe(true);
			expect(state.upcomingTrips[0].riderConfirmedCompletion).toBe(true);
			expect(state.pastTrips[0].riderConfirmedCompletion).toBe(true);
		});
	});

	describe('loading states', () => {
		it('should set loading during updateTripStatusThunk', async () => {
			let resolvePromise;
			updateTripStatus.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(updateTripStatusThunk({
				tripId: 'trip1',
				driverId: 'driver1',
				newStatus: 'in-progress',
			}));

			expect(store.getState().trips.loading).toBe(true);

			resolvePromise({ id: 'trip1', status: 'in-progress' });
			await promise;

			expect(store.getState().trips.loading).toBe(false);
		});

		it('should set loading during confirmTripCompletionThunk', async () => {
			let resolvePromise;
			confirmTripCompletionByRider.mockImplementationOnce(() => new Promise(resolve => {
				resolvePromise = resolve;
			}));

			const promise = store.dispatch(confirmTripCompletionThunk({
				tripId: 'trip1',
				riderId: 'rider1',
			}));

			expect(store.getState().trips.loading).toBe(true);

			resolvePromise({ id: 'trip1' });
			await promise;

			expect(store.getState().trips.loading).toBe(false);
		});
	});
});
