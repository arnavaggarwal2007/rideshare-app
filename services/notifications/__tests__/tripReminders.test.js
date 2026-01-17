/**
 * Trip Reminders Service Tests
 * Phase 9: Week 7 Implementation Plan
 */

import {
    cancelTripReminder,
    cancelTripReminders,
    clearAllTripReminders,
    getScheduledReminderKeys,
    getTripIdFromReminderNotification,
    isTripReminderNotification,
    resetReminderTracking,
    scheduleTripReminder,
    scheduleTripReminders,
} from '../tripReminders';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
	scheduleNotificationAsync: jest.fn(),
	cancelScheduledNotificationAsync: jest.fn(),
	getAllScheduledNotificationsAsync: jest.fn(),
	SchedulableTriggerInputTypes: {
		TIME_INTERVAL: 'timeInterval',
	},
}));

import * as Notifications from 'expo-notifications';

describe('Trip Reminders Service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		resetReminderTracking();
	});

	describe('scheduleTripReminder', () => {
		it('returns null when tripId is missing', async () => {
			const result = await scheduleTripReminder(null, new Date(), 'NYC');
			expect(result).toBeNull();
		});

		it('returns null when departureTimestamp is missing', async () => {
			const result = await scheduleTripReminder('trip123', null, 'NYC');
			expect(result).toBeNull();
		});

		it('returns null when reminder time is in the past', async () => {
			const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
			const result = await scheduleTripReminder('trip123', pastDate, 'NYC', '24h');
			expect(result).toBeNull();
		});

		it('schedules 24h reminder with correct content', async () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 30); // 30 hours from now
			Notifications.scheduleNotificationAsync.mockResolvedValue('notif-id-24h');

			const result = await scheduleTripReminder('trip123', futureDate, 'Los Angeles', '24h');

			expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.objectContaining({
						title: 'Trip Tomorrow!',
						body: 'Your ride to Los Angeles is tomorrow. Get ready!',
						data: {
							type: 'trip_reminder',
							tripId: 'trip123',
							reminderType: '24h',
						},
					}),
				})
			);
			expect(result).toBe('notif-id-24h');
		});

		it('schedules 2h reminder with correct content', async () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 5); // 5 hours from now
			Notifications.scheduleNotificationAsync.mockResolvedValue('notif-id-2h');

			const result = await scheduleTripReminder('trip123', futureDate, 'San Francisco', '2h');

			expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.objectContaining({
						title: 'Trip in 2 Hours!',
						body: "Don't forget your ride to San Francisco. Leaving soon!",
						data: {
							type: 'trip_reminder',
							tripId: 'trip123',
							reminderType: '2h',
						},
					}),
				})
			);
			expect(result).toBe('notif-id-2h');
		});

		it('uses default destination when not provided', async () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 30);
			Notifications.scheduleNotificationAsync.mockResolvedValue('notif-id');

			await scheduleTripReminder('trip123', futureDate, null, '24h');

			expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.objectContaining({
						body: 'Your ride to your destination is tomorrow. Get ready!',
					}),
				})
			);
		});

		it('returns cached identifier if already scheduled', async () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 30);
			Notifications.scheduleNotificationAsync.mockResolvedValue('notif-id-original');

			const result1 = await scheduleTripReminder('trip123', futureDate, 'NYC', '24h');
			const result2 = await scheduleTripReminder('trip123', futureDate, 'NYC', '24h');

			expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
			expect(result1).toBe('notif-id-original');
			expect(result2).toBe('notif-id-original');
		});

		it('handles Firestore timestamp objects', async () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 30);
			const firestoreTimestamp = { toDate: () => futureDate };
			Notifications.scheduleNotificationAsync.mockResolvedValue('notif-id');

			const result = await scheduleTripReminder('trip123', firestoreTimestamp, 'NYC', '24h');

			expect(result).toBe('notif-id');
		});

		it('handles scheduling errors gracefully', async () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 30);
			Notifications.scheduleNotificationAsync.mockRejectedValue(new Error('Permission denied'));

			const result = await scheduleTripReminder('trip123', futureDate, 'NYC', '24h');

			expect(result).toBeNull();
		});
	});

	describe('scheduleTripReminders', () => {
		it('schedules both 24h and 2h reminders', async () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 30);
			Notifications.scheduleNotificationAsync
				.mockResolvedValueOnce('notif-24h')
				.mockResolvedValueOnce('notif-2h');

			const result = await scheduleTripReminders('trip123', futureDate, 'NYC');

			expect(result).toEqual({
				reminder24hId: 'notif-24h',
				reminder2hId: 'notif-2h',
			});
		});

		it('handles partial scheduling (only 2h if 24h is past)', async () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 5); // 5 hours from now
			Notifications.scheduleNotificationAsync.mockResolvedValue('notif-2h');

			const result = await scheduleTripReminders('trip123', futureDate, 'NYC');

			// 24h reminder would be in the past, so only 2h should be scheduled
			expect(result.reminder2hId).toBe('notif-2h');
		});
	});

	describe('cancelTripReminder', () => {
		it('returns false when notificationId is null', async () => {
			const result = await cancelTripReminder(null);
			expect(result).toBe(false);
		});

		it('cancels notification and returns true', async () => {
			Notifications.cancelScheduledNotificationAsync.mockResolvedValue();

			const result = await cancelTripReminder('notif-id');

			expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-id');
			expect(result).toBe(true);
		});

		it('handles cancellation errors gracefully', async () => {
			Notifications.cancelScheduledNotificationAsync.mockRejectedValue(new Error('Not found'));

			const result = await cancelTripReminder('notif-id');

			expect(result).toBe(false);
		});
	});

	describe('cancelTripReminders', () => {
		it('cancels both reminders', async () => {
			Notifications.cancelScheduledNotificationAsync.mockResolvedValue();

			const result = await cancelTripReminders('trip123', 'notif-24h', 'notif-2h');

			expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
			expect(result).toEqual({
				cancelled24h: true,
				cancelled2h: true,
			});
		});

		it('handles null notification IDs', async () => {
			const result = await cancelTripReminders('trip123', null, null);

			expect(result).toEqual({
				cancelled24h: false,
				cancelled2h: false,
			});
		});

		it('removes from tracking map', async () => {
			// First schedule some reminders
			const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 30);
			Notifications.scheduleNotificationAsync
				.mockResolvedValueOnce('notif-24h')
				.mockResolvedValueOnce('notif-2h');

			await scheduleTripReminders('trip123', futureDate, 'NYC');
			expect(getScheduledReminderKeys()).toContain('trip123-24h');
			expect(getScheduledReminderKeys()).toContain('trip123-2h');

			// Now cancel them
			Notifications.cancelScheduledNotificationAsync.mockResolvedValue();
			await cancelTripReminders('trip123', 'notif-24h', 'notif-2h');

			expect(getScheduledReminderKeys()).not.toContain('trip123-24h');
			expect(getScheduledReminderKeys()).not.toContain('trip123-2h');
		});
	});

	describe('clearAllTripReminders', () => {
		it('clears all trip reminder notifications', async () => {
			Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
				{ identifier: 'notif-1', content: { data: { type: 'trip_reminder' } } },
				{ identifier: 'notif-2', content: { data: { type: 'trip_reminder' } } },
				{ identifier: 'notif-3', content: { data: { type: 'other' } } },
			]);
			Notifications.cancelScheduledNotificationAsync.mockResolvedValue();

			const result = await clearAllTripReminders();

			expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
			expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
			expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-2');
			expect(result).toBe(2);
		});

		it('returns 0 when no reminders exist', async () => {
			Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);

			const result = await clearAllTripReminders();

			expect(result).toBe(0);
		});

		it('handles errors gracefully', async () => {
			Notifications.getAllScheduledNotificationsAsync.mockRejectedValue(new Error('Error'));

			const result = await clearAllTripReminders();

			expect(result).toBe(0);
		});
	});

	describe('isTripReminderNotification', () => {
		it('returns true for trip reminder notifications', () => {
			const notification = {
				request: {
					content: {
						data: { type: 'trip_reminder', tripId: 'trip123' },
					},
				},
			};
			expect(isTripReminderNotification(notification)).toBe(true);
		});

		it('returns false for other notification types', () => {
			const notification = {
				request: {
					content: {
						data: { type: 'rating_reminder', tripId: 'trip123' },
					},
				},
			};
			expect(isTripReminderNotification(notification)).toBe(false);
		});

		it('returns false for null notification', () => {
			expect(isTripReminderNotification(null)).toBe(false);
		});

		it('returns false for notification without data', () => {
			const notification = {
				request: { content: {} },
			};
			expect(isTripReminderNotification(notification)).toBe(false);
		});
	});

	describe('getTripIdFromReminderNotification', () => {
		it('extracts tripId from notification', () => {
			const notification = {
				request: {
					content: {
						data: { type: 'trip_reminder', tripId: 'trip456' },
					},
				},
			};
			expect(getTripIdFromReminderNotification(notification)).toBe('trip456');
		});

		it('returns null when no tripId', () => {
			const notification = {
				request: {
					content: {
						data: { type: 'trip_reminder' },
					},
				},
			};
			expect(getTripIdFromReminderNotification(notification)).toBeNull();
		});

		it('returns null for null notification', () => {
			expect(getTripIdFromReminderNotification(null)).toBeNull();
		});
	});

	describe('resetReminderTracking', () => {
		it('clears all tracked reminders', async () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 30);
			Notifications.scheduleNotificationAsync.mockResolvedValue('notif-id');

			await scheduleTripReminder('trip123', futureDate, 'NYC', '24h');
			expect(getScheduledReminderKeys().length).toBeGreaterThan(0);

			resetReminderTracking();
			expect(getScheduledReminderKeys().length).toBe(0);
		});
	});

	describe('getScheduledReminderKeys', () => {
		it('returns empty array initially', () => {
			expect(getScheduledReminderKeys()).toEqual([]);
		});

		it('returns scheduled reminder keys', async () => {
			const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 30);
			Notifications.scheduleNotificationAsync.mockResolvedValue('notif-id');

			await scheduleTripReminder('trip123', futureDate, 'NYC', '24h');
			await scheduleTripReminder('trip456', futureDate, 'LA', '2h');

			const keys = getScheduledReminderKeys();
			expect(keys).toContain('trip123-24h');
			expect(keys).toContain('trip456-2h');
		});
	});
});
