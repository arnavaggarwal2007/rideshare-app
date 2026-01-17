/**
 * Notification Helpers Tests
 * Phase 11: Week 7 Implementation Plan
 */

import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';
import {
    areNotificationsEnabled,
    filterValidPushTokens,
    getNotificationPermissionStatus,
    handlePushNotificationErrors,
    isValidPushToken,
    openNotificationSettings,
    removeInvalidPushToken,
    requestNotificationPermissions,
    shouldRequestPermissions,
    showEnableNotificationsPrompt,
} from '../notificationHelpers';

// Mock dependencies
jest.mock('react-native', () => ({
	Alert: {
		alert: jest.fn(),
	},
	Linking: {
		openURL: jest.fn(),
		openSettings: jest.fn(),
	},
	Platform: {
		OS: 'ios',
	},
}));

jest.mock('expo-notifications', () => ({
	getPermissionsAsync: jest.fn(),
	requestPermissionsAsync: jest.fn(),
}));

jest.mock('../../services/firebase/config', () => ({
	db: {},
}));

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(() => 'mockDocRef'),
	updateDoc: jest.fn(),
	getDoc: jest.fn(),
	arrayRemove: jest.fn((val) => ({ arrayRemove: val })),
}));

describe('Notification Helpers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('areNotificationsEnabled', () => {
		it('returns true when permissions are granted', async () => {
			Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
			const result = await areNotificationsEnabled();
			expect(result).toBe(true);
		});

		it('returns false when permissions are denied', async () => {
			Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
			const result = await areNotificationsEnabled();
			expect(result).toBe(false);
		});

		it('returns false when permissions are undetermined', async () => {
			Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
			const result = await areNotificationsEnabled();
			expect(result).toBe(false);
		});

		it('returns false on error', async () => {
			Notifications.getPermissionsAsync.mockRejectedValue(new Error('Test error'));
			const result = await areNotificationsEnabled();
			expect(result).toBe(false);
		});
	});

	describe('showEnableNotificationsPrompt', () => {
		it('shows alert with correct title and message', () => {
			showEnableNotificationsPrompt();
			expect(Alert.alert).toHaveBeenCalledWith(
				'Notifications Disabled',
				expect.stringContaining('Enable notifications'),
				expect.any(Array)
			);
		});

		it('provides Not Now and Open Settings buttons', () => {
			showEnableNotificationsPrompt();
			const buttons = Alert.alert.mock.calls[0][2];
			expect(buttons).toHaveLength(2);
			expect(buttons[0].text).toBe('Not Now');
			expect(buttons[1].text).toBe('Open Settings');
		});

		it('calls onCancel callback when Not Now is pressed', () => {
			const onCancel = jest.fn();
			showEnableNotificationsPrompt(onCancel);
			const buttons = Alert.alert.mock.calls[0][2];
			buttons[0].onPress();
			expect(onCancel).toHaveBeenCalled();
		});

		it('Not Now button has cancel style', () => {
			showEnableNotificationsPrompt();
			const buttons = Alert.alert.mock.calls[0][2];
			expect(buttons[0].style).toBe('cancel');
		});
	});

	describe('openNotificationSettings', () => {
		it('opens app-settings URL on iOS', async () => {
			Platform.OS = 'ios';
			Linking.openURL.mockResolvedValue(true);
			await openNotificationSettings();
			expect(Linking.openURL).toHaveBeenCalledWith('app-settings:');
		});

		it('opens settings on Android', async () => {
			Platform.OS = 'android';
			Linking.openSettings.mockResolvedValue(true);
			await openNotificationSettings();
			expect(Linking.openSettings).toHaveBeenCalled();
		});

		it('shows error alert when opening settings fails', async () => {
			Platform.OS = 'ios';
			Linking.openURL.mockRejectedValue(new Error('Cannot open'));
			await openNotificationSettings();
			expect(Alert.alert).toHaveBeenCalledWith(
				'Unable to Open Settings',
				expect.any(String)
			);
		});
	});

	describe('requestNotificationPermissions', () => {
		it('returns true when already granted', async () => {
			Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
			const result = await requestNotificationPermissions();
			expect(result).toBe(true);
			expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
		});

		it('requests permissions when not granted', async () => {
			Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
			Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
			const result = await requestNotificationPermissions();
			expect(result).toBe(true);
			expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
		});

		it('shows prompt when request is denied', async () => {
			Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
			Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
			const result = await requestNotificationPermissions();
			expect(result).toBe(false);
			expect(Alert.alert).toHaveBeenCalled();
		});

		it('returns false on error', async () => {
			Notifications.getPermissionsAsync.mockRejectedValue(new Error('Error'));
			const result = await requestNotificationPermissions();
			expect(result).toBe(false);
		});
	});

	describe('isValidPushToken', () => {
		it('returns true for valid Expo push token', () => {
			expect(isValidPushToken('ExponentPushToken[abc123]')).toBe(true);
		});

		it('returns false for null', () => {
			expect(isValidPushToken(null)).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(isValidPushToken(undefined)).toBe(false);
		});

		it('returns false for non-string', () => {
			expect(isValidPushToken(12345)).toBe(false);
		});

		it('returns false for empty string', () => {
			expect(isValidPushToken('')).toBe(false);
		});

		it('returns false for invalid format', () => {
			expect(isValidPushToken('InvalidToken')).toBe(false);
		});

		it('returns false for token missing closing bracket', () => {
			expect(isValidPushToken('ExponentPushToken[abc123')).toBe(false);
		});
	});

	describe('filterValidPushTokens', () => {
		it('filters valid tokens from array', () => {
			const tokens = [
				'ExponentPushToken[valid1]',
				'invalid',
				'ExponentPushToken[valid2]',
				null,
				'',
			];
			const result = filterValidPushTokens(tokens);
			expect(result).toEqual([
				'ExponentPushToken[valid1]',
				'ExponentPushToken[valid2]',
			]);
		});

		it('returns empty array for null input', () => {
			expect(filterValidPushTokens(null)).toEqual([]);
		});

		it('returns empty array for non-array input', () => {
			expect(filterValidPushTokens('string')).toEqual([]);
		});

		it('returns empty array when no valid tokens', () => {
			expect(filterValidPushTokens(['invalid', 'also-invalid'])).toEqual([]);
		});
	});

	describe('getNotificationPermissionStatus', () => {
		it('returns granted status', async () => {
			Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
			const result = await getNotificationPermissionStatus();
			expect(result).toBe('granted');
		});

		it('returns denied status', async () => {
			Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
			const result = await getNotificationPermissionStatus();
			expect(result).toBe('denied');
		});

		it('returns unknown on error', async () => {
			Notifications.getPermissionsAsync.mockRejectedValue(new Error('Error'));
			const result = await getNotificationPermissionStatus();
			expect(result).toBe('unknown');
		});
	});

	describe('shouldRequestPermissions', () => {
		it('returns true when status is undetermined', async () => {
			Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
			const result = await shouldRequestPermissions();
			expect(result).toBe(true);
		});

		it('returns false when status is granted', async () => {
			Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
			const result = await shouldRequestPermissions();
			expect(result).toBe(false);
		});

		it('returns false when status is denied', async () => {
			Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
			const result = await shouldRequestPermissions();
			expect(result).toBe(false);
		});

		it('returns false on error', async () => {
			Notifications.getPermissionsAsync.mockRejectedValue(new Error('Error'));
			const result = await shouldRequestPermissions();
			expect(result).toBe(false);
		});
	});

	describe('removeInvalidPushToken', () => {
		const { getDoc, updateDoc } = require('firebase/firestore');

		it('returns false when userId is missing', async () => {
			const result = await removeInvalidPushToken(null, 'token');
			expect(result).toBe(false);
		});

		it('returns false when token is missing', async () => {
			const result = await removeInvalidPushToken('userId', null);
			expect(result).toBe(false);
		});

		it('returns false when document does not exist', async () => {
			getDoc.mockResolvedValue({ exists: () => false });
			const result = await removeInvalidPushToken('userId', 'ExponentPushToken[test]');
			expect(result).toBe(false);
		});

		it('returns false when token not in array', async () => {
			getDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({ tokens: ['ExponentPushToken[other]'] }),
			});
			const result = await removeInvalidPushToken('userId', 'ExponentPushToken[test]');
			expect(result).toBe(false);
		});

		it('removes token and returns true when found', async () => {
			getDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({ tokens: ['ExponentPushToken[test]', 'ExponentPushToken[other]'] }),
			});
			updateDoc.mockResolvedValue();
			
			const result = await removeInvalidPushToken('userId', 'ExponentPushToken[test]');
			expect(result).toBe(true);
			expect(updateDoc).toHaveBeenCalled();
		});

		it('returns false on error', async () => {
			getDoc.mockRejectedValue(new Error('Firestore error'));
			const result = await removeInvalidPushToken('userId', 'ExponentPushToken[test]');
			expect(result).toBe(false);
		});
	});

	describe('handlePushNotificationErrors', () => {
		const { getDoc, updateDoc } = require('firebase/firestore');

		beforeEach(() => {
			getDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({ tokens: ['ExponentPushToken[test]'] }),
			});
			updateDoc.mockResolvedValue();
		});

		it('returns empty array for null response', async () => {
			const result = await handlePushNotificationErrors(null, [], 'userId');
			expect(result).toEqual([]);
		});

		it('returns empty array for response without data', async () => {
			const result = await handlePushNotificationErrors({}, [], 'userId');
			expect(result).toEqual([]);
		});

		it('removes token for DeviceNotRegistered error', async () => {
			const response = {
				data: [{
					status: 'error',
					details: { error: 'DeviceNotRegistered' },
				}],
			};
			const tokens = ['ExponentPushToken[test]'];
			
			const result = await handlePushNotificationErrors(response, tokens, 'userId');
			expect(result).toContain('ExponentPushToken[test]');
		});

		it('removes token for InvalidCredentials error', async () => {
			const response = {
				data: [{
					status: 'error',
					details: { error: 'InvalidCredentials' },
				}],
			};
			const tokens = ['ExponentPushToken[test]'];
			
			const result = await handlePushNotificationErrors(response, tokens, 'userId');
			expect(result).toContain('ExponentPushToken[test]');
		});

		it('removes token for invalid token message', async () => {
			const response = {
				data: [{
					status: 'error',
					message: 'Token is not a valid Expo push token',
				}],
			};
			const tokens = ['ExponentPushToken[test]'];
			
			const result = await handlePushNotificationErrors(response, tokens, 'userId');
			expect(result).toContain('ExponentPushToken[test]');
		});

		it('does not remove token for other errors', async () => {
			const response = {
				data: [{
					status: 'error',
					details: { error: 'SomeOtherError' },
				}],
			};
			const tokens = ['ExponentPushToken[test]'];
			
			const result = await handlePushNotificationErrors(response, tokens, 'userId');
			expect(result).toEqual([]);
		});

		it('does not remove token for success status', async () => {
			const response = {
				data: [{
					status: 'ok',
				}],
			};
			const tokens = ['ExponentPushToken[test]'];
			
			const result = await handlePushNotificationErrors(response, tokens, 'userId');
			expect(result).toEqual([]);
		});

		it('handles single object response (not array)', async () => {
			const response = {
				data: {
					status: 'error',
					details: { error: 'DeviceNotRegistered' },
				},
			};
			const tokens = ['ExponentPushToken[test]'];
			
			const result = await handlePushNotificationErrors(response, tokens, 'userId');
			expect(result).toContain('ExponentPushToken[test]');
		});
	});
});
