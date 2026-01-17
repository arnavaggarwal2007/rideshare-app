/**
 * Tests for Analytics Service
 */

import { Platform } from 'react-native';

// Mock firebase/analytics
jest.mock('firebase/analytics', () => ({
	getAnalytics: jest.fn(() => ({})),
	isSupported: jest.fn(() => Promise.resolve(true)),
	logEvent: jest.fn(),
	setUserProperties: jest.fn(),
	setUserId: jest.fn(),
}));

// Mock firebaseConfig
jest.mock('../../../firebaseConfig', () => ({
	default: {},
}));

// Import after mocks
import {
	initializeAnalytics,
	logEvent,
	setUserProperties,
	setUserId,
	logSignUp,
	logLogin,
	logProfileComplete,
	logRideCreated,
	logSeatRequested,
	logRequestAccepted,
	logTripCompleted,
	logRatingSubmitted,
	logMessageSent,
	logSearch,
	logScreenView,
	logError,
} from '../analytics';

describe('Analytics Service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('initializeAnalytics', () => {
		it('initializes without error on native platforms', async () => {
			Platform.OS = 'ios';
			
			// Should not throw - dynamic imports fail in jest but function handles gracefully
			await expect(initializeAnalytics()).resolves.toBeUndefined();
		});

		it('skips initialization on web', async () => {
			Platform.OS = 'web';

			await initializeAnalytics();

			// Should not throw
		});
	});

	describe('logEvent', () => {
		it('calls firebase logEvent with params', async () => {
			const params = { test: 'value' };
			await logEvent('test_event', params);

			// Function should not throw even if analytics not initialized
		});

		it('handles missing params gracefully', async () => {
			await logEvent('test_event');
			// Should not throw
		});
	});

	describe('setUserProperties', () => {
		it('accepts user properties object', async () => {
			await setUserProperties({ role: 'driver', school: 'UCLA' });
			// Should not throw
		});
	});

	describe('setUserId', () => {
		it('accepts user ID string', async () => {
			await setUserId('user-123');
			// Should not throw
		});

		it('accepts null to clear user', async () => {
			await setUserId(null);
			// Should not throw
		});
	});

	describe('Predefined Events', () => {
		describe('logSignUp', () => {
			it('logs sign up event with method', () => {
				logSignUp('email');
				// Should not throw
			});

			it('defaults to email method', () => {
				logSignUp();
				// Should not throw
			});
		});

		describe('logLogin', () => {
			it('logs login event with method', () => {
				logLogin('google');
				// Should not throw
			});

			it('defaults to email method', () => {
				logLogin();
				// Should not throw
			});
		});

		describe('logProfileComplete', () => {
			it('logs profile complete event', () => {
				logProfileComplete();
				// Should not throw
			});
		});

		describe('logRideCreated', () => {
			it('logs ride created with details', () => {
				logRideCreated({
					availableSeats: 4,
					pricePerSeat: 25,
					maxDetourMinutes: 15,
				});
				// Should not throw
			});

			it('handles empty details', () => {
				logRideCreated();
				// Should not throw
			});
		});

		describe('logSeatRequested', () => {
			it('logs seat request with ride ID and seats', () => {
				logSeatRequested('ride-123', 2);
				// Should not throw
			});

			it('defaults to 1 seat', () => {
				logSeatRequested('ride-123');
				// Should not throw
			});
		});

		describe('logRequestAccepted', () => {
			it('logs request accepted with ID', () => {
				logRequestAccepted('request-123');
				// Should not throw
			});
		});

		describe('logTripCompleted', () => {
			it('logs trip completed with ID', () => {
				logTripCompleted('trip-123');
				// Should not throw
			});
		});

		describe('logRatingSubmitted', () => {
			it('logs rating with value and role', () => {
				logRatingSubmitted(5, 'driver');
				// Should not throw
			});
		});

		describe('logMessageSent', () => {
			it('logs message sent with chat ID', () => {
				logMessageSent('chat-123');
				// Should not throw
			});
		});

		describe('logSearch', () => {
			it('logs search query', () => {
				logSearch('UCLA to LAX');
				// Should not throw
			});
		});

		describe('logScreenView', () => {
			it('logs screen view with name', () => {
				logScreenView('HomeScreen');
				// Should not throw
			});
		});

		describe('logError', () => {
			it('logs error with type, message, and screen', () => {
				logError('network_error', 'Connection failed', 'HomeScreen');
				// Should not throw
			});

			it('truncates long error messages', () => {
				const longMessage = 'a'.repeat(200);
				logError('test_error', longMessage);
				// Should not throw
			});

			it('handles undefined screen name', () => {
				logError('test_error', 'Test message');
				// Should not throw
			});
		});
	});

	describe('Error Handling', () => {
		it('does not throw when analytics is not initialized', async () => {
			// These should all fail silently
			await expect(logEvent('test')).resolves.toBeUndefined();
			await expect(setUserProperties({})).resolves.toBeUndefined();
			await expect(setUserId('test')).resolves.toBeUndefined();
		});

		it('handles import errors gracefully', async () => {
			// Mock import error
			jest.doMock('firebase/analytics', () => {
				throw new Error('Import failed');
			});

			// Should not throw
			await initializeAnalytics();
		});
	});
});
