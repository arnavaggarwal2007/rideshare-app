/**
 * Firebase Reviews Service
 * Handles rating submissions and review queries with atomic transactions
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    where
} from 'firebase/firestore';
import { db } from './config';

/**
 * Submit a rating for a completed trip
 * Uses a transaction to atomically update:
 * 1. Create review document
 * 2. Update trip rating flags
 * 3. Update reviewee's average rating and count
 * 
 * @param {string} tripId - Trip document ID
 * @param {string} reviewerId - User ID of the reviewer
 * @param {string} revieweeId - User ID of the person being reviewed
 * @param {number} rating - Rating value (1-5)
 * @param {string} reviewText - Optional review text (max 500 chars)
 * @param {string} reviewerRole - 'driver' or 'rider'
 * @returns {Promise<Object>} - Created review object with ID
 */
export async function submitRating(tripId, reviewerId, revieweeId, rating, reviewText, reviewerRole) {
	if (!tripId || !reviewerId || !revieweeId || !rating || !reviewerRole) {
		throw new Error('Missing required parameters for rating submission');
	}

	if (rating < 1 || rating > 5) {
		throw new Error('Rating must be between 1 and 5');
	}

	if (reviewText && reviewText.length > 500) {
		throw new Error('Review text cannot exceed 500 characters');
	}

	if (!['driver', 'rider'].includes(reviewerRole)) {
		throw new Error('Invalid reviewer role');
	}

	const tripRef = doc(db, 'trips', tripId);
	const revieweeRef = doc(db, 'users', revieweeId);
	const reviewsRef = collection(db, 'reviews');

	const reviewData = await runTransaction(db, async (transaction) => {
		// Step 1: Read trip document and verify it exists and is completed
		const tripSnap = await transaction.get(tripRef);
		if (!tripSnap.exists()) {
			throw new Error('Trip not found');
		}

		const tripData = tripSnap.data();
		if (tripData.status !== 'completed') {
			throw new Error('Can only rate completed trips');
		}

		// Step 2: Verify reviewer is part of this trip
		const isDriver = tripData.driverId === reviewerId;
		const isRider = tripData.riderId === reviewerId;
		if (!isDriver && !isRider) {
			throw new Error('You are not part of this trip');
		}

		// Step 3: Verify the reviewer hasn't already rated this trip
		const ratingFlagField = reviewerRole === 'driver' ? 'isRatedByDriver' : 'isRatedByRider';
		if (tripData[ratingFlagField] === true) {
			throw new Error('You have already rated this trip');
		}

		// Step 4: Read reviewee's user document for current rating stats
		const revieweeSnap = await transaction.get(revieweeRef);
		if (!revieweeSnap.exists()) {
			throw new Error('Reviewee user not found');
		}

		const revieweeData = revieweeSnap.data();
		const currentAvgRating = revieweeData.averageRating || 0;
		const currentTotalRatings = revieweeData.totalRatings || 0;

		// Step 5: Calculate new average rating
		const newTotalRatings = currentTotalRatings + 1;
		const newAvgRating = ((currentAvgRating * currentTotalRatings) + rating) / newTotalRatings;
		// Round to 2 decimal places
		const roundedAvgRating = Math.round(newAvgRating * 100) / 100;

		// Step 6: Create review document reference
		const newReviewRef = doc(reviewsRef);

		// Step 7: Prepare review data
		const review = {
			tripId,
			reviewerId,
			revieweeId,
			reviewerRole,
			rating,
			reviewText: reviewText?.trim() || '',
			isPublic: true,
			createdAt: serverTimestamp(),
			isReported: false,
			reportCount: 0,
			isHidden: false
		};

		// Step 8: Set the review document
		transaction.set(newReviewRef, review);

		// Step 9: Update trip's rating flag
		const tripUpdates = {
			[ratingFlagField]: true,
			updatedAt: serverTimestamp()
		};

		// Step 10: Check if both parties have now rated
		const otherRatingFlag = reviewerRole === 'driver' ? 'isRatedByRider' : 'isRatedByDriver';
		if (tripData[otherRatingFlag] === true) {
			tripUpdates.bothPartiesRated = true;
		}

		transaction.update(tripRef, tripUpdates);

		// Step 11: Update reviewee's user document with new rating stats
		transaction.update(revieweeRef, {
			averageRating: roundedAvgRating,
			totalRatings: newTotalRatings,
			updatedAt: serverTimestamp()
		});

		return {
			id: newReviewRef.id,
			...review,
			createdAt: new Date() // Return current date since serverTimestamp returns null in transaction
		};
	});

	return reviewData;
}

