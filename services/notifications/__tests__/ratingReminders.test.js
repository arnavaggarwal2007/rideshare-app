/**
 * Rating Reminders Service Tests
 * Phase 8: Week 7 Implementation Plan
 */

import {
    getTripIdFromNotification,
    getUserRoleFromNotification,
    isRatingReminderNotification,
    sendRatingReminderNotification,
    sendTripCompletionRatingReminders,
} from '../ratingReminders';

// Mock dependencies
jest.mock('../pushNotifications', () => ({
	sendPushNotificationAsync: jest.fn(),
}));

jest.mock('../pushTokens', () => ({
	getUserPushTokens: jest.fn(),
}));

import { sendPushNotificationAsync } from '../pushNotifications';
import { getUserPushTokens } from '../pushTokens';

describe('Rating Reminders Service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('sendRatingReminderNotification', () => {
		it('returns error when userId is missing', async () => {
			const result = await sendRatingReminderNotification(null, 'trip123', 'John');
			expect(result).toEqual({ sent: 0, error: 'Missing required parameters' });
		});

		it('returns error when tripId is missing', async () => {
			const result = await sendRatingReminderNotification('user123', null, 'John');
			expect(result).toEqual({ sent: 0, error: 'Missing required parameters' });
		});

		it('returns error when no push tokens found', async () => {
			getUserPushTokens.mockResolvedValue([]);
			const result = await sendRatingReminderNotification('user123', 'trip123', 'John');
			expect(result).toEqual({ sent: 0, error: 'No push tokens' });
		});

		it('sends notification with correct payload for rider', async () => {
			getUserPushTokens.mockResolvedValue(['ExponentPushToken[abc123]']);
			sendPushNotificationAsync.mockResolvedValue({ sent: 1 });

			const result = await sendRatingReminderNotification('user123', 'trip123', 'John Driver', 'rider');

			expect(sendPushNotificationAsync).toHaveBeenCalledWith(
				['ExponentPushToken[abc123]'],
				{
					title: 'Rate Your Trip!',
					body: 'How was your ride with John Driver? Tap to leave a review.',
					data: {
						type: 'rating_reminder',
						tripId: 'trip123',
						userRole: 'rider',
					},
				}
			);
			expect(result).toEqual({ sent: 1 });
		});

		it('sends notification with correct payload for driver', async () => {
			getUserPushTokens.mockResolvedValue(['ExponentPushToken[abc123]']);
			sendPushNotificationAsync.mockResolvedValue({ sent: 1 });

			const result = await sendRatingReminderNotification('user123', 'trip123', 'Jane Rider', 'driver');

			expect(sendPushNotificationAsync).toHaveBeenCalledWith(
				['ExponentPushToken[abc123]'],
				{
					title: 'Rate Your Trip!',
					body: 'How was your ride with Jane Rider? Tap to leave a review.',
					data: {
						type: 'rating_reminder',
						tripId: 'trip123',
						userRole: 'driver',
					},
				}
			);
			expect(result).toEqual({ sent: 1 });
		});

		it('uses default name when otherUserName is not provided', async () => {
			getUserPushTokens.mockResolvedValue(['ExponentPushToken[abc123]']);
			sendPushNotificationAsync.mockResolvedValue({ sent: 1 });

			await sendRatingReminderNotification('user123', 'trip123', null, 'rider');

			expect(sendPushNotificationAsync).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({
					body: 'How was your ride with your driver? Tap to leave a review.',
				})
			);
		});

		it('uses default rider name when role is driver and name not provided', async () => {
			getUserPushTokens.mockResolvedValue(['ExponentPushToken[abc123]']);
			sendPushNotificationAsync.mockResolvedValue({ sent: 1 });

			await sendRatingReminderNotification('user123', 'trip123', null, 'driver');

			expect(sendPushNotificationAsync).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({
					body: 'How was your ride with your rider? Tap to leave a review.',
				})
			);
		});

		it('handles getUserPushTokens error gracefully', async () => {
			getUserPushTokens.mockRejectedValue(new Error('Network error'));

			const result = await sendRatingReminderNotification('user123', 'trip123', 'John');

			expect(result).toEqual({ sent: 0, error: 'Network error' });
		});

		it('handles sendPushNotificationAsync error gracefully', async () => {
			getUserPushTokens.mockResolvedValue(['ExponentPushToken[abc123]']);
			sendPushNotificationAsync.mockRejectedValue(new Error('Push failed'));

			const result = await sendRatingReminderNotification('user123', 'trip123', 'John');

			expect(result).toEqual({ sent: 0, error: 'Push failed' });
		});
	});

	describe('sendTripCompletionRatingReminders', () => {
		it('returns zeros when tripData is null', async () => {
			const result = await sendTripCompletionRatingReminders(null);
			expect(result).toEqual({ driverResult: { sent: 0 }, riderResult: { sent: 0 } });
		});

		it('returns zeros when missing required fields', async () => {
			const result = await sendTripCompletionRatingReminders({ driverId: 'driver1' });
			expect(result).toEqual({ driverResult: { sent: 0 }, riderResult: { sent: 0 } });
		});

		it('sends notifications to both driver and rider', async () => {
			getUserPushTokens.mockResolvedValue(['ExponentPushToken[abc123]']);
			sendPushNotificationAsync.mockResolvedValue({ sent: 1 });

			const result = await sendTripCompletionRatingReminders({
				tripId: 'trip123',
				driverId: 'driver1',
				riderId: 'rider1',
				driverName: 'John Driver',
				riderName: 'Jane Rider',
			});

			expect(getUserPushTokens).toHaveBeenCalledTimes(2);
			expect(getUserPushTokens).toHaveBeenCalledWith('driver1');
			expect(getUserPushTokens).toHaveBeenCalledWith('rider1');

			expect(sendPushNotificationAsync).toHaveBeenCalledTimes(2);
			expect(result.driverResult).toEqual({ sent: 1 });
			expect(result.riderResult).toEqual({ sent: 1 });
		});

		it('handles partial failures gracefully', async () => {
			getUserPushTokens
				.mockResolvedValueOnce(['ExponentPushToken[abc123]'])
				.mockResolvedValueOnce([]);
			sendPushNotificationAsync.mockResolvedValue({ sent: 1 });

			const result = await sendTripCompletionRatingReminders({
				tripId: 'trip123',
				driverId: 'driver1',
				riderId: 'rider1',
			});

			expect(result.driverResult).toEqual({ sent: 1 });
			expect(result.riderResult).toEqual({ sent: 0, error: 'No push tokens' });
		});
	});

	describe('isRatingReminderNotification', () => {
		it('returns true for rating reminder notifications', () => {
			const notification = {
				request: {
					content: {
						data: { type: 'rating_reminder', tripId: 'trip123' },
					},
				},
			};
			expect(isRatingReminderNotification(notification)).toBe(true);
		});

		it('returns false for other notification types', () => {
			const notification = {
				request: {
					content: {
						data: { type: 'trip_reminder', tripId: 'trip123' },
					},
				},
			};
			expect(isRatingReminderNotification(notification)).toBe(false);
		});

		it('returns false for null notification', () => {
			expect(isRatingReminderNotification(null)).toBe(false);
		});

		it('returns false for notification without data', () => {
			const notification = {
				request: { content: {} },
			};
			expect(isRatingReminderNotification(notification)).toBe(false);
		});

		it('returns false for notification without content', () => {
			const notification = {
				request: {},
			};
			expect(isRatingReminderNotification(notification)).toBe(false);
		});
	});

	describe('getTripIdFromNotification', () => {
		it('extracts tripId from notification', () => {
			const notification = {
				request: {
					content: {
						data: { type: 'rating_reminder', tripId: 'trip456' },
					},
				},
			};
			expect(getTripIdFromNotification(notification)).toBe('trip456');
		});

		it('returns null when no tripId', () => {
			const notification = {
				request: {
					content: {
						data: { type: 'rating_reminder' },
					},
				},
			};
			expect(getTripIdFromNotification(notification)).toBeNull();
		});

		it('returns null for null notification', () => {
			expect(getTripIdFromNotification(null)).toBeNull();
		});

		it('returns null for notification without data', () => {
			const notification = {
				request: { content: {} },
			};
			expect(getTripIdFromNotification(notification)).toBeNull();
		});
	});

	describe('getUserRoleFromNotification', () => {
		it('extracts userRole from notification', () => {
			const notification = {
				request: {
					content: {
						data: { type: 'rating_reminder', userRole: 'driver' },
					},
				},
			};
			expect(getUserRoleFromNotification(notification)).toBe('driver');
		});

		it('returns null when no userRole', () => {
			const notification = {
				request: {
					content: {
						data: { type: 'rating_reminder' },
					},
				},
			};
			expect(getUserRoleFromNotification(notification)).toBeNull();
		});

		it('returns null for null notification', () => {
			expect(getUserRoleFromNotification(null)).toBeNull();
		});

		it('extracts rider role correctly', () => {
			const notification = {
				request: {
					content: {
						data: { type: 'rating_reminder', userRole: 'rider' },
					},
				},
			};
			expect(getUserRoleFromNotification(notification)).toBe('rider');
		});
	});
});
