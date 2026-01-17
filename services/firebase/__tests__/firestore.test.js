/**
 * Tests for services/firebase/firestore.js
 */

// Mock Firebase modules
jest.mock('firebase/firestore', () => ({
	getFirestore: jest.fn(() => ({})),
	collection: jest.fn((db, name) => ({ path: name })),
	doc: jest.fn((db, collName, docId) => ({ path: `${collName || db?.path}/${docId || 'auto'}` })),
	getDoc: jest.fn(),
	getDocs: jest.fn(),
	addDoc: jest.fn(),
	setDoc: jest.fn(),
	updateDoc: jest.fn(),
	deleteDoc: jest.fn(),
	query: jest.fn((...args) => args),
	where: jest.fn((field, op, value) => ({ field, op, value })),
	orderBy: jest.fn((field, dir) => ({ field, dir })),
	limit: jest.fn((n) => ({ limit: n })),
	startAfter: jest.fn((cursor) => ({ cursor })),
	serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
	onSnapshot: jest.fn((ref, callback) => {
		// Return unsubscribe function
		return jest.fn();
	}),
}));

jest.mock('../config', () => ({
	app: {},
}));

jest.mock('../../notifications/pushNotifications', () => ({
	sendPushNotificationAsync: jest.fn(),
}));

jest.mock('../../notifications/pushTokens', () => ({
	getUserPushTokens: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../notifications/ratingReminders', () => ({
	sendTripCompletionRatingReminders: jest.fn(),
}));

jest.mock('../../notifications/tripReminders', () => ({
	scheduleTripReminders: jest.fn(() => Promise.resolve({})),
	cancelTripReminders: jest.fn(() => Promise.resolve()),
}));

jest.mock('../users', () => ({
	incrementCompletedTrips: jest.fn(() => Promise.resolve()),
}));

const {
	getDoc,
	getDocs,
	addDoc,
	updateDoc,
	deleteDoc,
	onSnapshot,
} = require('firebase/firestore');

// Import after mocks
const {
	toFirestoreCoords,
	toLngLatArr,
	validateRouteData,
	searchRides,
	getActiveRidesPage,
	getRideById,
	deleteRide,
	updateRide,
	getUserRides,
	subscribeToUserRides,
	createRide,
	createRideRequest,
	getRideRequests,
	getRiderRequests,
	updateRideRequestStatus,
	cancelRideRequest,
	createTrip,
	getTripById,
	acceptRideRequest,
	declineRideRequest,
	subscribeToRideRequests,
	subscribeToRiderRequests,
	updateTripStatus,
	subscribeToTrip,
	subscribeToRiderTrips,
	confirmTripCompletionByRider,
	createChatRoom,
	sendChatMessage,
	markChatMessagesAsRead,
	getChatById,
	subscribeToChat,
	subscribeToUserChats,
} = require('../firestore');