/**
 * Get reviews for a specific user
 * @param {string} userId - User ID to get reviews for
 * @param {number} limitCount - Maximum number of reviews to fetch (default 10)
 * @returns {Promise<Array>} - Array of review objects
 */
export async function getUserReviews(userId, limitCount = 10) {
	if (!userId) {
		throw new Error('userId is required');
	}

	const reviewsRef = collection(db, 'reviews');
	const q = query(
		reviewsRef,
		where('revieweeId', '==', userId),
		where('isHidden', '==', false),
		orderBy('createdAt', 'desc'),
		limit(limitCount)
	);

	const snapshot = await getDocs(q);
	return snapshot.docs.map(doc => ({
		id: doc.id,
		...doc.data()
	}));
}

/**
 * Check if a user has already submitted a review for a specific trip
 * @param {string} tripId - Trip document ID
 * @param {string} reviewerId - User ID of the potential reviewer
 * @returns {Promise<Object|null>} - Review object if exists, null otherwise
 */
export async function getTripReview(tripId, reviewerId) {
	if (!tripId || !reviewerId) {
		throw new Error('tripId and reviewerId are required');
	}

	const reviewsRef = collection(db, 'reviews');
	const q = query(
		reviewsRef,
		where('tripId', '==', tripId),
		where('reviewerId', '==', reviewerId),
		limit(1)
	);

	const snapshot = await getDocs(q);
	if (snapshot.empty) {
		return null;
	}

	const doc = snapshot.docs[0];
	return {
		id: doc.id,
		...doc.data()
	};
}

/**
 * Get unrated completed trips for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of unrated trip objects
 */
export async function getUnratedTripsForUser(userId) {
	if (!userId) {
		throw new Error('userId is required');
	}

	const tripsRef = collection(db, 'trips');
	const unratedTrips = [];

	// Query as rider
	const riderQuery = query(
		tripsRef,
		where('riderId', '==', userId),
		where('status', '==', 'completed'),
		where('isRatedByRider', '==', false)
	);

	const riderSnapshot = await getDocs(riderQuery);
	riderSnapshot.docs.forEach(doc => {
		unratedTrips.push({
			id: doc.id,
			...doc.data(),
			userRole: 'rider'
		});
	});

	// Query as driver
	const driverQuery = query(
		tripsRef,
		where('driverId', '==', userId),
		where('status', '==', 'completed'),
		where('isRatedByDriver', '==', false)
	);

	const driverSnapshot = await getDocs(driverQuery);
	driverSnapshot.docs.forEach(doc => {
		unratedTrips.push({
			id: doc.id,
			...doc.data(),
			userRole: 'driver'
		});
	});

	// Sort by departure time descending (most recent first)
	unratedTrips.sort((a, b) => {
		const timeA = a.departureTimestamp?.toDate?.() || new Date(a.departureTimestamp);
		const timeB = b.departureTimestamp?.toDate?.() || new Date(b.departureTimestamp);
		return timeB - timeA;
	});

	return unratedTrips;
}

/**
 * Get a single review by ID
 * @param {string} reviewId - Review document ID
 * @returns {Promise<Object|null>} - Review object or null
 */
export async function getReviewById(reviewId) {
	if (!reviewId) {
		throw new Error('reviewId is required');
	}

	const reviewRef = doc(db, 'reviews', reviewId);
	const reviewSnap = await getDoc(reviewRef);

	if (!reviewSnap.exists()) {
		return null;
	}

	return {
		id: reviewSnap.id,
		...reviewSnap.data()
	};
}

/**
 * Get all reviews for a trip (both driver and rider reviews)
 * @param {string} tripId - Trip document ID
 * @returns {Promise<Array>} - Array of review objects
 */
export async function getTripReviews(tripId) {
	if (!tripId) {
		throw new Error('tripId is required');
	}

	const reviewsRef = collection(db, 'reviews');
	const q = query(
		reviewsRef,
		where('tripId', '==', tripId)
	);

	const snapshot = await getDocs(q);
	return snapshot.docs.map(doc => ({
		id: doc.id,
		...doc.data()
	}));
}
