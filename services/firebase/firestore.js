/* eslint-disable import/first, import/no-duplicates */
/**
 * Normalize coordinates between [lng, lat] (API) and {latitude, longitude} (Firestore/UI)
 */
export function toFirestoreCoords(lngLatArr) {
	// [lng, lat] -> { latitude, longitude }
	if (!Array.isArray(lngLatArr) || lngLatArr.length !== 2) return null;
	return { latitude: lngLatArr[1], longitude: lngLatArr[0] };
}

export function toLngLatArr(coordsObj) {
	// { latitude, longitude } -> [lng, lat]
	if (!coordsObj || typeof coordsObj !== 'object') return null;
	return [coordsObj.longitude, coordsObj.latitude];
}

/**
 * Ensure polyline, distance, and duration are present and valid
 * @param {Object} rideData
 * @returns {boolean}
 */
export function validateRouteData(rideData) {
	return (
		typeof rideData.routePolyline === 'string' && rideData.routePolyline.length > 0 &&
		typeof rideData.distanceKm === 'number' && rideData.distanceKm > 0 &&
		typeof rideData.durationMinutes === 'number' && rideData.durationMinutes > 0
	);
}
/**
 * Search rides (stub for future feed/search functionality)
 * @param {Object} filters - Search filters (destination, date, etc.)
 * @returns {Promise<Array>} - Array of ride objects
 */
export async function searchRides(filters = {}) {
	// TODO: Implement Firestore queries for feed/search
	// Example: filter by status, destination, date range, etc.
	// For now, return empty array
	return [];
}

/**
 * Get active rides feed with pagination
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of items per page (default 20)
 * @param {Object|null} options.startAfter - Last document from previous page
 * @param {string|null} options.startKeyword - Start location keyword for search
 * @param {string|null} options.endKeyword - End location keyword for search
 * @param {Date|null} options.startDate - Filter rides from this date
 * @returns {Promise<{items: Array, lastVisible: Object|null}>}
 */
export async function getActiveRidesPage({ limit: pageLimit = 20, startAfter: cursor = null, startKeyword = null, endKeyword = null, startDate = null }) {
	const ridesRef = collection(db, 'rides');
	const now = new Date();
	
	let constraints = [
		where('status', '==', 'active'),
		where('departureTimestamp', '>=', startDate || now),
		orderBy('departureTimestamp', 'asc'),
	];
	
	// Note: Firestore only allows ONE array-contains per query
	// So we use the first provided keyword in the database query,
	// and filter the other keyword client-side
	
	// Prioritize startKeyword if both are provided, otherwise use whichever is provided
	if (startKeyword && startKeyword.trim()) {
		constraints.push(where('startSearchKeywords', 'array-contains', startKeyword.toLowerCase().trim()));
	} else if (endKeyword && endKeyword.trim()) {
		constraints.push(where('endSearchKeywords', 'array-contains', endKeyword.toLowerCase().trim()));
	}
	
	// Add pagination cursor if provided
	if (cursor) {
		constraints.push(startAfter(cursor));
	}
	
	// Add limit
	constraints.push(limit(pageLimit));
	
	const q = query(ridesRef, ...constraints);

	try {
		const snapshot = await getDocs(q);
		const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
		const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
		return { items, lastVisible };
	} catch (error) {
		// Graceful fallback for missing Firestore indexes
		const isIndexError = typeof error?.message === 'string' && error.message.includes('requires an index');
		if (!isIndexError) {
			console.error('[getActiveRidesPage] Error:', error);
			throw new Error(error?.message || 'Failed to fetch active rides');
		}

		console.warn('[getActiveRidesPage] Index missing, applying fallback query. Message:', error?.message);

		// Fallback A: remove keyword filter, keep status + departureTimestamp
		try {
			const baseConstraints = [
				where('status', '==', 'active'),
				where('departureTimestamp', '>=', startDate || now),
				orderBy('departureTimestamp', 'asc'),
				limit(pageLimit),
			];
			const qBase = query(ridesRef, ...(cursor ? [...baseConstraints, startAfter(cursor)] : baseConstraints));
			const snapshot = await getDocs(qBase);
			let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
			// Client-side filtering for keywords since DB filter was removed
			const startWord = startKeyword?.trim()?.toLowerCase() || null;
			const endWord = endKeyword?.trim()?.toLowerCase() || null;
			if (startWord) {
				items = items.filter(it => (it.startSearchKeywords || []).some(k => k.includes(startWord)));
			}
			if (endWord) {
				items = items.filter(it => (it.endSearchKeywords || []).some(k => k.includes(endWord)));
			}
			const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
			return { items, lastVisible };
		} catch (fallbackErrA) {
			const isIndexErrorA = typeof fallbackErrA?.message === 'string' && fallbackErrA.message.includes('requires an index');
			if (!isIndexErrorA) {
				console.error('[getActiveRidesPage] Fallback A error:', fallbackErrA);
				throw new Error(fallbackErrA?.message || 'Failed to fetch active rides');
			}
			console.warn('[getActiveRidesPage] Fallback A also needs index, applying Fallback B (status-only).');
		}

		// Fallback B: status-only query (no orderBy / date filter), then client-side filter by date + keywords
		try {
			const statusOnlyConstraints = [
				where('status', '==', 'active'),
				limit(pageLimit),
			];
			const qStatus = query(ridesRef, ...(cursor ? [...statusOnlyConstraints, startAfter(cursor)] : statusOnlyConstraints));
			const snapshot = await getDocs(qStatus);
			let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
			// Client-side date filter
			const effectiveStart = startDate || now;
			items = items.filter(it => {
				const ts = it.departureTimestamp?.toDate ? it.departureTimestamp.toDate() : new Date(it.departureTimestamp);
				return ts >= effectiveStart;
			});
			// Client-side keywords filter
			const startWord = startKeyword?.trim()?.toLowerCase() || null;
			const endWord = endKeyword?.trim()?.toLowerCase() || null;
			if (startWord) {
				items = items.filter(it => (it.startSearchKeywords || []).some(k => k.includes(startWord)));
			}
			if (endWord) {
				items = items.filter(it => (it.endSearchKeywords || []).some(k => k.includes(endWord)));
			}
			const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
			return { items, lastVisible };
		} catch (fallbackErrB) {
			console.error('[getActiveRidesPage] Fallback B error:', fallbackErrB);
			throw new Error(fallbackErrB?.message || 'Failed to fetch active rides');
		}
	}
}
import { deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, startAfter, updateDoc, where } from 'firebase/firestore';
import { sendPushNotificationAsync } from '../notifications/pushNotifications';
import { getUserPushTokens } from '../notifications/pushTokens';
import { sendTripCompletionRatingReminders } from '../notifications/ratingReminders';
import { cancelTripReminders, scheduleTripReminders } from '../notifications/tripReminders';
import { incrementCompletedTrips } from './users';
/**
 * Fetch a single ride by ID from Firestore
 * @param {string} rideId - The ride's document ID
 * @returns {Promise<Object|null>} - Ride object or null if not found
 */
