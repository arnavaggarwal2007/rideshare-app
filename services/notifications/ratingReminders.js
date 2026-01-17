/**
 * Rating Reminder Notification Service
 * Phase 8: Week 7 Implementation Plan
 *
 * Sends push notifications to remind users to rate their trips
 * after completion.
 */

import { sendPushNotificationAsync } from './pushNotifications';
import { getUserPushTokens } from './pushTokens';

/**
 * Send a rating reminder notification to a user
 * @param {string} userId - User ID to notify
 * @param {string} tripId - Trip ID for deep linking
 * @param {string} otherUserName - Name of the other party (driver/rider)
 * @param {string} userRole - Role of recipient: 'driver' or 'rider'
 * @returns {Promise<{sent: number, error?: string}>}
 */
export async function sendRatingReminderNotification(userId, tripId, otherUserName, userRole = 'rider') {
	if (!userId || !tripId) {
		console.warn('[ratingReminders] Missing userId or tripId');
		return { sent: 0, error: 'Missing required parameters' };
	}

	try {
		const tokens = await getUserPushTokens(userId);

		if (!tokens || tokens.length === 0) {
			console.log('[ratingReminders] No push tokens found for user:', userId);
			return { sent: 0, error: 'No push tokens' };
		}

		const displayName = otherUserName || (userRole === 'driver' ? 'your rider' : 'your driver');
		const title = 'Rate Your Trip!';
		const body = `How was your ride with ${displayName}? Tap to leave a review.`;

		const result = await sendPushNotificationAsync(tokens, {
			title,
			body,
			data: {
				type: 'rating_reminder',
				tripId,
				userRole,
			},
		});

		console.log('[ratingReminders] Notification sent:', result);
		return result;
	} catch (error) {
		console.error('[ratingReminders] Error sending notification:', error?.message || error);
		return { sent: 0, error: error?.message || 'Unknown error' };
	}
}

/**
 * Send rating reminders to both driver and rider after trip completion
 * @param {Object} tripData - Trip data containing driverId, riderId, and participant info
 * @returns {Promise<{driverResult: Object, riderResult: Object}>}
 */
export async function sendTripCompletionRatingReminders(tripData) {
	if (!tripData) {
		console.warn('[ratingReminders] No trip data provided');
		return { driverResult: { sent: 0 }, riderResult: { sent: 0 } };
	}

	const { driverId, riderId, tripId, driverName, riderName } = tripData;

	if (!driverId || !riderId || !tripId) {
		console.warn('[ratingReminders] Missing required trip data fields');
		return { driverResult: { sent: 0 }, riderResult: { sent: 0 } };
	}

	// Send notifications in parallel
	const [driverResult, riderResult] = await Promise.all([
		// Notify driver to rate rider
		sendRatingReminderNotification(driverId, tripId, riderName, 'driver'),
		// Notify rider to rate driver
		sendRatingReminderNotification(riderId, tripId, driverName, 'rider'),
	]);

	return { driverResult, riderResult };
}

/**
 * Check if a notification is a rating reminder
 * @param {Object} notification - Notification object
 * @returns {boolean}
 */
export function isRatingReminderNotification(notification) {
	return notification?.request?.content?.data?.type === 'rating_reminder';
}

/**
 * Extract trip ID from rating reminder notification
 * @param {Object} notification - Notification object
 * @returns {string|null}
 */
export function getTripIdFromNotification(notification) {
	return notification?.request?.content?.data?.tripId || null;
}

/**
 * Extract user role from rating reminder notification
 * @param {Object} notification - Notification object
 * @returns {string|null}
 */
export function getUserRoleFromNotification(notification) {
	return notification?.request?.content?.data?.userRole || null;
}
