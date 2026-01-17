/**
 * Notification Handler Utility
 * Phase 10: Week 7 Implementation Plan
 *
 * Consolidated notification handling for deep linking and navigation.
 * Supports all notification types: rating_reminder, trip_reminder, new_message,
 * request_received, request_accepted, request_declined, trip_status
 */

import * as Notifications from 'expo-notifications';

/**
 * Notification types supported by the app
 */
export const NOTIFICATION_TYPES = {
	RATING_REMINDER: 'rating_reminder',
	TRIP_REMINDER: 'trip_reminder',
	NEW_MESSAGE: 'new_message',
	REQUEST_RECEIVED: 'request_received',
	REQUEST_ACCEPTED: 'request_accepted',
	REQUEST_DECLINED: 'request_declined',
	TRIP_STATUS: 'trip_status',
};

/**
 * Extract notification data from a notification response
 * @param {Object} response - Notification response from listener
 * @returns {Object|null} - Notification data or null
 */
export function getNotificationData(response) {
	return response?.notification?.request?.content?.data || null;
}

/**
 * Get the notification type from notification data
 * @param {Object} data - Notification data
 * @returns {string|null} - Notification type or null
 */
export function getNotificationType(data) {
	return data?.type || null;
}

/**
 * Determine the navigation route for a notification
 * @param {Object} data - Notification data
 * @returns {{route: string, params: Object}|null} - Navigation info or null
 */
export function getNavigationForNotification(data) {
	if (!data || !data.type) return null;

	switch (data.type) {
		case NOTIFICATION_TYPES.RATING_REMINDER:
			if (data.tripId) {
				return { route: `/rating/${data.tripId}`, params: { tripId: data.tripId } };
			}
			break;

		case NOTIFICATION_TYPES.TRIP_REMINDER:
			if (data.tripId) {
				return { route: `/trip/${data.tripId}`, params: { tripId: data.tripId } };
			}
			break;

		case NOTIFICATION_TYPES.NEW_MESSAGE:
			if (data.chatId) {
				return { route: `/chat/${data.chatId}`, params: { chatId: data.chatId } };
			}
			break;

		case NOTIFICATION_TYPES.REQUEST_RECEIVED:
			if (data.rideId) {
				return { route: `/ride/${data.rideId}`, params: { rideId: data.rideId, tab: 'requests' } };
			}
			break;

		case NOTIFICATION_TYPES.REQUEST_ACCEPTED:
		case NOTIFICATION_TYPES.REQUEST_DECLINED:
			if (data.tripId) {
				return { route: `/trip/${data.tripId}`, params: { tripId: data.tripId } };
			}
			if (data.rideId) {
				return { route: `/ride/${data.rideId}`, params: { rideId: data.rideId } };
			}
			break;

		case NOTIFICATION_TYPES.TRIP_STATUS:
			if (data.tripId) {
				return { route: `/trip/${data.tripId}`, params: { tripId: data.tripId } };
			}
			break;

		default:
			console.log('[notificationHandler] Unknown notification type:', data.type);
			return null;
	}

	return null;
}

/**
 * Handle a notification response (tap) and navigate accordingly
 * @param {Object} response - Notification response
 * @param {Object} router - Expo Router instance
 * @returns {boolean} - True if navigation was handled
 */
export function handleNotificationResponse(response, router) {
	if (!response || !router) {
		console.warn('[notificationHandler] Missing response or router');
		return false;
	}

	const data = getNotificationData(response);
	if (!data) {
		console.log('[notificationHandler] No notification data found');
		return false;
	}

	const navigation = getNavigationForNotification(data);
	if (!navigation) {
		console.log('[notificationHandler] No navigation route for notification:', data.type);
		return false;
	}

	console.log('[notificationHandler] Navigating to:', navigation.route);
	router.push(navigation.route);
	return true;
}

/**
 * Clear the app badge count
 * @returns {Promise<void>}
 */
export async function clearBadgeCount() {
	try {
		await Notifications.setBadgeCountAsync(0);
		console.log('[notificationHandler] Badge count cleared');
	} catch (error) {
		console.warn('[notificationHandler] Failed to clear badge count:', error?.message);
	}
}

/**
 * Get the current badge count
 * @returns {Promise<number>}
 */
export async function getBadgeCount() {
	try {
		return await Notifications.getBadgeCountAsync();
	} catch (error) {
		console.warn('[notificationHandler] Failed to get badge count:', error?.message);
		return 0;
	}
}

/**
 * Set the badge count
 * @param {number} count - Badge count to set
 * @returns {Promise<boolean>}
 */
export async function setBadgeCount(count) {
	try {
		await Notifications.setBadgeCountAsync(count);
		return true;
	} catch (error) {
		console.warn('[notificationHandler] Failed to set badge count:', error?.message);
		return false;
	}
}

/**
 * Check if notification permissions are granted
 * @returns {Promise<boolean>}
 */
export async function hasNotificationPermission() {
	try {
		const { status } = await Notifications.getPermissionsAsync();
		return status === 'granted';
	} catch (error) {
		console.warn('[notificationHandler] Failed to check permissions:', error?.message);
		return false;
	}
}

/**
 * Request notification permissions
 * @returns {Promise<boolean>} - True if permission granted
 */
export async function requestNotificationPermission() {
	try {
		const { status: existingStatus } = await Notifications.getPermissionsAsync();
		if (existingStatus === 'granted') return true;

		const { status } = await Notifications.requestPermissionsAsync();
		return status === 'granted';
	} catch (error) {
		console.warn('[notificationHandler] Failed to request permissions:', error?.message);
		return false;
	}
}

/**
 * Get all pending (scheduled) notifications
 * @returns {Promise<Array>}
 */
export async function getPendingNotifications() {
	try {
		return await Notifications.getAllScheduledNotificationsAsync();
	} catch (error) {
		console.warn('[notificationHandler] Failed to get pending notifications:', error?.message);
		return [];
	}
}

/**
 * Dismiss all delivered notifications from the notification center
 * @returns {Promise<void>}
 */
export async function dismissAllNotifications() {
	try {
		await Notifications.dismissAllNotificationsAsync();
		console.log('[notificationHandler] Dismissed all notifications');
	} catch (error) {
		console.warn('[notificationHandler] Failed to dismiss notifications:', error?.message);
	}
}

/**
 * Create a notification response listener
 * @param {Object} router - Expo Router instance
 * @returns {Object} - Subscription object with remove() method
 */
export function createNotificationResponseListener(router) {
	return Notifications.addNotificationResponseReceivedListener((response) => {
		handleNotificationResponse(response, router);
	});
}

/**
 * Create a foreground notification received listener
 * @param {Function} callback - Callback function with notification
 * @returns {Object} - Subscription object with remove() method
 */
export function createForegroundNotificationListener(callback) {
	return Notifications.addNotificationReceivedListener(callback);
}
