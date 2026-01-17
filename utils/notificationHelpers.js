/**
 * Notification Helpers Utility
 * Helper functions for notification edge cases and permissions
 */

import * as Notifications from 'expo-notifications';
import { arrayRemove, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Alert, Linking, Platform } from 'react-native';
import { db } from '../services/firebase/config';

/**
 * Check if notification permissions are granted
 * @returns {Promise<boolean>} True if permissions are granted
 */
export async function areNotificationsEnabled() {
	try {
		const { status } = await Notifications.getPermissionsAsync();
		return status === 'granted';
	} catch (error) {
		console.warn('[notificationHelpers] Error checking permissions:', error);
		return false;
	}
}

/**
 * Show alert to prompt user to enable notifications in settings
 * @param {Function} onCancel - Optional callback when user cancels
 */
export function showEnableNotificationsPrompt(onCancel = () => {}) {
	Alert.alert(
		'Notifications Disabled',
		'Enable notifications to receive important updates about your rides, messages, and trip reminders.',
		[
			{
				text: 'Not Now',
				style: 'cancel',
				onPress: onCancel,
			},
			{
				text: 'Open Settings',
				onPress: openNotificationSettings,
			},
		]
	);
}

/**
 * Open the device notification settings for the app
 */
export async function openNotificationSettings() {
	try {
		if (Platform.OS === 'ios') {
			await Linking.openURL('app-settings:');
		} else {
			await Linking.openSettings();
		}
	} catch (error) {
		console.warn('[notificationHelpers] Error opening settings:', error);
		Alert.alert(
			'Unable to Open Settings',
			'Please open your device settings and enable notifications for this app manually.'
		);
	}
}

/**
 * Request notification permissions with UI feedback
 * @returns {Promise<boolean>} True if permissions granted, false otherwise
 */
export async function requestNotificationPermissions() {
	try {
		const { status: existingStatus } = await Notifications.getPermissionsAsync();
		
		if (existingStatus === 'granted') {
			return true;
		}
		
		// Request permissions
		const { status } = await Notifications.requestPermissionsAsync();
		
		if (status !== 'granted') {
			// Show prompt to enable in settings
			showEnableNotificationsPrompt();
			return false;
		}
		
		return true;
	} catch (error) {
		console.warn('[notificationHelpers] Error requesting permissions:', error);
		return false;
	}
}

/**
 * Remove an invalid/expired push token from user's token list
 * @param {string} userId - The user's ID
 * @param {string} invalidToken - The token to remove
 * @returns {Promise<boolean>} True if removal was successful
 */
export async function removeInvalidPushToken(userId, invalidToken) {
	if (!userId || !invalidToken) {
		return false;
	}

	try {
		const tokenRef = doc(db, 'pushTokens', userId);
		const snap = await getDoc(tokenRef);
		
		if (!snap.exists()) {
			return false;
		}
		
		const data = snap.data();
		const tokens = data?.tokens || [];
		
		if (!tokens.includes(invalidToken)) {
			return false;
		}
		
		// Remove the invalid token from the array
		await updateDoc(tokenRef, {
			tokens: arrayRemove(invalidToken),
		});
		
		return true;
	} catch (error) {
		console.warn('[notificationHelpers] Error removing invalid token:', error);
		return false;
	}
}

/**
 * Handle push notification send errors and clean up invalid tokens
 * @param {Object} response - Response from Expo push notification API
 * @param {Array} tokens - Array of tokens that were used
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} Array of tokens that were removed as invalid
 */
export async function handlePushNotificationErrors(response, tokens, userId) {
	const removedTokens = [];
	
	if (!response || !response.data) {
		return removedTokens;
	}
	
	// Process each ticket in the response
	const tickets = Array.isArray(response.data) ? response.data : [response.data];
	
	for (let i = 0; i < tickets.length; i++) {
		const ticket = tickets[i];
		const token = tokens[i];
		
		// Check for error status indicating invalid token
		if (ticket.status === 'error') {
			const shouldRemove = 
				ticket.details?.error === 'DeviceNotRegistered' ||
				ticket.details?.error === 'InvalidCredentials' ||
				ticket.message?.includes('is not a valid Expo push token');
			
			if (shouldRemove && token) {
				const removed = await removeInvalidPushToken(userId, token);
				if (removed) {
					removedTokens.push(token);
				}
			}
		}
	}
	
	return removedTokens;
}

/**
 * Validate if a push token is properly formatted
 * @param {string} token - The token to validate
 * @returns {boolean} True if token is valid format
 */
export function isValidPushToken(token) {
	if (!token || typeof token !== 'string') {
		return false;
	}
	
	// Expo push tokens start with 'ExponentPushToken[' and end with ']'
	return token.startsWith('ExponentPushToken[') && token.endsWith(']');
}

/**
 * Filter array of tokens to only valid ones
 * @param {Array} tokens - Array of tokens to filter
 * @returns {Array} Array of valid tokens
 */
export function filterValidPushTokens(tokens) {
	if (!Array.isArray(tokens)) {
		return [];
	}
	
	return tokens.filter(isValidPushToken);
}

/**
 * Show notification permission status to user
 * @returns {Promise<string>} Current permission status
 */
export async function getNotificationPermissionStatus() {
	try {
		const { status } = await Notifications.getPermissionsAsync();
		return status;
	} catch (error) {
		console.warn('[notificationHelpers] Error getting permission status:', error);
		return 'unknown';
	}
}

/**
 * Check if we should request notification permissions
 * Returns true only if status is undetermined (user hasn't been asked yet)
 * @returns {Promise<boolean>} True if we should request permissions
 */
export async function shouldRequestPermissions() {
	try {
		const { status } = await Notifications.getPermissionsAsync();
		return status === 'undetermined';
	} catch (_error) {
		return false;
	}
}
