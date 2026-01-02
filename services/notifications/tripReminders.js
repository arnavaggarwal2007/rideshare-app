import * as Notifications from 'expo-notifications';

// Track which trips already have reminders scheduled to prevent duplicates
const scheduledReminders = new Set();

/**
 * Schedule a reminder notification for a trip
 * @param {Object} trip - Trip object with departureTimestamp
 * @param {number} minutesBefore - Minutes before trip to show reminder (e.g., 24 * 60 or 2 * 60)
 */
export async function scheduleTripReminder(trip, minutesBefore) {
	if (!trip || !trip.id || !trip.departureTimestamp) return;

	// Create a unique key for this specific reminder
	const reminderKey = `${trip.id}-${minutesBefore}`;
	
	// Skip if this reminder is already scheduled
	if (scheduledReminders.has(reminderKey)) {
		return;
	}

	try {
		const departureTime = trip.departureTimestamp.toDate?.() || new Date(trip.departureTimestamp);
		const now = new Date();
		const reminderTime = new Date(departureTime.getTime() - minutesBefore * 60000);

		// Only schedule if reminder time is in the future
		if (reminderTime <= now) return;

		const timeMs = reminderTime.getTime() - now.getTime();

		// Get trip location summary
		const startCity = trip.startLocation?.placeName?.split(',')[0] || 'Your trip';
		const endCity = trip.endLocation?.placeName?.split(',')[0] || 'destination';

		// Get reminder text based on minutes
		let reminderText = '';
		if (minutesBefore === 24 * 60) {
			reminderText = `Your trip to ${endCity} starts in 24 hours`;
		} else if (minutesBefore === 2 * 60) {
			reminderText = `Your trip to ${endCity} starts in 2 hours`;
		} else {
			const hours = Math.floor(minutesBefore / 60);
			reminderText = `Your trip to ${endCity} starts in ${hours} hour${hours !== 1 ? 's' : ''}`;
		}

		await Notifications.scheduleNotificationAsync({
			content: {
				title: 'Upcoming Trip',
				body: reminderText,
				data: { tripId: trip.id, reminderKey },
			},
			trigger: {
				seconds: Math.max(1, Math.floor(timeMs / 1000)), // Minimum 1 second
				type: 'interval', // This makes it a one-time notification
			},
		});

		// Mark this reminder as scheduled
		scheduledReminders.add(reminderKey);

		console.log(`[scheduleTripReminder] Scheduled reminder for trip ${trip.id} in ${minutesBefore} minutes`);
	} catch (error) {
		console.error('[scheduleTripReminder] Error:', error);
	}
}

/**
 * Schedule reminders for all upcoming trips
 * @param {Array} trips - Array of trip objects
 */
export async function scheduleAllTripReminders(trips) {
	if (!Array.isArray(trips)) return;

	const now = new Date();
	for (const trip of trips) {
		const departureTime = trip.departureTimestamp?.toDate?.() || new Date(trip.departureTimestamp);
		if (departureTime <= now) continue; // Skip past trips

		// Schedule 24-hour reminder
		await scheduleTripReminder(trip, 24 * 60);

		// Schedule 2-hour reminder
		await scheduleTripReminder(trip, 2 * 60);
	}
}

/**
 * Clear all scheduled trip reminder notifications
 */
export async function clearAllTripReminders() {
	try {
		const scheduled = await Notifications.getAllScheduledNotificationsAsync();
		const reminderNotifications = scheduled.filter(n => n.content.data?.tripId);
		
		for (const notification of reminderNotifications) {
			await Notifications.cancelNotificationAsync(notification.identifier);
		}

		// Clear the tracking set
		scheduledReminders.clear();

		console.log(`[clearAllTripReminders] Cleared ${reminderNotifications.length} scheduled reminders`);
	} catch (error) {
		console.error('[clearAllTripReminders] Error:', error);
	}
}

/**
 * Reset the reminder tracking state (used for testing or forced refresh)
 */
export function resetReminderTracking() {
	scheduledReminders.clear();
}
