/**
 * Safety Helpers Utility
 * Helper functions for safety features (blocking, reporting)
 */

import { Alert } from 'react-native';

/**
 * Show block confirmation dialog
 * @param {string} userName - Name of the user being blocked
 * @param {Function} onConfirm - Callback when user confirms block
 * @param {Function} onCancel - Optional callback when user cancels
 */
export function showBlockConfirmation(userName, onConfirm, onCancel = () => {}) {
	const displayName = userName || 'this user';
	
	Alert.alert(
		'Block User',
		`Are you sure you want to block ${displayName}?\n\nConsequences:\n• You won't see their rides or trip posts\n• They won't see your rides or trip posts\n• Existing conversations will be hidden\n• You can unblock them later from settings`,
		[
			{
				text: 'Cancel',
				style: 'cancel',
				onPress: onCancel,
			},
			{
				text: 'Block',
				style: 'destructive',
				onPress: onConfirm,
			},
		],
		{ cancelable: true }
	);
}

/**
 * Show unblock confirmation dialog
 * @param {string} userName - Name of the user being unblocked
 * @param {Function} onConfirm - Callback when user confirms unblock
 * @param {Function} onCancel - Optional callback when user cancels
 */
export function showUnblockConfirmation(userName, onConfirm, onCancel = () => {}) {
	const displayName = userName || 'this user';
	
	Alert.alert(
		'Unblock User',
		`Are you sure you want to unblock ${displayName}?\n\nThey will be able to:\n• See your rides and trip posts\n• Send you messages\n• Request to join your trips`,
		[
			{
				text: 'Cancel',
				style: 'cancel',
				onPress: onCancel,
			},
			{
				text: 'Unblock',
				style: 'default',
				onPress: onConfirm,
			},
		],
		{ cancelable: true }
	);
}

/**
 * Show report success message
 * @param {Function} onDismiss - Optional callback when alert is dismissed
 */
export function showReportSuccessAlert(onDismiss = () => {}) {
	Alert.alert(
		'Report Submitted',
		'Thank you for your report. Our team will review it and take appropriate action.',
		[
			{
				text: 'OK',
				onPress: onDismiss,
			},
		]
	);
}

/**
 * Show block success message
 * @param {string} userName - Name of the blocked user
 * @param {Function} onDismiss - Optional callback when alert is dismissed
 */
export function showBlockSuccessAlert(userName, onDismiss = () => {}) {
	const displayName = userName || 'User';
	
	Alert.alert(
		'User Blocked',
		`${displayName} has been blocked. You will no longer see their content.`,
		[
			{
				text: 'OK',
				onPress: onDismiss,
			},
		]
	);
}

/**
 * Show unblock success message
 * @param {string} userName - Name of the unblocked user
 * @param {Function} onDismiss - Optional callback when alert is dismissed
 */
export function showUnblockSuccessAlert(userName, onDismiss = () => {}) {
	const displayName = userName || 'User';
	
	Alert.alert(
		'User Unblocked',
		`${displayName} has been unblocked.`,
		[
			{
				text: 'OK',
				onPress: onDismiss,
			},
		]
	);
}

/**
 * Show error alert for safety operations
 * @param {string} operation - The operation that failed (e.g., 'block', 'report')
 * @param {string} errorMessage - The error message to display
 * @param {Function} onRetry - Optional retry callback
 */
export function showSafetyErrorAlert(operation, errorMessage, onRetry = null) {
	const buttons = [
		{
			text: 'OK',
			style: 'cancel',
		},
	];

	if (onRetry) {
		buttons.push({
			text: 'Retry',
			onPress: onRetry,
		});
	}

	Alert.alert(
		`Failed to ${operation}`,
		errorMessage || `Something went wrong. Please try again.`,
		buttons
	);
}
