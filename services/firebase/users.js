/**
 * Firebase Users Service
 * CRUD operations for user profiles and user-related functionality
 */

import { arrayRemove, arrayUnion, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './config';

/**
 * Get user profile by ID
 * @param {string} userId - User's document ID
 * @returns {Promise<Object|null>} - User profile or null
 */
export async function getUserById(userId) {
	if (!userId) throw new Error('userId is required');
	const userRef = doc(db, 'users', userId);
	const userSnap = await getDoc(userRef);
	if (!userSnap.exists()) return null;
	return { id: userSnap.id, ...userSnap.data() };
}

/**
 * Update user profile
 * @param {string} userId - User's document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateUserProfile(userId, updates) {
	if (!userId || !updates) throw new Error('userId and updates are required');
	const userRef = doc(db, 'users', userId);
	await updateDoc(userRef, {
		...updates,
		updatedAt: serverTimestamp()
	});
}

/**
 * Block a user
 * @param {string} userId - The user performing the block
 * @param {string} blockedUserId - The user being blocked
 * @returns {Promise<void>}
 */
export async function blockUser(userId, blockedUserId) {
	if (!userId || !blockedUserId) throw new Error('userId and blockedUserId are required');
	if (userId === blockedUserId) throw new Error('Cannot block yourself');
	
	const userRef = doc(db, 'users', userId);
	await updateDoc(userRef, {
		blockedUsers: arrayUnion(blockedUserId),
		updatedAt: serverTimestamp()
	});
}

/**
 * Unblock a user
 * @param {string} userId - The user performing the unblock
 * @param {string} blockedUserId - The user being unblocked
 * @returns {Promise<void>}
 */
export async function unblockUser(userId, blockedUserId) {
	if (!userId || !blockedUserId) throw new Error('userId and blockedUserId are required');
	
	const userRef = doc(db, 'users', userId);
	await updateDoc(userRef, {
		blockedUsers: arrayRemove(blockedUserId),
		updatedAt: serverTimestamp()
	});
}

/**
 * Get list of blocked users for a user
 * @param {string} userId - User's document ID
 * @returns {Promise<string[]>} - Array of blocked user IDs
 */
export async function getBlockedUsers(userId) {
	if (!userId) throw new Error('userId is required');
	const userRef = doc(db, 'users', userId);
	const userSnap = await getDoc(userRef);
	if (!userSnap.exists()) return [];
	return userSnap.data()?.blockedUsers || [];
}

/**
 * Check if a user is blocked
 * @param {string} userId - The user who may have blocked
 * @param {string} targetUserId - The user who may be blocked
 * @returns {Promise<boolean>} - True if blocked
 */
export async function isUserBlocked(userId, targetUserId) {
	if (!userId || !targetUserId) return false;
	const blockedUsers = await getBlockedUsers(userId);
	return blockedUsers.includes(targetUserId);
}

/**
 * Update user's rating statistics
 * @param {string} userId - User's document ID
 * @param {number} newAverageRating - New average rating
 * @param {number} newTotalRatings - New total ratings count
 * @returns {Promise<void>}
 */
export async function updateUserRating(userId, newAverageRating, newTotalRatings) {
	if (!userId) throw new Error('userId is required');
	const userRef = doc(db, 'users', userId);
	await updateDoc(userRef, {
		averageRating: newAverageRating,
		totalRatings: newTotalRatings,
		updatedAt: serverTimestamp()
	});
}

/**
 * Increment user's completed trips count
 * @param {string} userId - User's document ID
 * @returns {Promise<void>}
 */
export async function incrementCompletedTrips(userId) {
	if (!userId) throw new Error('userId is required');
	const userRef = doc(db, 'users', userId);
	const userSnap = await getDoc(userRef);
	
	if (!userSnap.exists()) throw new Error('User not found');
	
	const currentCount = userSnap.data()?.totalTripsCompleted || 0;
	await updateDoc(userRef, {
		totalTripsCompleted: currentCount + 1,
		updatedAt: serverTimestamp()
	});
}
