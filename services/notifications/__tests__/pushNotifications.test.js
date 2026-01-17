/**
 * Tests for services/notifications/pushNotifications.js
 */

// Mock expo modules
jest.mock('expo-application', () => ({
	applicationId: 'com.test.app',
	nativeApplicationVersion: '1.0.0',
}));

jest.mock('expo-constants', () => ({
	expoConfig: {
		extra: {
			eas: {
				projectId: 'test-project-id',
			},
		},
	},
	easConfig: {
		projectId: 'test-project-id',
	},
}));

const mockIsDevice = { value: true };
jest.mock('expo-device', () => ({
	get isDevice() { return mockIsDevice.value; },
	osVersion: '17.0',
	deviceName: 'Test Device',
}));

const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockGetExpoPushToken = jest.fn();
const mockSetChannel = jest.fn();

jest.mock('expo-notifications', () => ({
	setNotificationHandler: jest.fn(),
	getPermissionsAsync: () => mockGetPermissions(),
	requestPermissionsAsync: () => mockRequestPermissions(),
	getExpoPushTokenAsync: () => mockGetExpoPushToken(),
	setNotificationChannelAsync: () => mockSetChannel(),
	AndroidImportance: { MAX: 5 },
}));

const mockSavePushToken = jest.fn();
jest.mock('../pushTokens', () => ({
	savePushToken: (...args) => mockSavePushToken(...args),
}));

jest.mock('react-native', () => ({
	Platform: {
		OS: 'ios',
	},
}));

describe('pushNotifications service', () => {
	let registerForPushNotificationsAsync, sendPushNotificationAsync;

	beforeEach(() => {
		jest.clearAllMocks();
		global.fetch = jest.fn();
		mockIsDevice.value = true;
		
		// Default mock implementations
		mockGetPermissions.mockReset();
		mockRequestPermissions.mockReset();
		mockGetExpoPushToken.mockReset();
		mockSavePushToken.mockReset();
		mockSetChannel.mockReset();

		// Import the module
		const mod = require('../pushNotifications');
		registerForPushNotificationsAsync = mod.registerForPushNotificationsAsync;
		sendPushNotificationAsync = mod.sendPushNotificationAsync;
	});

	afterEach(() => {
		jest.resetModules();
	});

	describe('registerForPushNotificationsAsync', () => {
		it('should return null token on simulator/emulator', async () => {
			mockIsDevice.value = false;

			const result = await registerForPushNotificationsAsync('user1');

			expect(result).toEqual({ token: null, permission: false });
		});

		it('should return null when permission denied', async () => {
			mockGetPermissions.mockResolvedValue({ status: 'denied' });
			mockRequestPermissions.mockResolvedValue({ status: 'denied' });

			const result = await registerForPushNotificationsAsync('user1');

			expect(result).toEqual({ token: null, permission: false });
		});

		it('should return token when permission granted', async () => {
			mockGetPermissions.mockResolvedValue({ status: 'granted' });
			mockGetExpoPushToken.mockResolvedValue({
				data: 'ExponentPushToken[test123]',
			});
			mockSavePushToken.mockResolvedValue();

			const result = await registerForPushNotificationsAsync('user1');

			expect(result.token).toBe('ExponentPushToken[test123]');
			expect(result.permission).toBe(true);
		});

		it('should request permission when not granted', async () => {
			mockGetPermissions.mockResolvedValue({ status: 'undetermined' });
			mockRequestPermissions.mockResolvedValue({ status: 'granted' });
			mockGetExpoPushToken.mockResolvedValue({
				data: 'ExponentPushToken[test123]',
			});
			mockSavePushToken.mockResolvedValue();

			await registerForPushNotificationsAsync('user1');

			expect(mockRequestPermissions).toHaveBeenCalled();
		});

		it('should save token to database when userId provided', async () => {
			mockGetPermissions.mockResolvedValue({ status: 'granted' });
			mockGetExpoPushToken.mockResolvedValue({
				data: 'ExponentPushToken[test123]',
			});
			mockSavePushToken.mockResolvedValue();

			await registerForPushNotificationsAsync('user1');

			expect(mockSavePushToken).toHaveBeenCalledWith(
				'user1',
				'ExponentPushToken[test123]',
				expect.objectContaining({
					platform: 'ios',
				})
			);
		});

		it('should handle token save error gracefully', async () => {
			mockGetPermissions.mockResolvedValue({ status: 'granted' });
			mockGetExpoPushToken.mockResolvedValue({
				data: 'ExponentPushToken[test123]',
			});
			mockSavePushToken.mockRejectedValue(new Error('Database error'));

			// Should not throw
			const result = await registerForPushNotificationsAsync('user1');

			expect(result.token).toBe('ExponentPushToken[test123]');
			expect(result.permission).toBe(true);
		});
	});

	describe('sendPushNotificationAsync', () => {
		it('should return sent: 0 for empty tokens array', async () => {
			const result = await sendPushNotificationAsync([], { title: 'Test', body: 'Test' });

			expect(result).toEqual({ sent: 0 });
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('should filter invalid tokens', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			});

			await sendPushNotificationAsync(
				['invalid', 'ExponentPushToken[valid]', null, undefined, 123],
				{ title: 'Test', body: 'Test' }
			);

			const fetchCall = global.fetch.mock.calls[0];
			const body = JSON.parse(fetchCall[1].body);
			expect(body).toHaveLength(1);
			expect(body[0].to).toBe('ExponentPushToken[valid]');
		});

		it('should send notification to Expo push service', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			});

			const result = await sendPushNotificationAsync(
				['ExponentPushToken[test1]', 'ExponentPushToken[test2]'],
				{ title: 'Test Title', body: 'Test Body', data: { key: 'value' } }
			);

			expect(global.fetch).toHaveBeenCalledWith(
				'https://exp.host/--/api/v2/push/send',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				})
			);

			const fetchCall = global.fetch.mock.calls[0];
			const body = JSON.parse(fetchCall[1].body);
			expect(body).toHaveLength(2);
			expect(body[0]).toEqual({
				to: 'ExponentPushToken[test1]',
				sound: 'default',
				title: 'Test Title',
				body: 'Test Body',
				data: { key: 'value' },
			});

			expect(result).toEqual({ sent: 2 });
		});

		it('should handle API error response', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				text: () => Promise.resolve('Invalid request'),
			});

			const result = await sendPushNotificationAsync(
				['ExponentPushToken[test]'],
				{ title: 'Test', body: 'Test' }
			);

			expect(result).toEqual({ sent: 0, error: 'Invalid request' });
		});

		it('should handle network error', async () => {
			global.fetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await sendPushNotificationAsync(
				['ExponentPushToken[test]'],
				{ title: 'Test', body: 'Test' }
			);

			expect(result).toEqual({ sent: 0, error: 'Network error' });
		});
	});
});