describe('firestore service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('coordinate conversion helpers', () => {
		describe('toFirestoreCoords', () => {
			it('should convert [lng, lat] array to {latitude, longitude} object', () => {
				const result = toFirestoreCoords([-74.006, 40.7128]);
				expect(result).toEqual({ latitude: 40.7128, longitude: -74.006 });
			});

			it('should return null for invalid input', () => {
				expect(toFirestoreCoords(null)).toBeNull();
				expect(toFirestoreCoords(undefined)).toBeNull();
				expect(toFirestoreCoords([1])).toBeNull();
				expect(toFirestoreCoords([1, 2, 3])).toBeNull();
				expect(toFirestoreCoords('invalid')).toBeNull();
			});
		});

		describe('toLngLatArr', () => {
			it('should convert {latitude, longitude} object to [lng, lat] array', () => {
				const result = toLngLatArr({ latitude: 40.7128, longitude: -74.006 });
				expect(result).toEqual([-74.006, 40.7128]);
			});

			it('should return null for invalid input', () => {
				expect(toLngLatArr(null)).toBeNull();
				expect(toLngLatArr(undefined)).toBeNull();
				expect(toLngLatArr('string')).toBeNull();
			});
		});
	});

	describe('validateRouteData', () => {
		it('should return true for valid route data', () => {
			const validRoute = {
				routePolyline: 'abc123',
				distanceKm: 10.5,
				durationMinutes: 30,
			};
			expect(validateRouteData(validRoute)).toBe(true);
		});

		it('should return false for missing polyline', () => {
			expect(validateRouteData({ distanceKm: 10, durationMinutes: 30 })).toBe(false);
		});

		it('should return false for empty polyline', () => {
			expect(validateRouteData({ routePolyline: '', distanceKm: 10, durationMinutes: 30 })).toBe(false);
		});

		it('should return false for invalid distance', () => {
			expect(validateRouteData({ routePolyline: 'abc', distanceKm: 0, durationMinutes: 30 })).toBe(false);
			expect(validateRouteData({ routePolyline: 'abc', distanceKm: -5, durationMinutes: 30 })).toBe(false);
		});

		it('should return false for invalid duration', () => {
			expect(validateRouteData({ routePolyline: 'abc', distanceKm: 10, durationMinutes: 0 })).toBe(false);
			expect(validateRouteData({ routePolyline: 'abc', distanceKm: 10, durationMinutes: -5 })).toBe(false);
		});
	});

	describe('searchRides', () => {
		it('should return empty array (stub implementation)', async () => {
			const results = await searchRides({ destination: 'NYC' });
			expect(results).toEqual([]);
		});
	});

	describe('getActiveRidesPage', () => {
		it('should return paginated rides with lastVisible cursor', async () => {
			const mockDocs = [
				{ id: 'ride1', data: () => ({ driverId: 'user1', status: 'active' }) },
				{ id: 'ride2', data: () => ({ driverId: 'user2', status: 'active' }) },
			];
			getDocs.mockResolvedValueOnce({ docs: mockDocs });

			const result = await getActiveRidesPage({ limit: 20 });

			expect(result.items).toHaveLength(2);
			expect(result.items[0].id).toBe('ride1');
			expect(result.lastVisible).toBe(mockDocs[1]);
		});

		it('should return empty array when no rides found', async () => {
			getDocs.mockResolvedValueOnce({ docs: [] });

			const result = await getActiveRidesPage({ limit: 20 });

			expect(result.items).toEqual([]);
			expect(result.lastVisible).toBeNull();
		});
	});

	describe('getRideById', () => {
		it('should return ride data for valid ID', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				id: 'ride123',
				data: () => ({ driverId: 'user1', status: 'active' }),
			});

			const ride = await getRideById('ride123');

			expect(ride).toEqual({ id: 'ride123', driverId: 'user1', status: 'active' });
		});

		it('should return null for non-existent ride', async () => {
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const ride = await getRideById('nonexistent');

			expect(ride).toBeNull();
		});

		it('should throw error for missing rideId', async () => {
			await expect(getRideById(null)).rejects.toThrow('rideId is required');
			await expect(getRideById('')).rejects.toThrow('rideId is required');
		});
	});

	describe('deleteRide', () => {
		it('should call deleteDoc with correct reference', async () => {
			deleteDoc.mockResolvedValueOnce();

			await deleteRide('ride123');

			expect(deleteDoc).toHaveBeenCalled();
		});

		it('should throw error for missing rideId', async () => {
			await expect(deleteRide(null)).rejects.toThrow('rideId is required');
		});
	});

	describe('updateRide', () => {
		it('should call updateDoc with updates and timestamp', async () => {
			updateDoc.mockResolvedValueOnce();

			await updateRide('ride123', { status: 'completed' });

			expect(updateDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					status: 'completed',
					updatedAt: 'SERVER_TIMESTAMP',
				})
			);
		});

		it('should throw error for missing rideId', async () => {
			await expect(updateRide(null, { status: 'active' })).rejects.toThrow();
		});

		it('should throw error for missing updates object', async () => {
			await expect(updateRide('ride123', null)).rejects.toThrow();
		});
	});

	describe('getUserRides', () => {
		it('should return user rides ordered by departure', async () => {
			const mockDocs = [
				{ id: 'ride1', data: () => ({ driverId: 'user1', departureDate: '2025-01-01' }) },
				{ id: 'ride2', data: () => ({ driverId: 'user1', departureDate: '2025-01-02' }) },
			];
			getDocs.mockResolvedValueOnce({ docs: mockDocs });

			const rides = await getUserRides('user1');

			expect(rides).toHaveLength(2);
			expect(rides[0].id).toBe('ride1');
		});

		it('should throw error for missing userId', async () => {
			await expect(getUserRides(null)).rejects.toThrow('userId is required');
		});
	});

	describe('subscribeToUserRides', () => {
		it('should set up snapshot listener and return unsubscribe function', () => {
			const mockCallback = jest.fn();
			const mockUnsubscribe = jest.fn();
			onSnapshot.mockReturnValueOnce(mockUnsubscribe);

			const unsubscribe = subscribeToUserRides('user1', mockCallback);

			expect(onSnapshot).toHaveBeenCalled();
			expect(unsubscribe).toBe(mockUnsubscribe);
		});
	});

	describe('createRide', () => {
		const validRideData = {
			startLocation: { address: '123 Main St', coordinates: { latitude: 40.7, longitude: -74 } },
			endLocation: { address: '456 Oak Ave', coordinates: { latitude: 40.8, longitude: -73.9 } },
			routePolyline: 'encoded_polyline',
			distanceKm: 10,
			durationMinutes: 20,
			departureDate: '2025-01-15',
			departureTime: '09:00',
			totalSeats: 3,
			pricePerSeat: 15,
		};

		const userProfile = {
			name: 'Test Driver',
			photoURL: 'https://example.com/photo.jpg',
			averageRating: 4.5,
			school: 'Test University',
		};

		it('should create ride and return document ID', async () => {
			addDoc.mockResolvedValueOnce({ id: 'newRide123' });

			const rideId = await createRide(validRideData, 'user1', userProfile);

			expect(rideId).toBe('newRide123');
			expect(addDoc).toHaveBeenCalled();
		});

		it('should throw error for missing start location', async () => {
			const invalidData = { ...validRideData, startLocation: null };
			await expect(createRide(invalidData, 'user1', userProfile)).rejects.toThrow('Start, end, and route are required');
		});

		it('should throw error for missing end location', async () => {
			const invalidData = { ...validRideData, endLocation: null };
			await expect(createRide(invalidData, 'user1', userProfile)).rejects.toThrow();
		});

		it('should throw error for missing departure date', async () => {
			const invalidData = { ...validRideData, departureDate: null };
			await expect(createRide(invalidData, 'user1', userProfile)).rejects.toThrow('Departure date and time are required');
		});

		it('should throw error for invalid total seats', async () => {
			const invalidData = { ...validRideData, totalSeats: 0 };
			await expect(createRide(invalidData, 'user1', userProfile)).rejects.toThrow('At least one seat is required');
		});

		it('should throw error for invalid price', async () => {
			const invalidData = { ...validRideData, pricePerSeat: -5 };
			await expect(createRide(invalidData, 'user1', userProfile)).rejects.toThrow('Price per seat is required');
		});
	});

	describe('createRideRequest', () => {
		it('should create request and return document ID', async () => {
			addDoc.mockResolvedValueOnce({ id: 'request123' });

			const riderProfile = { name: 'Test Rider', photoURL: '', averageRating: 4.0 };
			const rideData = { driverId: 'driver1', driverName: 'Driver Name' };

			const requestId = await createRideRequest('ride1', 'rider1', riderProfile, rideData, 1, 'Hello');

			expect(requestId).toBe('request123');
			expect(addDoc).toHaveBeenCalled();
		});

		it('should throw error for missing required fields', async () => {
			await expect(createRideRequest(null, 'rider1', {}, {})).rejects.toThrow();
			await expect(createRideRequest('ride1', null, {}, {})).rejects.toThrow();
			await expect(createRideRequest('ride1', 'rider1', {}, { driverId: null })).rejects.toThrow();
		});
	});

	describe('getRideRequests', () => {
		it('should return requests for a ride', async () => {
			const mockDocs = [
				{ id: 'req1', data: () => ({ riderId: 'rider1', status: 'pending' }) },
			];
			getDocs.mockResolvedValueOnce({ docs: mockDocs });

			const requests = await getRideRequests('ride1');

			expect(requests).toHaveLength(1);
			expect(requests[0].status).toBe('pending');
		});

		it('should throw error for missing rideId', async () => {
			await expect(getRideRequests(null)).rejects.toThrow('rideId is required');
		});
	});

	describe('getRiderRequests', () => {
		it('should return requests made by rider', async () => {
			const mockDocs = [
				{ id: 'req1', data: () => ({ rideId: 'ride1', status: 'pending', startLocation: null, endLocation: null }) },
			];
			getDocs.mockResolvedValueOnce({ docs: mockDocs });

			const requests = await getRiderRequests('rider1');

			expect(requests).toHaveLength(1);
		});

		it('should throw error for missing riderId', async () => {
			await expect(getRiderRequests(null)).rejects.toThrow('riderId is required');
		});
	});

	describe('updateRideRequestStatus', () => {
		it('should update request status to accepted', async () => {
			updateDoc.mockResolvedValueOnce();

			await updateRideRequestStatus('request1', 'accepted');

			expect(updateDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ status: 'accepted' })
			);
		});

		it('should update request status to declined', async () => {
			updateDoc.mockResolvedValueOnce();

			await updateRideRequestStatus('request1', 'declined');

			expect(updateDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ status: 'declined' })
			);
		});

		it('should throw error for invalid status', async () => {
			await expect(updateRideRequestStatus('request1', 'invalid')).rejects.toThrow();
		});
	});

	describe('cancelRideRequest', () => {
		it('should delete request document', async () => {
			deleteDoc.mockResolvedValueOnce();

			await cancelRideRequest('request1');

			expect(deleteDoc).toHaveBeenCalled();
		});

		it('should throw error for missing requestId', async () => {
			await expect(cancelRideRequest(null)).rejects.toThrow('requestId is required');
		});
	});

	describe('createTrip', () => {
		it('should create trip and return document ID', async () => {
			addDoc.mockResolvedValueOnce({ id: 'trip123' });

			const requestData = { riderId: 'rider1', riderName: 'Rider', seatsRequested: 1 };
			const rideData = { driverId: 'driver1', driverName: 'Driver' };

			const tripId = await createTrip('ride1', 'request1', requestData, rideData);

			expect(tripId).toBe('trip123');
		});

		it('should throw error for missing parameters', async () => {
			await expect(createTrip(null, 'req1', {}, {})).rejects.toThrow();
			await expect(createTrip('ride1', null, {}, {})).rejects.toThrow();
		});
	});

	describe('getTripById', () => {
		it('should return trip data', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				id: 'trip123',
				data: () => ({ riderId: 'rider1', status: 'confirmed' }),
			});

			const trip = await getTripById('trip123');

			expect(trip.id).toBe('trip123');
			expect(trip.status).toBe('confirmed');
		});

		it('should return null for non-existent trip', async () => {
			getDoc.mockResolvedValueOnce({ exists: () => false });

			const trip = await getTripById('nonexistent');

			expect(trip).toBeNull();
		});

		it('should throw error for missing tripId', async () => {
			await expect(getTripById(null)).rejects.toThrow('tripId is required');
		});
	});

	describe('acceptRideRequest', () => {
		beforeEach(() => {
			// Reset mocks
			getDoc.mockReset();
			updateDoc.mockReset();
			addDoc.mockReset();
		});

		it('should accept request and create trip', async () => {
			// Mock request doc
			getDoc
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({
						status: 'pending',
						riderId: 'rider1',
						riderName: 'Test Rider',
						seatsRequested: 1,
					}),
				})
				// Mock ride doc
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({
						driverId: 'driver1',
						driverName: 'Test Driver',
						availableSeats: 3,
						pricePerSeat: 15,
					}),
				})
				// Mock chat doc for update
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ participants: ['driver1', 'rider1'], unreadCount: {} }),
				});

			// Mock trip creation
			addDoc
				.mockResolvedValueOnce({ id: 'trip123' })
				.mockResolvedValueOnce({ id: 'msg1' });

			updateDoc.mockResolvedValue();

			const result = await acceptRideRequest('request1', 'ride1');

			expect(result.tripId).toBe('trip123');
		});

		it('should throw error if request not found', async () => {
			getDoc.mockResolvedValueOnce({ exists: () => false });

			await expect(acceptRideRequest('request1', 'ride1')).rejects.toThrow('Request not found');
		});

		it('should throw error if request not pending', async () => {
			getDoc
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ status: 'accepted' }),
				})
				.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });

			await expect(acceptRideRequest('request1', 'ride1')).rejects.toThrow('Request is not pending');
		});

		it('should throw error if not enough seats', async () => {
			getDoc
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ status: 'pending', seatsRequested: 5 }),
				})
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ availableSeats: 2 }),
				});

			await expect(acceptRideRequest('request1', 'ride1')).rejects.toThrow('Not enough available seats');
		});
	});

	describe('declineRideRequest', () => {
		it('should decline request', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ status: 'pending', riderId: 'rider1', driverName: 'Driver' }),
			});
			updateDoc.mockResolvedValueOnce();

			await declineRideRequest('request1');

			expect(updateDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ status: 'declined' })
			);
		});

		it('should throw error for missing requestId', async () => {
			await expect(declineRideRequest(null)).rejects.toThrow('requestId is required');
		});

		it('should throw error if request not found', async () => {
			getDoc.mockResolvedValueOnce({ exists: () => false });

			await expect(declineRideRequest('request1')).rejects.toThrow('Request not found');
		});

		it('should throw error if request not pending', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ status: 'accepted' }),
			});

			await expect(declineRideRequest('request1')).rejects.toThrow('Request is not pending');
		});
	});

	describe('updateTripStatus', () => {
		it('should update status from confirmed to in-progress', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					status: 'confirmed',
					statusHistory: [],
				}),
			});
			updateDoc.mockResolvedValueOnce();

			const result = await updateTripStatus('trip1', 'driver1', 'in-progress', new Date());

			expect(result.status).toBe('in-progress');
			expect(updateDoc).toHaveBeenCalled();
		});

		it('should update status from in-progress to completed', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					status: 'in-progress',
					statusHistory: [],
					driverId: 'driver1',
					riderId: 'rider1',
					driverName: 'Driver',
					riderName: 'Rider',
				}),
			});
			updateDoc.mockResolvedValueOnce();

			const result = await updateTripStatus('trip1', 'driver1', 'completed', new Date());

			expect(result.status).toBe('completed');
		});

		it('should throw error for invalid status transition', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ status: 'completed' }),
			});

			await expect(
				updateTripStatus('trip1', 'driver1', 'in-progress', new Date())
			).rejects.toThrow('Invalid status transition');
		});

		it('should throw error for missing tripId', async () => {
			await expect(updateTripStatus(null, 'driver1', 'completed', new Date())).rejects.toThrow();
		});
	});

	describe('subscribeToTrip', () => {
		it('should set up listener and return unsubscribe function', () => {
			const mockUnsubscribe = jest.fn();
			onSnapshot.mockReturnValueOnce(mockUnsubscribe);

			const unsubscribe = subscribeToTrip('trip1', jest.fn());

			expect(onSnapshot).toHaveBeenCalled();
			expect(unsubscribe).toBe(mockUnsubscribe);
		});

		it('should throw error for missing tripId', () => {
			expect(() => subscribeToTrip(null, jest.fn())).toThrow('tripId is required');
		});
	});

	describe('subscribeToRiderTrips', () => {
		it('should set up listener and return unsubscribe function', () => {
			const mockUnsubscribe = jest.fn();
			onSnapshot.mockReturnValueOnce(mockUnsubscribe);

			const unsubscribe = subscribeToRiderTrips('rider1', jest.fn());

			expect(onSnapshot).toHaveBeenCalled();
			expect(unsubscribe).toBe(mockUnsubscribe);
		});

		it('should throw error for missing riderId', () => {
			expect(() => subscribeToRiderTrips(null, jest.fn())).toThrow('riderId is required');
		});
	});

	describe('confirmTripCompletionByRider', () => {
		it('should confirm completion for valid rider', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ riderId: 'rider1', status: 'completed' }),
			});
			updateDoc.mockResolvedValueOnce();

			const result = await confirmTripCompletionByRider('trip1', 'rider1');

			expect(result.riderConfirmedCompletion).toBe(true);
		});

		it('should throw error if not the rider', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ riderId: 'rider2', status: 'completed' }),
			});

			await expect(confirmTripCompletionByRider('trip1', 'rider1')).rejects.toThrow('Only the rider can confirm completion');
		});

		it('should throw error if trip not completed', async () => {
			getDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ riderId: 'rider1', status: 'in-progress' }),
			});

			await expect(confirmTripCompletionByRider('trip1', 'rider1')).rejects.toThrow('Trip must be completed by driver first');
		});
	});

	describe('chat functions', () => {
		describe('createChatRoom', () => {
			it('should create chat room and return ID', async () => {
				const { setDoc, doc, collection } = require('firebase/firestore');
				
				// Mock doc to return an object with an id property
				const mockChatRef = { id: 'chat123', path: 'chats/chat123' };
				doc.mockImplementation((refOrDb, collectionName, docId) => {
					if (collectionName === undefined && docId === undefined) {
						// This is the doc(collection(db, 'chats')) call
						return mockChatRef;
					}
					return { path: `${collectionName || refOrDb?.path}/${docId || 'auto'}` };
				});
				
				setDoc.mockResolvedValueOnce();

				const chatId = await createChatRoom('driver1', 'rider1', 'trip1', 'ride1', { name: 'Driver' }, { name: 'Rider' });

				expect(setDoc).toHaveBeenCalled();
				expect(chatId).toBe('chat123');
			});
		});

		describe('sendChatMessage', () => {
			it('should send message and update chat', async () => {
				const { setDoc } = require('firebase/firestore');
				setDoc.mockResolvedValueOnce();
				getDoc.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({ participants: ['user1', 'user2'], unreadCount: {} }),
				});
				updateDoc.mockResolvedValueOnce();

				const messageId = await sendChatMessage('chat1', 'Hello!', 'user1', 'User One');

				expect(setDoc).toHaveBeenCalled();
			});
		});

		describe('markChatMessagesAsRead', () => {
			it('should reset unread count for user', async () => {
				updateDoc.mockResolvedValueOnce();

				await markChatMessagesAsRead('chat1', 'user1');

				expect(updateDoc).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ 'unreadCount.user1': 0 })
				);
			});
		});

		describe('getChatById', () => {
			it('should return chat data', async () => {
				getDoc.mockResolvedValueOnce({
					exists: () => true,
					id: 'chat123',
					data: () => ({ participants: ['user1', 'user2'] }),
				});

				const chat = await getChatById('chat123');

				expect(chat.id).toBe('chat123');
				expect(chat.participants).toEqual(['user1', 'user2']);
			});

			it('should throw error for non-existent chat', async () => {
				getDoc.mockResolvedValueOnce({ exists: () => false });

				await expect(getChatById('nonexistent')).rejects.toThrow('Chat not found');
			});
		});

		describe('subscribeToChat', () => {
			it('should set up listener and return unsubscribe function', () => {
				const mockUnsubscribe = jest.fn();
				onSnapshot.mockReturnValueOnce(mockUnsubscribe);

				const unsubscribe = subscribeToChat('chat1', jest.fn());

				expect(onSnapshot).toHaveBeenCalled();
				expect(unsubscribe).toBe(mockUnsubscribe);
			});
		});

		describe('subscribeToUserChats', () => {
			it('should set up listener and return unsubscribe function', () => {
				const mockUnsubscribe = jest.fn();
				onSnapshot.mockReturnValueOnce(mockUnsubscribe);

				const unsubscribe = subscribeToUserChats('user1', jest.fn());

				expect(onSnapshot).toHaveBeenCalled();
				expect(unsubscribe).toBe(mockUnsubscribe);
			});
		});
	});

	describe('subscription handlers', () => {
		describe('subscribeToRideRequests', () => {
			it('should set up listener and return unsubscribe function', () => {
				const mockUnsubscribe = jest.fn();
				onSnapshot.mockReturnValueOnce(mockUnsubscribe);

				const unsubscribe = subscribeToRideRequests('ride1', 'driver1', jest.fn());

				expect(onSnapshot).toHaveBeenCalled();
				expect(unsubscribe).toBe(mockUnsubscribe);
			});

			it('should throw error for missing parameters', () => {
				expect(() => subscribeToRideRequests(null, 'driver1', jest.fn())).toThrow();
				expect(() => subscribeToRideRequests('ride1', null, jest.fn())).toThrow();
			});
		});

		describe('subscribeToRiderRequests', () => {
			it('should set up listener and return unsubscribe function', () => {
				const mockUnsubscribe = jest.fn();
				onSnapshot.mockReturnValueOnce(mockUnsubscribe);

				const unsubscribe = subscribeToRiderRequests('rider1', jest.fn());

				expect(onSnapshot).toHaveBeenCalled();
				expect(unsubscribe).toBe(mockUnsubscribe);
			});

			it('should throw error for missing riderId', () => {
				expect(() => subscribeToRiderRequests(null, jest.fn())).toThrow('riderId is required');
			});
		});
	});
});
