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

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

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
		maxDetourMinutes: rideData.maxDetourMinutes || 0,
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
export async function createRideRequest(rideId, riderId, riderProfile, rideData, seatsRequested = 1, message = null) {
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
		seatsRequested,
		status: 'pending',
		message: message || null,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
		respondedAt: null,
	};
	
	const docRef = await addDoc(requestsRef, request);
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
	return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
