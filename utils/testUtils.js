/**
 * Test Utilities
 * Helper functions for integration and manual testing
 * Phase 12: Week 7 Implementation Plan
 */

/**
 * Mock trip data for testing
 */
export const createMockTrip = (overrides = {}) => ({
	id: `trip-${Date.now()}`,
	driverId: 'test-driver-id',
	riderId: 'test-rider-id',
	status: 'active',
	departureTimestamp: new Date(),
	startLocation: {
		placeName: '123 Test Street, City',
		latitude: 34.0522,
		longitude: -118.2437,
	},
	endLocation: {
		placeName: '456 Destination Ave, Town',
		latitude: 34.0195,
		longitude: -118.4912,
	},
	price: 25.00,
	seatsAvailable: 3,
	isRatedByDriver: false,
	isRatedByRider: false,
	bothPartiesRated: false,
	reminder24hId: null,
	reminder2hId: null,
	createdAt: new Date(),
	...overrides,
});

/**
 * Mock user data for testing
 */
export const createMockUser = (overrides = {}) => ({
	uid: `user-${Date.now()}`,
	email: 'test@example.com',
	name: 'Test User',
	photoURL: null,
	school: 'Test University',
	major: 'Computer Science',
	graduationYear: '2026',
	bio: 'Test bio',
	averageRating: 0,
	totalRatings: 0,
	totalTripsCompleted: 0,
	blockedUsers: [],
	createdAt: new Date(),
	...overrides,
});

/**
 * Mock review data for testing
 */
export const createMockReview = (overrides = {}) => ({
	id: `review-${Date.now()}`,
	tripId: 'test-trip-id',
	reviewerId: 'test-reviewer-id',
	revieweeId: 'test-reviewee-id',
	reviewerRole: 'rider',
	rating: 5,
	reviewText: 'Great experience!',
	reviewerName: 'Test Reviewer',
	reviewerPhotoURL: null,
	isPublic: true,
	createdAt: new Date(),
	isReported: false,
	reportCount: 0,
	isHidden: false,
	...overrides,
});

/**
 * Mock report data for testing
 */
export const createMockReport = (overrides = {}) => ({
	id: `report-${Date.now()}`,
	reporterId: 'test-reporter-id',
	reportedUserId: 'test-reported-id',
	reason: 'inappropriate_behavior',
	description: '',
	relatedTripId: null,
	relatedReviewId: null,
	status: 'pending',
	createdAt: new Date(),
	...overrides,
});

/**
 * Mock notification data for testing
 */
export const createMockNotification = (type, overrides = {}) => {
	const baseNotification = {
		request: {
			content: {
				title: 'Test Notification',
				body: 'Test notification body',
				data: {},
			},
		},
	};

	switch (type) {
		case 'rating_reminder':
			return {
				...baseNotification,
				request: {
					content: {
						title: 'Rate Your Trip',
						body: 'How was your ride?',
						data: {
							type: 'rating_reminder',
							tripId: 'test-trip-id',
						},
					},
				},
				...overrides,
			};
		case 'trip_reminder':
			return {
				...baseNotification,
				request: {
					content: {
						title: 'Trip Starting Soon',
						body: 'Your trip starts in 2 hours',
						data: {
							type: 'trip_reminder',
							tripId: 'test-trip-id',
							reminderType: '2h',
						},
					},
				},
				...overrides,
			};
		case 'new_message':
			return {
				...baseNotification,
				request: {
					content: {
						title: 'New Message',
						body: 'You have a new message',
						data: {
							type: 'new_message',
							chatId: 'test-chat-id',
						},
					},
				},
				...overrides,
			};
		default:
			return baseNotification;
	}
};

/**
 * Calculate expected average rating
 * @param {number} currentAverage - Current average rating
 * @param {number} currentCount - Current number of ratings
 * @param {number} newRating - New rating being added
 * @returns {number} Expected new average
 */
export const calculateExpectedAverage = (currentAverage, currentCount, newRating) => {
	if (currentCount === 0) {
		return newRating;
	}
	const totalSum = currentAverage * currentCount + newRating;
	return totalSum / (currentCount + 1);
};

/**
 * Format date for test comparison
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatTestDate = (date) => {
	return new Date(date).toISOString().split('T')[0];
};

/**
 * Wait for a specified duration (for testing async operations)
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate random test ID
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Random ID
 */
export const generateTestId = (prefix = 'test') => {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Test assertion helpers
 */
export const testAssertions = {
	/**
	 * Assert rating is within valid range
	 */
	isValidRating: (rating) => {
		return typeof rating === 'number' && rating >= 1 && rating <= 5;
	},

	/**
	 * Assert average is properly calculated
	 */
	isValidAverage: (average) => {
		return typeof average === 'number' && average >= 0 && average <= 5;
	},

	/**
	 * Assert report reason is valid
	 */
	isValidReportReason: (reason) => {
		const validReasons = [
			'inappropriate_behavior',
			'safety_concern',
			'fake_profile',
			'harassment',
			'spam',
			'other',
		];
		return validReasons.includes(reason);
	},

	/**
	 * Assert trip status is valid
	 */
	isValidTripStatus: (status) => {
		const validStatuses = ['active', 'in-progress', 'completed', 'cancelled'];
		return validStatuses.includes(status);
	},

	/**
	 * Assert notification type is valid
	 */
	isValidNotificationType: (type) => {
		const validTypes = [
			'rating_reminder',
			'trip_reminder',
			'new_message',
			'request_received',
			'request_accepted',
			'request_declined',
			'trip_status',
		];
		return validTypes.includes(type);
	},
};

/**
 * Test data generators for specific scenarios
 */
export const testScenarios = {
	/**
	 * Create a completed trip ready for rating
	 */
	completedTripReadyForRating: () => createMockTrip({
		status: 'completed',
		isRatedByDriver: false,
		isRatedByRider: false,
	}),

	/**
	 * Create a trip already rated by driver
	 */
	tripRatedByDriver: () => createMockTrip({
		status: 'completed',
		isRatedByDriver: true,
		isRatedByRider: false,
	}),

	/**
	 * Create a fully rated trip
	 */
	fullyRatedTrip: () => createMockTrip({
		status: 'completed',
		isRatedByDriver: true,
		isRatedByRider: true,
		bothPartiesRated: true,
	}),

	/**
	 * Create user with existing ratings
	 */
	userWithRatings: (avgRating = 4.5, count = 10) => createMockUser({
		averageRating: avgRating,
		totalRatings: count,
		totalTripsCompleted: count,
	}),

	/**
	 * Create user with blocked users
	 */
	userWithBlockedUsers: (blockedIds = ['blocked-1', 'blocked-2']) => createMockUser({
		blockedUsers: blockedIds,
	}),
};

export default {
	createMockTrip,
	createMockUser,
	createMockReview,
	createMockReport,
	createMockNotification,
	calculateExpectedAverage,
	formatTestDate,
	wait,
	generateTestId,
	testAssertions,
	testScenarios,
};
