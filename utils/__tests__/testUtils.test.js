/**
 * Test Utilities Tests
 * Phase 12: Week 7 Implementation Plan
 */

import {
    calculateExpectedAverage,
    createMockNotification,
    createMockReport,
    createMockReview,
    createMockTrip,
    createMockUser,
    formatTestDate,
    generateTestId,
    testAssertions,
    testScenarios,
    wait,
} from '../testUtils';

describe('Test Utilities', () => {
	describe('createMockTrip', () => {
		it('creates trip with default values', () => {
			const trip = createMockTrip();
			expect(trip.id).toBeDefined();
			expect(trip.driverId).toBe('test-driver-id');
			expect(trip.riderId).toBe('test-rider-id');
			expect(trip.status).toBe('active');
			expect(trip.isRatedByDriver).toBe(false);
			expect(trip.isRatedByRider).toBe(false);
		});

		it('allows overriding default values', () => {
			const trip = createMockTrip({ status: 'completed', price: 50 });
			expect(trip.status).toBe('completed');
			expect(trip.price).toBe(50);
		});

		it('includes location data', () => {
			const trip = createMockTrip();
			expect(trip.startLocation).toBeDefined();
			expect(trip.startLocation.placeName).toBeDefined();
			expect(trip.endLocation).toBeDefined();
		});
	});

	describe('createMockUser', () => {
		it('creates user with default values', () => {
			const user = createMockUser();
			expect(user.uid).toBeDefined();
			expect(user.email).toBe('test@example.com');
			expect(user.averageRating).toBe(0);
			expect(user.totalRatings).toBe(0);
			expect(user.blockedUsers).toEqual([]);
		});

		it('allows overriding default values', () => {
			const user = createMockUser({ name: 'John', averageRating: 4.5 });
			expect(user.name).toBe('John');
			expect(user.averageRating).toBe(4.5);
		});
	});

	describe('createMockReview', () => {
		it('creates review with default values', () => {
			const review = createMockReview();
			expect(review.id).toBeDefined();
			expect(review.rating).toBe(5);
			expect(review.reviewText).toBe('Great experience!');
			expect(review.isPublic).toBe(true);
		});

		it('allows overriding default values', () => {
			const review = createMockReview({ rating: 3, reviewText: 'OK trip' });
			expect(review.rating).toBe(3);
			expect(review.reviewText).toBe('OK trip');
		});
	});

	describe('createMockReport', () => {
		it('creates report with default values', () => {
			const report = createMockReport();
			expect(report.id).toBeDefined();
			expect(report.reason).toBe('inappropriate_behavior');
			expect(report.status).toBe('pending');
		});

		it('allows overriding default values', () => {
			const report = createMockReport({ reason: 'spam', description: 'Spamming' });
			expect(report.reason).toBe('spam');
			expect(report.description).toBe('Spamming');
		});
	});

	describe('createMockNotification', () => {
		it('creates rating reminder notification', () => {
			const notification = createMockNotification('rating_reminder');
			expect(notification.request.content.data.type).toBe('rating_reminder');
			expect(notification.request.content.data.tripId).toBe('test-trip-id');
		});

		it('creates trip reminder notification', () => {
			const notification = createMockNotification('trip_reminder');
			expect(notification.request.content.data.type).toBe('trip_reminder');
			expect(notification.request.content.data.reminderType).toBe('2h');
		});

		it('creates new message notification', () => {
			const notification = createMockNotification('new_message');
			expect(notification.request.content.data.type).toBe('new_message');
			expect(notification.request.content.data.chatId).toBe('test-chat-id');
		});

		it('creates default notification for unknown type', () => {
			const notification = createMockNotification('unknown');
			expect(notification.request.content.title).toBe('Test Notification');
		});
	});

	describe('calculateExpectedAverage', () => {
		it('returns new rating when count is 0', () => {
			expect(calculateExpectedAverage(0, 0, 5)).toBe(5);
		});

		it('calculates correct average with existing ratings', () => {
			// (4.0 * 5 + 3) / 6 = 23/6 = 3.833...
			const result = calculateExpectedAverage(4.0, 5, 3);
			expect(result).toBeCloseTo(3.833, 2);
		});

		it('handles single existing rating', () => {
			// (5 * 1 + 3) / 2 = 4
			expect(calculateExpectedAverage(5, 1, 3)).toBe(4);
		});
	});

	describe('formatTestDate', () => {
		it('formats date to ISO date string', () => {
			const date = new Date('2026-01-15T10:30:00Z');
			expect(formatTestDate(date)).toBe('2026-01-15');
		});
	});

	describe('wait', () => {
		it('waits for specified duration', async () => {
			const start = Date.now();
			await wait(50);
			const elapsed = Date.now() - start;
			expect(elapsed).toBeGreaterThanOrEqual(45);
		});
	});

	describe('generateTestId', () => {
		it('generates unique IDs with prefix', () => {
			const id1 = generateTestId('user');
			const id2 = generateTestId('user');
			expect(id1).toContain('user-');
			expect(id2).toContain('user-');
			expect(id1).not.toBe(id2);
		});

		it('uses default prefix when none provided', () => {
			const id = generateTestId();
			expect(id).toContain('test-');
		});
	});

	describe('testAssertions', () => {
		describe('isValidRating', () => {
			it('returns true for valid ratings 1-5', () => {
				expect(testAssertions.isValidRating(1)).toBe(true);
				expect(testAssertions.isValidRating(3)).toBe(true);
				expect(testAssertions.isValidRating(5)).toBe(true);
			});

			it('returns false for invalid ratings', () => {
				expect(testAssertions.isValidRating(0)).toBe(false);
				expect(testAssertions.isValidRating(6)).toBe(false);
				expect(testAssertions.isValidRating('5')).toBe(false);
			});
		});

		describe('isValidAverage', () => {
			it('returns true for valid averages 0-5', () => {
				expect(testAssertions.isValidAverage(0)).toBe(true);
				expect(testAssertions.isValidAverage(4.5)).toBe(true);
				expect(testAssertions.isValidAverage(5)).toBe(true);
			});

			it('returns false for invalid averages', () => {
				expect(testAssertions.isValidAverage(-1)).toBe(false);
				expect(testAssertions.isValidAverage(6)).toBe(false);
			});
		});

		describe('isValidReportReason', () => {
			it('returns true for valid report reasons', () => {
				expect(testAssertions.isValidReportReason('inappropriate_behavior')).toBe(true);
				expect(testAssertions.isValidReportReason('safety_concern')).toBe(true);
				expect(testAssertions.isValidReportReason('harassment')).toBe(true);
				expect(testAssertions.isValidReportReason('other')).toBe(true);
			});

			it('returns false for invalid reasons', () => {
				expect(testAssertions.isValidReportReason('invalid')).toBe(false);
				expect(testAssertions.isValidReportReason('')).toBe(false);
			});
		});

		describe('isValidTripStatus', () => {
			it('returns true for valid statuses', () => {
				expect(testAssertions.isValidTripStatus('active')).toBe(true);
				expect(testAssertions.isValidTripStatus('completed')).toBe(true);
				expect(testAssertions.isValidTripStatus('cancelled')).toBe(true);
			});

			it('returns false for invalid statuses', () => {
				expect(testAssertions.isValidTripStatus('pending')).toBe(false);
				expect(testAssertions.isValidTripStatus('done')).toBe(false);
			});
		});

		describe('isValidNotificationType', () => {
			it('returns true for valid notification types', () => {
				expect(testAssertions.isValidNotificationType('rating_reminder')).toBe(true);
				expect(testAssertions.isValidNotificationType('trip_reminder')).toBe(true);
				expect(testAssertions.isValidNotificationType('new_message')).toBe(true);
			});

			it('returns false for invalid types', () => {
				expect(testAssertions.isValidNotificationType('unknown')).toBe(false);
				expect(testAssertions.isValidNotificationType('')).toBe(false);
			});
		});
	});

	describe('testScenarios', () => {
		describe('completedTripReadyForRating', () => {
			it('creates a completed trip that has not been rated', () => {
				const trip = testScenarios.completedTripReadyForRating();
				expect(trip.status).toBe('completed');
				expect(trip.isRatedByDriver).toBe(false);
				expect(trip.isRatedByRider).toBe(false);
			});
		});

		describe('tripRatedByDriver', () => {
			it('creates a trip where driver has rated', () => {
				const trip = testScenarios.tripRatedByDriver();
				expect(trip.status).toBe('completed');
				expect(trip.isRatedByDriver).toBe(true);
				expect(trip.isRatedByRider).toBe(false);
			});
		});

		describe('fullyRatedTrip', () => {
			it('creates a fully rated trip', () => {
				const trip = testScenarios.fullyRatedTrip();
				expect(trip.isRatedByDriver).toBe(true);
				expect(trip.isRatedByRider).toBe(true);
				expect(trip.bothPartiesRated).toBe(true);
			});
		});

		describe('userWithRatings', () => {
			it('creates user with specified ratings', () => {
				const user = testScenarios.userWithRatings(4.2, 15);
				expect(user.averageRating).toBe(4.2);
				expect(user.totalRatings).toBe(15);
				expect(user.totalTripsCompleted).toBe(15);
			});

			it('uses default values when not specified', () => {
				const user = testScenarios.userWithRatings();
				expect(user.averageRating).toBe(4.5);
				expect(user.totalRatings).toBe(10);
			});
		});

		describe('userWithBlockedUsers', () => {
			it('creates user with blocked users list', () => {
				const user = testScenarios.userWithBlockedUsers(['user-1', 'user-2']);
				expect(user.blockedUsers).toEqual(['user-1', 'user-2']);
			});

			it('uses default blocked users when not specified', () => {
				const user = testScenarios.userWithBlockedUsers();
				expect(user.blockedUsers).toEqual(['blocked-1', 'blocked-2']);
			});
		});
	});
});
