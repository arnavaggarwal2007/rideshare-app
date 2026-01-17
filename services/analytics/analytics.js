/**
 * Analytics Service
 * Provides centralized analytics tracking for the RideBoard app
 * Uses Firebase Analytics for event tracking and user behavior analysis
 */

import { Platform } from 'react-native';

// Analytics is only available on native platforms
let analytics = null;
let isInitialized = false;

/**
 * Initialize Firebase Analytics
 * Should be called once at app startup
 */
export async function initializeAnalytics() {
	if (isInitialized) return;
	
	try {
		// Firebase Analytics not available on web in React Native
		if (Platform.OS === 'web') {
			console.log('[Analytics] Web platform - analytics disabled');
			return;
		}
		
		const { getAnalytics, isSupported } = await import('firebase/analytics');
		const app = (await import('../../firebaseConfig')).default;
		
		const supported = await isSupported();
		if (supported) {
			analytics = getAnalytics(app);
			isInitialized = true;
			console.log('[Analytics] Initialized successfully');
		} else {
			console.log('[Analytics] Not supported on this platform');
		}
	} catch (error) {
		console.log('[Analytics] Initialization error:', error.message);
	}
}

/**
 * Log a custom analytics event
 * @param {string} eventName - Name of the event (e.g., 'ride_created', 'seat_requested')
 * @param {object} params - Additional parameters for the event
 */
export async function logEvent(eventName, params = {}) {
	try {
		if (!analytics) {
			// Silent fail if analytics not initialized
			return;
		}
		
		const { logEvent: firebaseLogEvent } = await import('firebase/analytics');
		firebaseLogEvent(analytics, eventName, {
			...params,
			timestamp: new Date().toISOString(),
			platform: Platform.OS,
		});
	} catch (error) {
		// Silent fail - analytics should not break the app
		console.log('[Analytics] Event logging error:', error.message);
	}
}

/**
 * Set user properties for analytics
 * @param {object} properties - User properties to set
 */
export async function setUserProperties(properties) {
	try {
		if (!analytics) return;
		
		const { setUserProperties: firebaseSetUserProperties } = await import('firebase/analytics');
		firebaseSetUserProperties(analytics, properties);
	} catch (error) {
		console.log('[Analytics] Set user properties error:', error.message);
	}
}

/**
 * Set the current user ID for analytics
 * @param {string|null} userId - User ID or null to clear
 */
export async function setUserId(userId) {
	try {
		if (!analytics) return;
		
		const { setUserId: firebaseSetUserId } = await import('firebase/analytics');
		firebaseSetUserId(analytics, userId);
	} catch (error) {
		console.log('[Analytics] Set user ID error:', error.message);
	}
}

// ============================================
// PREDEFINED EVENTS
// ============================================

/**
 * Log when a user signs up
 * @param {string} method - Signup method (email, google, etc.)
 */
export function logSignUp(method = 'email') {
	logEvent('sign_up', { method });
}

/**
 * Log when a user logs in
 * @param {string} method - Login method (email, google, etc.)
 */
export function logLogin(method = 'email') {
	logEvent('login', { method });
}

/**
 * Log when a user completes profile setup
 */
export function logProfileComplete() {
	logEvent('profile_complete');
}

/**
 * Log when a ride is created
 * @param {object} rideDetails - Ride details (seats, price, etc.)
 */
export function logRideCreated(rideDetails = {}) {
	logEvent('ride_created', {
		seats: rideDetails.availableSeats,
		price_per_seat: rideDetails.pricePerSeat,
		has_detour: Boolean(rideDetails.maxDetourMinutes),
	});
}

/**
 * Log when a seat is requested
 * @param {string} rideId - The ride ID
 * @param {number} seats - Number of seats requested
 */
export function logSeatRequested(rideId, seats = 1) {
	logEvent('seat_requested', { ride_id: rideId, seats });
}

/**
 * Log when a ride request is accepted
 * @param {string} requestId - The request ID
 */
export function logRequestAccepted(requestId) {
	logEvent('request_accepted', { request_id: requestId });
}

/**
 * Log when a trip is completed
 * @param {string} tripId - The trip ID
 */
export function logTripCompleted(tripId) {
	logEvent('trip_completed', { trip_id: tripId });
}

/**
 * Log when a rating is submitted
 * @param {number} rating - The rating value (1-5)
 * @param {string} role - 'driver' or 'rider'
 */
export function logRatingSubmitted(rating, role) {
	logEvent('rating_submitted', { rating, role });
}

/**
 * Log when a message is sent
 * @param {string} chatId - The chat ID
 */
export function logMessageSent(chatId) {
	logEvent('message_sent', { chat_id: chatId });
}

/**
 * Log when user searches for rides
 * @param {string} query - Search query
 */
export function logSearch(query) {
	logEvent('search', { search_term: query });
}

/**
 * Log screen view
 * @param {string} screenName - Name of the screen
 */
export function logScreenView(screenName) {
	logEvent('screen_view', { screen_name: screenName });
}

/**
 * Log app errors for debugging
 * @param {string} errorType - Type of error
 * @param {string} errorMessage - Error message
 * @param {string} screenName - Screen where error occurred
 */
export function logError(errorType, errorMessage, screenName = 'unknown') {
	logEvent('app_error', {
		error_type: errorType,
		error_message: errorMessage?.substring(0, 100), // Truncate for analytics
		screen_name: screenName,
	});
}

export default {
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
};
