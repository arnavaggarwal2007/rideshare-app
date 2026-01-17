/**
 * Trip Reminders Service
 * Phase 9: Week 7 Implementation Plan
 *
 * Schedules local notifications to remind users about upcoming trips.
 * Uses expo-notifications for scheduling.
 */

import * as Notifications from 'expo-notifications';

// Track which trips already have reminders scheduled to prevent duplicates
const scheduledReminders = new Map();

/**
 * Schedule a reminder notification for a trip
 * @param {string} tripId - Trip ID
 * @param {Date|Object} departureTimestamp - Trip departure time (Date or Firestore Timestamp)
 * @param {string} destination - Destination name for notification body
 * @param {string} reminderType - Type of reminder: '24h' or '2h'
 * @returns {Promise<string|null>} - Notification identifier or null if not scheduled
 */
export async function scheduleTripReminder(tripId, departureTimestamp, destination, reminderType = '24h') {
	if (!tripId || !departureTimestamp) {
		console.warn('[tripReminders] Missing tripId or departureTimestamp');
		return null;
	}

	// Create a unique key for this specific reminder
	const reminderKey = `${tripId}-${reminderType}`;

	// Skip if this reminder is already scheduled
	if (scheduledReminders.has(reminderKey)) {
		console.log('[tripReminders] Reminder already scheduled:', reminderKey);
		return scheduledReminders.get(reminderKey);
	}

	try {
		const departureTime = departureTimestamp?.toDate?.() || new Date(departureTimestamp);
		const now = new Date();

		// Calculate trigger time based on reminder type
		const minutesBefore = reminderType === '24h' ? 24 * 60 : 2 * 60;
		const reminderTime = new Date(departureTime.getTime() - minutesBefore * 60000);

		// Skip if reminder time is in the past
		if (reminderTime <= now) {
			console.log('[tripReminders] Reminder time is in the past, skipping:', reminderKey);
			return null;
		}

		const timeMs = reminderTime.getTime() - now.getTime();
		const displayDestination = destination || 'your destination';

		// Notification content based on reminder type
		const title = reminderType === '24h' ? 'Trip Tomorrow!' : 'Trip in 2 Hours!';
		const body = reminderType === '24h'
			? `Your ride to ${displayDestination} is tomorrow. Get ready!`
			: `Don't forget your ride to ${displayDestination}. Leaving soon!`;

		const identifier = await Notifications.scheduleNotificationAsync({
			content: {
				title,
				body,
				data: {
					type: 'trip_reminder',
					tripId,
					reminderType,
				},
			},
			trigger: {
				seconds: Math.max(1, Math.floor(timeMs / 1000)),
				type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
			},
		});

		// Store the identifier for potential cancellation
		scheduledReminders.set(reminderKey, identifier);

		console.log(`[tripReminders] Scheduled ${reminderType} reminder for trip ${tripId}:`, identifier);
		return identifier;
	} catch (error) {
		console.error('[tripReminders] Error scheduling reminder:', error?.message || error);
		return null;
	}
}

/**
 * Schedule both 24h and 2h reminders for a trip
 * @param {string} tripId - Trip ID
 * @param {Date|Object} departureTimestamp - Trip departure time
 * @param {string} destination - Destination name
 * @returns {Promise<{reminder24hId: string|null, reminder2hId: string|null}>}
 */
export async function scheduleTripReminders(tripId, departureTimestamp, destination) {
	const [reminder24hId, reminder2hId] = await Promise.all([
		scheduleTripReminder(tripId, departureTimestamp, destination, '24h'),
		scheduleTripReminder(tripId, departureTimestamp, destination, '2h'),
	]);

	return { reminder24hId, reminder2hId };
}

/**
 * Cancel a specific trip reminder by notification identifier
 * @param {string} notificationId - Notification identifier to cancel
 * @returns {Promise<boolean>} - True if cancelled successfully
 */
export async function cancelTripReminder(notificationId) {
	if (!notificationId) return false;

	try {
		await Notifications.cancelScheduledNotificationAsync(notificationId);
		console.log('[tripReminders] Cancelled reminder:', notificationId);
		return true;
	} catch (error) {
		console.error('[tripReminders] Error cancelling reminder:', error?.message || error);
		return false;
	}
}

/**
 * Cancel all reminders for a specific trip
 * @param {string} tripId - Trip ID
 * @param {string|null} reminder24hId - 24h reminder notification ID
 * @param {string|null} reminder2hId - 2h reminder notification ID
 * @returns {Promise<{cancelled24h: boolean, cancelled2h: boolean}>}
 */
export async function cancelTripReminders(tripId, reminder24hId, reminder2hId) {
	const results = await Promise.all([
		cancelTripReminder(reminder24hId),
		cancelTripReminder(reminder2hId),
	]);

	// Remove from tracking map
	if (tripId) {
		scheduledReminders.delete(`${tripId}-24h`);
		scheduledReminders.delete(`${tripId}-2h`);
	}

	return {
		cancelled24h: results[0],
		cancelled2h: results[1],
	};
}

/**
 * Clear all scheduled trip reminder notifications
 * @returns {Promise<number>} - Number of reminders cleared
 */
export async function clearAllTripReminders() {
	try {
		const scheduled = await Notifications.getAllScheduledNotificationsAsync();
		const reminderNotifications = scheduled.filter(
			n => n.content.data?.type === 'trip_reminder'
		);

		for (const notification of reminderNotifications) {
			await Notifications.cancelScheduledNotificationAsync(notification.identifier);
		}

		// Clear the tracking map
		scheduledReminders.clear();

		console.log(`[tripReminders] Cleared ${reminderNotifications.length} scheduled reminders`);
		return reminderNotifications.length;
	} catch (error) {
		console.error('[tripReminders] Error clearing reminders:', error?.message || error);
		return 0;
	}
}

/**
 * Check if a notification is a trip reminder
 * @param {Object} notification - Notification object
 * @returns {boolean}
 */
export function isTripReminderNotification(notification) {
	return notification?.request?.content?.data?.type === 'trip_reminder';
}

/**
 * Extract trip ID from trip reminder notification
 * @param {Object} notification - Notification object
 * @returns {string|null}
 */
export function getTripIdFromReminderNotification(notification) {
	return notification?.request?.content?.data?.tripId || null;
}

/**
 * Reset the reminder tracking state (used for testing or forced refresh)
 */
export function resetReminderTracking() {
	scheduledReminders.clear();
}

/**
 * Get all currently tracked reminder keys (for debugging)
 * @returns {Array<string>}
 */
export function getScheduledReminderKeys() {
	return Array.from(scheduledReminders.keys());
}