export async function getRideById(rideId) {
	if (!rideId) throw new Error('rideId is required');
	const rideRef = doc(db, 'rides', rideId);
	const docSnap = await getDoc(rideRef);
	if (!docSnap.exists()) return null;
	return { id: docSnap.id, ...docSnap.data() };
}
/**
 * Delete a ride document from Firestore (hard delete)
 * @param {string} rideId - The ride's document ID
 * @returns {Promise<void>}
 */
export async function deleteRide(rideId) {
	if (!rideId) throw new Error('rideId is required');
	const rideRef = doc(db, 'rides', rideId);
	await deleteDoc(rideRef);
}
/**
 * Update a ride document in Firestore
 * @param {string} rideId - The ride's document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateRide(rideId, updates) {
	if (!rideId || !updates || typeof updates !== 'object') {
		throw new Error('rideId and updates object are required');
	}
	const rideRef = doc(db, 'rides', rideId);
	await updateDoc(rideRef, {
		...updates,
		updatedAt: serverTimestamp(),
	});
}
/**
 * Fetch user's rides (one-time fetch, not subscription)
 * @param {string} userId - Driver's user ID
 * @returns {Promise<Array>} - Array of ride objects
 */
export async function getUserRides(userId) {
	if (!userId) throw new Error('userId is required');
	const ridesRef = collection(db, 'rides');
	const q = query(
		ridesRef,
		where('driverId', '==', userId),
		orderBy('departureTimestamp', 'desc')
	);
	const snapshot = await getDocs(q);
	return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to the current user's rides (real-time updates)
 * @param {string} userId - Driver's user ID
 * @param {function} callback - Function to call with rides array
 * @returns {function} - Unsubscribe function
 */
export function subscribeToUserRides(userId, callback) {
	const ridesRef = collection(db, 'rides');
	const q = query(
		ridesRef,
		where('driverId', '==', userId),
		orderBy('departureTimestamp', 'desc')
	);
	const unsubscribe = onSnapshot(q, (snapshot) => {
		const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
		callback(rides);
	});
	return unsubscribe;
}
// services/firebase/firestore.js
// Firestore CRUD for rides (scaffold)
import { getFirestore } from 'firebase/firestore';
import { app } from './config';

export const db = getFirestore(app);

export async function notifyUserPush(userId, message) {
	if (!userId) return;
	try {
		const tokens = await getUserPushTokens(userId);
		if (!tokens.length) return;
		await sendPushNotificationAsync(tokens, message);
	} catch (err) {
		console.warn('[notifications] Failed to send push', err?.message || err);
	}
}

/**
 * Ride object schema (Firestore rides collection)
 *
 * @typedef {Object} Ride
 * @property {string} rideId - Auto-generated document ID
 * @property {string} driverId - User ID of the driver
 * @property {string} driverName - Driver's display name
 * @property {string} driverPhotoURL - Driver's profile photo URL
 * @property {number} driverRating - Driver's average rating
 * @property {Object} startLocation - { address, coordinates: { latitude, longitude }, placeName }
 * @property {Object} endLocation - { address, coordinates: { latitude, longitude }, placeName }
 * @property {string} routePolyline - Encoded polyline string for route
 * @property {number} distanceKm - Route distance in kilometers
 * @property {number} durationMinutes - Route duration in minutes
 * @property {string} departureDate - Departure date (YYYY-MM-DD)
 * @property {string} departureTime - Departure time (HH:mm)
 * @property {Date|string} departureTimestamp - Departure timestamp (ISO or Firestore Timestamp)
 * @property {number} totalSeats - Total seats offered
 * @property {number} availableSeats - Seats currently available
 * @property {number} pricePerSeat - Price per seat (USD)
 * @property {string} currency - Currency code (e.g., 'USD')
 * @property {number} maxDetourMinutes - Max detour willingness
 * @property {string} description - Optional ride description
 * @property {string} ridePhoto - Optional ride photo URL
 * @property {boolean} allowsPets - (future) Pets allowed
 * @property {boolean} allowsSmoking - (future) Smoking allowed
 * @property {string} status - 'active', 'full', 'in_progress', 'completed', 'cancelled'
 * @property {boolean} isActive - True if ride is open
 * @property {Date|string} createdAt - Creation timestamp
 * @property {Date|string} updatedAt - Last update timestamp
 * @property {Date|string|null} completedAt - Completion timestamp
 * @property {string[]} bookedRiders - User IDs of accepted riders
 * @property {string[]} pendingRequests - User IDs of pending requests
 * @property {string} school - School for filtering
 * @property {string[]} startSearchKeywords - Keywords from start location
 * @property {string[]} endSearchKeywords - Keywords from end location
 */

/**
 * RideRequest object schema (Firestore rideRequests collection)
 *
 * @typedef {Object} RideRequest
 * @property {string} requestId - Auto-generated document ID
 * @property {string} rideId - Reference to the ride document
 * @property {string} riderId - User ID of the rider requesting seat
 * @property {string} riderName - Rider's display name
 * @property {string} riderPhotoURL - Rider's profile photo URL
 * @property {number} riderRating - Rider's average rating
 * @property {string} driverId - User ID of the driver (denormalized for queries)
 * @property {string} driverName - Driver's display name (denormalized)
 * @property {number} seatsRequested - Number of seats requested (default 1)
 * @property {string} status - 'pending', 'accepted', 'declined', 'cancelled'
 * @property {string|null} message - Optional message from rider to driver
 * @property {Date|string} createdAt - Request creation timestamp
 * @property {Date|string} updatedAt - Last update timestamp
 * @property {Date|string|null} respondedAt - When driver accepted/declined
 */

// ...ride CRUD functions will be added here

import { addDoc, collection, serverTimestamp, setDoc } from 'firebase/firestore';

/**
 * Create a new ride document in Firestore
 * @param {Object} rideData - Partial ride object (form data + route info)
 * @param {string} userId - Driver's user ID
 * @param {Object} userProfile - Driver's profile (displayName, photoURL, rating, school)
 * @returns {Promise<string>} - The new ride's document ID
 */
export async function createRide(rideData, userId, userProfile) {
	// Basic validation (required fields)
	if (!rideData.startLocation || !rideData.endLocation || !rideData.routePolyline) {
		throw new Error('Start, end, and route are required');
	}
	if (!rideData.departureDate || !rideData.departureTime) {
		throw new Error('Departure date and time are required');
	}
	if (!rideData.totalSeats || rideData.totalSeats < 1) {
		throw new Error('At least one seat is required');
	}
	if (!rideData.pricePerSeat || rideData.pricePerSeat < 0) {
		throw new Error('Price per seat is required');
	}

	const detourUnit = rideData.maxDetourUnit || (rideData.maxDetourMinutes ? 'minutes' : 'none');
	const detourValue = detourUnit === 'none' ? null : (rideData.maxDetourValue ?? rideData.maxDetourMinutes ?? null);
	const detourMinutes = detourUnit === 'minutes' ? (detourValue ?? 0) : (rideData.maxDetourMinutes ?? null);
	const detourMiles = detourUnit === 'miles' ? (detourValue ?? rideData.maxDetourMiles ?? null) : (rideData.maxDetourMiles ?? null);

	const ridesRef = collection(db, 'rides');
	const ride = {
		driverId: userId,
		driverName: userProfile.name || 'Driver',
		driverPhotoURL: userProfile.photoURL || '',
		driverRating: userProfile.averageRating || 0,
		startLocation: rideData.startLocation,
		endLocation: rideData.endLocation,
		routePolyline: rideData.routePolyline,
		distanceKm: rideData.distanceKm,
		durationMinutes: rideData.durationMinutes,
		departureDate: rideData.departureDate,
		departureTime: rideData.departureTime,
		departureTimestamp: new Date(`${rideData.departureDate}T${rideData.departureTime}`),
		totalSeats: rideData.totalSeats,
		availableSeats: rideData.totalSeats,
		pricePerSeat: rideData.pricePerSeat,
		currency: 'USD',
		maxDetourUnit: detourUnit,
		maxDetourValue: detourValue,
		maxDetourMinutes: detourMinutes ?? 0,
		maxDetourMiles: detourMiles,
		description: rideData.description || '',
		ridePhoto: rideData.ridePhoto || '',
		allowsPets: rideData.allowsPets || false,
		allowsSmoking: rideData.allowsSmoking || false,
		status: 'active',
		isActive: true,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
		completedAt: null,
		bookedRiders: [],
		pendingRequests: [],
		school: userProfile.school || '',
		...generateSearchKeywords(rideData),
	};

	const docRef = await addDoc(ridesRef, ride);
	return docRef.id;
}

// Helper to generate search keywords from addresses - returns both startSearchKeywords and endSearchKeywords
function generateSearchKeywords(rideData) {
	const startKeywords = new Set();
	const endKeywords = new Set();
	
	// Start location keywords
	if (rideData.startLocation?.address) {
		const words = rideData.startLocation.address.toLowerCase().split(/[\s,]+/).filter(Boolean);
		words.forEach(word => startKeywords.add(word));
	}
	if (rideData.startLocation?.placeName) {
		const placeName = rideData.startLocation.placeName.toLowerCase();
		startKeywords.add(placeName);
		const words = placeName.split(/[\s,]+/).filter(Boolean);
		words.forEach(word => startKeywords.add(word));
	}
	
	// End location keywords
	if (rideData.endLocation?.address) {
		const words = rideData.endLocation.address.toLowerCase().split(/[\s,]+/).filter(Boolean);
		words.forEach(word => endKeywords.add(word));
	}
	if (rideData.endLocation?.placeName) {
		const placeName = rideData.endLocation.placeName.toLowerCase();
		endKeywords.add(placeName);
		const words = placeName.split(/[\s,]+/).filter(Boolean);
		words.forEach(word => endKeywords.add(word));
	}
	
	return {
		startSearchKeywords: [...startKeywords],
		endSearchKeywords: [...endKeywords],
	};
}

// ========================================
// RIDE REQUESTS (Week 5 - Seat Booking)
// ========================================

/**
 * Create a ride request (rider requests a seat)
 * @param {string} rideId - The ride's document ID
 * @param {string} riderId - The rider's user ID
 * @param {Object} riderProfile - Rider's profile { name, photoURL, averageRating }
 * @param {Object} rideData - Partial ride data { driverId, driverName }
 * @param {number} seatsRequested - Number of seats (default 1)
 * @param {string|null} message - Optional message to driver
 * @returns {Promise<string>} - The new request's document ID
 */
export async function createRideRequest(rideId, riderId, riderProfile, rideData, seatsRequested = 1, message = null, pickupLocation = null, dropoffLocation = null) {
	if (!rideId || !riderId || !rideData.driverId) {
		throw new Error('rideId, riderId, and driverId are required');
	}
	
	const requestsRef = collection(db, 'rideRequests');
	const request = {
		rideId,
		riderId,
		riderName: riderProfile.name || 'Rider',
		riderPhotoURL: riderProfile.photoURL || '',
		riderRating: riderProfile.averageRating || 0,
		driverId: rideData.driverId,
		driverName: rideData.driverName || 'Driver',
		startLocation: rideData.startLocation || null,
		endLocation: rideData.endLocation || null,
		pickupLocation: pickupLocation || null,
		dropoffLocation: dropoffLocation || null,
		seatsRequested,
		status: 'pending',
		message: message || null,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
		respondedAt: null,
	};
	
	const docRef = await addDoc(requestsRef, request);

	await notifyUserPush(rideData.driverId, {
		title: 'New seat request',
		body: `${riderProfile.name || 'A rider'} requested ${seatsRequested} seat${seatsRequested > 1 ? 's' : ''}.`,
		data: { rideId, requestId: docRef.id },
	});

	return docRef.id;
}

/**
 * Get ride requests for a specific ride (driver view)
 * @param {string} rideId - The ride's document ID
 * @returns {Promise<Array>} - Array of request objects
 */
export async function getRideRequests(rideId) {
	if (!rideId) throw new Error('rideId is required');
	const requestsRef = collection(db, 'rideRequests');
	const q = query(requestsRef, where('rideId', '==', rideId), orderBy('createdAt', 'desc'));
	const snapshot = await getDocs(q);
	return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get all requests made by a rider (rider view)
 * @param {string} riderId - The rider's user ID
 * @returns {Promise<Array>} - Array of request objects
 */
export async function getRiderRequests(riderId) {
	if (!riderId) throw new Error('riderId is required');
	const requestsRef = collection(db, 'rideRequests');
	const q = query(requestsRef, where('riderId', '==', riderId), orderBy('createdAt', 'desc'));
	const snapshot = await getDocs(q);
	return snapshot.docs.map(doc => {
		const data = doc.data();
		return {
			id: doc.id,
			...data,
			startLocation: data.startLocation ? { ...data.startLocation } : null,
			endLocation: data.endLocation ? { ...data.endLocation } : null,
		};
	});
}

/**
 * Update ride request status (driver accepts/declines)
 * @param {string} requestId - The request's document ID
 * @param {string} status - 'accepted' or 'declined'
 * @returns {Promise<void>}
 */
export async function updateRideRequestStatus(requestId, status) {
	if (!requestId || !['accepted', 'declined'].includes(status)) {
		throw new Error('requestId and valid status (accepted/declined) are required');
	}
	const requestRef = doc(db, 'rideRequests', requestId);
	await updateDoc(requestRef, {
		status,
		respondedAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
}

/**
 * Cancel a ride request (rider cancels before driver responds)
 * @param {string} requestId - The request's document ID
 * @returns {Promise<void>}
 */
export async function cancelRideRequest(requestId) {
	if (!requestId) throw new Error('requestId is required');
	const requestRef = doc(db, 'rideRequests', requestId);
	await deleteDoc(requestRef);
}

/**
 * Create a trip document when a request is accepted
 * @param {string} rideId - The ride's document ID
 * @param {string} requestId - The request's document ID
 * @param {Object} requestData - The request data
 * @param {Object} rideData - The ride data
 * @returns {Promise<string>} - The new trip's document ID
 */
export async function createTrip(rideId, requestId, requestData, rideData) {
	if (!rideId || !requestId || !requestData || !rideData) {
		throw new Error('rideId, requestId, requestData, and rideData are required');
	}
	
	const tripsRef = collection(db, 'trips');
	const trip = {
		rideId,
		requestId,
		riderId: requestData.riderId,
		riderName: requestData.riderName || 'Rider',
		riderPhotoURL: requestData.riderPhotoURL || '',
		riderRating: requestData.riderRating || 0,
		driverId: rideData.driverId,
		driverName: rideData.driverName || 'Driver',
		driverPhotoURL: rideData.driverPhotoURL || '',
		driverRating: rideData.driverRating || 0,
		startLocation: rideData.startLocation || null,
		endLocation: rideData.endLocation || null,
		pickupLocation: requestData.pickupLocation || null,
		dropoffLocation: requestData.dropoffLocation || null,
		departureDate: rideData.departureDate || null,
		departureTime: rideData.departureTime || null,
		departureTimestamp: rideData.departureTimestamp || null,
		routePolyline: rideData.routePolyline || null,
		seatsBooked: requestData.seatsRequested || 1,
		pricePerSeat: rideData.pricePerSeat || 0,
		totalPrice: (rideData.pricePerSeat || 0) * (requestData.seatsRequested || 1),
		status: 'confirmed',
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	};
	
	const docRef = await addDoc(tripsRef, trip);
	return docRef.id;
}

/**
 * Get trip by ID
 * @param {string} tripId - The trip's document ID
 * @returns {Promise<Object>} - Trip object
 */
export async function getTripById(tripId) {
	if (!tripId) throw new Error('tripId is required');
	const tripRef = doc(db, 'trips', tripId);
	const tripSnap = await getDoc(tripRef);
	if (!tripSnap.exists()) return null;
	return { id: tripSnap.id, ...tripSnap.data() };
}

/**
 * Accept a ride request - atomically updates request status, creates trip, and decrements ride capacity
 * @param {string} requestId - The request's document ID
 * @param {string} rideId - The ride's document ID
 * @returns {Promise<{tripId: string}>}
 */
export async function acceptRideRequest(requestId, rideId) {
	if (!requestId || !rideId) {
		throw new Error('requestId and rideId are required');
	}
	
	// Fetch request and ride data
	const requestRef = doc(db, 'rideRequests', requestId);
	const rideRef = doc(db, 'rides', rideId);
	
	const [requestSnap, rideSnap] = await Promise.all([
		getDoc(requestRef),
		getDoc(rideRef)
	]);
	
	if (!requestSnap.exists()) throw new Error('Request not found');
	if (!rideSnap.exists()) throw new Error('Ride not found');
	
	const requestData = requestSnap.data();
	const rideData = rideSnap.data();
	
	// Validate request is still pending
	if (requestData.status !== 'pending') {
		throw new Error('Request is not pending');
	}
	
	// Validate ride has enough capacity
	const availableSeats = rideData.availableSeats || 0;
	const seatsRequested = requestData.seatsRequested || 1;
	
	if (availableSeats < seatsRequested) {
		throw new Error('Not enough available seats');
	}
	
	// Create trip document
	const tripId = await createTrip(rideId, requestId, requestData, rideData);
	
	// Create chat room for driver and rider
	const driverId = rideData.driverId;
	const riderId = requestData.riderId;
	
	const driverProfile = {
		name: rideData.driverName || 'Driver',
		photoURL: rideData.driverPhotoURL || null,
	};
	
	const riderProfile = {
		name: requestData.riderName || 'Rider',
		photoURL: requestData.riderPhotoURL || null,
	};
	
	const chatId = await createChatRoom(driverId, riderId, tripId, rideId, driverProfile, riderProfile);
	
	// Update request status to accepted
	await updateDoc(requestRef, {
		status: 'accepted',
		respondedAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
		tripId,
		chatId,
	});
	
	// Decrement ride available seats
	await updateDoc(rideRef, {
		availableSeats: availableSeats - seatsRequested,
		updatedAt: serverTimestamp(),
	});

	await notifyUserPush(requestData.riderId, {
		title: 'Request accepted',
		body: `${rideData.driverName || 'Your driver'} accepted your request.`,
		data: { rideId, requestId, tripId, chatId },
	});

	// Schedule trip reminders for the rider (local notifications)
	try {
		const destination = rideData.endLocation?.placeName?.split(',')[0] || 'your destination';
		const reminderIds = await scheduleTripReminders(tripId, rideData.departureTimestamp, destination);
		
		// Store reminder IDs in trip document for potential cancellation
		if (reminderIds.reminder24hId || reminderIds.reminder2hId) {
			const tripRef = doc(db, 'trips', tripId);
			await updateDoc(tripRef, {
				reminder24hId: reminderIds.reminder24hId || null,
				reminder2hId: reminderIds.reminder2hId || null,
			});
			console.log('[acceptRideRequest] Scheduled trip reminders:', reminderIds);
		}
	} catch (reminderError) {
		console.warn('[acceptRideRequest] Failed to schedule trip reminders:', reminderError?.message);
		// Don't fail the request acceptance if reminder scheduling fails
	}
	
	return { tripId, chatId };
}

/**
 * Decline a ride request - updates request status only
 * @param {string} requestId - The request's document ID
 * @returns {Promise<void>}
 */
export async function declineRideRequest(requestId) {
	if (!requestId) throw new Error('requestId is required');
	
	const requestRef = doc(db, 'rideRequests', requestId);
	const requestSnap = await getDoc(requestRef);
	
	if (!requestSnap.exists()) throw new Error('Request not found');
	
	const requestData = requestSnap.data();
	
	// Validate request is still pending
	if (requestData.status !== 'pending') {
		throw new Error('Request is not pending');
	}
	
	// Update request status to declined
	await updateDoc(requestRef, {
		status: 'declined',
		respondedAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});

	await notifyUserPush(requestData.riderId, {
		title: 'Request declined',
		body: `${requestData.driverName || 'Driver'} declined your request.`,
		data: { rideId: requestData.rideId, requestId },
	});
}

/**
 * Subscribe to ride requests for real-time updates (driver view)
 * @param {string} rideId - The ride's document ID
 * @param {string} driverId - The driver's user ID
 * @param {Function} callback - Function called with updated requests array
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToRideRequests(rideId, driverId, callback) {
	if (!rideId || !driverId) throw new Error('rideId and driverId are required');
	
	const requestsRef = collection(db, 'rideRequests');
	const q = query(
		requestsRef, 
		where('rideId', '==', rideId),
		where('driverId', '==', driverId),
		orderBy('createdAt', 'desc')
	);
	
	return onSnapshot(q, (snapshot) => {
		const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
		callback(requests);
	});
}

/**
 * Subscribe to real-time updates for a rider's requests
 * @param {string} riderId - The rider's user ID
 * @param {Function} callback - Callback function called with updated requests array
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToRiderRequests(riderId, callback) {
	if (!riderId) throw new Error('riderId is required');
	
	const requestsRef = collection(db, 'rideRequests');
	const q = query(
		requestsRef,
		where('riderId', '==', riderId),
		orderBy('createdAt', 'desc')
	);
	
	return onSnapshot(q, (snapshot) => {
		const requests = snapshot.docs.map(doc => {
			const data = doc.data();
			return {
				id: doc.id,
				...data,
				startLocation: data.startLocation ? { ...data.startLocation } : null,
				endLocation: data.endLocation ? { ...data.endLocation } : null,
			};
		});
		callback(requests);
	});
}

// ========================================
// TRIP STATUS MANAGEMENT (Week 6)
// ========================================

/**
 * Update trip status with validation and history tracking
 * @param {string} tripId - Trip document ID
 * @param {string} driverId - Driver's user ID (for validation)
 * @param {string} newStatus - New status ('in-progress', 'completed', 'cancelled')
 * @param {any} timestamp - Server timestamp
 * @param {string} cancellationReason - Optional reason if cancelled
 * @returns {Promise<Object>} - Updated trip object
 */
export async function updateTripStatus(tripId, driverId, newStatus, timestamp, cancellationReason) {
	if (!tripId || !newStatus) throw new Error('tripId and newStatus are required');
	
	const tripRef = doc(db, 'trips', tripId);
	const tripSnap = await getDoc(tripRef);
	
	if (!tripSnap.exists()) throw new Error('Trip not found');
	
	const tripData = tripSnap.data();
	
	// Validate status transition
	const validTransitions = {
		'confirmed': ['in-progress', 'cancelled'],
		'in-progress': ['completed', 'cancelled'],
		'completed': [],
		'cancelled': []
	};
	
	const currentStatus = tripData.status || 'confirmed';
	if (!validTransitions[currentStatus]?.includes(newStatus)) {
		throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
	}
	
	// Build update object
	const updates = {
		status: newStatus,
		updatedAt: timestamp,
		statusHistory: [...(tripData.statusHistory || []), { status: newStatus, timestamp: new Date() }]
	};
	
	if (newStatus === 'completed') {
		updates.completedAt = timestamp;
		
		// Increment trip completion counters for both driver and rider
		try {
			await Promise.all([
				incrementCompletedTrips(tripData.driverId),
				incrementCompletedTrips(tripData.riderId)
			]);
			console.log('[updateTripStatus] Incremented trip counts for driver and rider');
		} catch (countError) {
			console.warn('[updateTripStatus] Failed to increment trip counts:', countError?.message);
			// Don't fail the entire operation if count update fails
		}

		// Send rating reminder notifications to both driver and rider
		try {
			await sendTripCompletionRatingReminders({
				tripId,
				driverId: tripData.driverId,
				riderId: tripData.riderId,
				driverName: tripData.driverName || 'the driver',
				riderName: tripData.riderName || 'the rider',
			});
			console.log('[updateTripStatus] Sent rating reminder notifications');
		} catch (notifyError) {
			console.warn('[updateTripStatus] Failed to send rating reminders:', notifyError?.message);
			// Don't fail the entire operation if notification fails
		}
	}
	
	if (newStatus === 'cancelled' && cancellationReason) {
		updates.cancellationReason = cancellationReason;
		updates.cancelledAt = timestamp;
	}

	// Cancel trip reminders when trip is cancelled
	if (newStatus === 'cancelled') {
		try {
			await cancelTripReminders(
				tripId,
				tripData.reminder24hId || null,
				tripData.reminder2hId || null
			);
			// Clear the reminder IDs in the update
			updates.reminder24hId = null;
			updates.reminder2hId = null;
			console.log('[updateTripStatus] Cancelled trip reminders');
		} catch (cancelError) {
			console.warn('[updateTripStatus] Failed to cancel trip reminders:', cancelError?.message);
			// Don't fail the entire operation if cancellation fails
		}
	}
	
	await updateDoc(tripRef, updates);
	
	return { id: tripId, ...tripData, ...updates };
}

/**
 * Subscribe to real-time updates for a single trip
 * @param {string} tripId - Trip document ID
 * @param {Function} callback - Callback with updated trip data
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToTrip(tripId, callback) {
	if (!tripId) throw new Error('tripId is required');
	
	const tripRef = doc(db, 'trips', tripId);
	return onSnapshot(tripRef, (snapshot) => {
		if (snapshot.exists()) {
			callback({ id: snapshot.id, ...snapshot.data() });
		} else {
			callback(null);
		}
	});
}

/**
 * Subscribe to all trips for a rider
 * @param {string} riderId - Rider's user ID
 * @param {Function} callback - Callback with array of trip data
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToRiderTrips(riderId, callback) {
	if (!riderId) throw new Error('riderId is required');
	
	const tripsQuery = query(
		collection(db, 'trips'),
		where('riderId', '==', riderId)
	);
	
	return onSnapshot(tripsQuery, (snapshot) => {
		const trips = snapshot.docs
			.map(doc => ({
				id: doc.id,
				...doc.data()
			}))
			.sort((a, b) => {
				// Client-side sorting to avoid needing composite index
				const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
				const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
				return timeB - timeA; // Descending order
			});
		callback(trips);
	});
}

/**
 * Rider confirms trip completion
 * @param {string} tripId - Trip document ID
 * @param {string} riderId - Rider's user ID
 * @returns {Promise<Object>} - Updated trip object
 */
export async function confirmTripCompletionByRider(tripId, riderId) {
	if (!tripId || !riderId) throw new Error('tripId and riderId are required');
	
	const tripRef = doc(db, 'trips', tripId);
	const tripSnap = await getDoc(tripRef);
	
	if (!tripSnap.exists()) throw new Error('Trip not found');
	
	const tripData = tripSnap.data();
	
	if (tripData.riderId !== riderId) {
		throw new Error('Only the rider can confirm completion');
	}
	
	if (tripData.status !== 'completed') {
		throw new Error('Trip must be completed by driver first');
	}
	
	const updates = {
		riderConfirmedCompletion: true,
		riderConfirmedAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	};
	
	await updateDoc(tripRef, updates);
	
	return { id: tripId, ...tripData, ...updates };
}

/**
 * Create a new chat room for a trip
 * @param {string} driverId - Driver user ID
 * @param {string} riderId - Rider user ID
 * @param {string} tripId - Trip ID
 * @param {string} rideId - Ride ID
 * @param {Object} driverProfile - Driver profile data (name, photoURL)
 * @param {Object} riderProfile - Rider profile data (name, photoURL)
 * @returns {Promise<string>} - Chat ID
 */
export async function createChatRoom(driverId, riderId, tripId, rideId, driverProfile = {}, riderProfile = {}) {
	const chatRef = doc(collection(db, 'chats'));
	const chatId = chatRef.id;
	
	const chatData = {
		participants: [driverId, riderId],
		participantDetails: {
			[driverId]: {
				name: driverProfile?.name || 'Driver',
				photoURL: driverProfile?.photoURL || null,
			},
			[riderId]: {
				name: riderProfile?.name || 'Rider',
				photoURL: riderProfile?.photoURL || null,
			},
		},
		tripId,
		rideId,
		lastMessage: null,
		lastMessageTimestamp: serverTimestamp(),
		createdAt: serverTimestamp(),
		unreadCount: {
			[driverId]: 0,
			[riderId]: 0,
		},
	};
	
	await setDoc(chatRef, chatData);
	return chatId;
}

/**
 * Send a chat message
 * @param {string} chatId - Chat ID
 * @param {string} text - Message text
 * @param {string} senderId - Sender user ID
 * @param {string} senderName - Sender name (optional)
 * @param {string} senderPhotoURL - Sender photo URL (optional)
 * @returns {Promise<string>} - Message ID
 */
export async function sendChatMessage(chatId, text, senderId, senderName = null, senderPhotoURL = null) {
	const chatRef = doc(db, 'chats', chatId);
	const messagesRef = collection(chatRef, 'messages');
	const messageRef = doc(messagesRef);
	
	const messageData = {
		senderId,
		text,
		timestamp: serverTimestamp(),
		read: false,
	};
	
	// Add optional fields if provided
	if (senderName) {
		messageData.senderName = senderName;
	}
	if (senderPhotoURL) {
		messageData.senderPhotoURL = senderPhotoURL;
	}
	
	await setDoc(messageRef, messageData);
	
	// Update chat's last message info
	const chatSnap = await getDoc(chatRef);
	if (chatSnap.exists()) {
		const chatData = chatSnap.data();
		const receiverId = chatData.participants.find(id => id !== senderId);
		
		await updateDoc(chatRef, {
			lastMessage: text,
			lastMessageTimestamp: serverTimestamp(),
			[`unreadCount.${receiverId}`]: (chatData.unreadCount?.[receiverId] || 0) + 1,
		});
	}
	
	return messageRef.id;
}

/**
 * Mark chat messages as read
 * @param {string} chatId - Chat ID
 * @param {string} userId - User ID marking messages as read
 * @returns {Promise<void>}
 */
export async function markChatMessagesAsRead(chatId, userId) {
	const chatRef = doc(db, 'chats', chatId);
	
	await updateDoc(chatRef, {
		[`unreadCount.${userId}`]: 0,
	});
}

/**
 * Get chat by ID
 * @param {string} chatId - Chat ID
 * @returns {Promise<Object>} - Chat data
 */
export async function getChatById(chatId) {
	const chatRef = doc(db, 'chats', chatId);
	const chatSnap = await getDoc(chatRef);
	
	if (!chatSnap.exists()) {
		throw new Error('Chat not found');
	}
	
	return { id: chatSnap.id, ...chatSnap.data() };
}

/**
 * Subscribe to a specific chat's messages
 * @param {string} chatId - Chat ID
 * @param {Function} callback - Callback function called with messages data
 * @returns {Function} Unsubscribe function
 */
export function subscribeToChat(chatId, callback) {
	const chatRef = doc(db, 'chats', chatId);
	const messagesRef = collection(chatRef, 'messages');
	const q = query(messagesRef, orderBy('timestamp', 'desc'));
	
	return onSnapshot(q, (snapshot) => {
		const messages = snapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data(),
		}));
		callback(messages);
	}, (error) => {
		console.error('Error subscribing to chat messages:', error);
		callback([]);
	});
}

/**
 * Subscribe to user's chats
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function called with chats data
 * @returns {Function} Unsubscribe function
 */
export function subscribeToUserChats(userId, callback) {
	const chatsRef = collection(db, 'chats');
	const q = query(
		chatsRef,
		where('participants', 'array-contains', userId),
		orderBy('lastMessageTimestamp', 'desc')
	);
	
	return onSnapshot(q, (snapshot) => {
		const chats = snapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		}));
		callback(chats);
	}, (error) => {
		console.error('Error subscribing to chats:', error);
		callback([]);
	});
}
