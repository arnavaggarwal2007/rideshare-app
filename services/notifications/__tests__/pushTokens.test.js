/**
 * Tests for services/notifications/pushTokens.js
 */

// Mock Firebase
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
	doc: jest.fn((db, collection, docId) => ({ path: `${collection}/${docId}` })),
	getDoc: (...args) => mockGetDoc(...args),
	setDoc: (...args) => mockSetDoc(...args),
	serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
}));

jest.mock('../../firebase/config', () => ({
	db: {},
}));

describe('pushTokens service', () => {
	let savePushToken, getUserPushTokens;

	beforeEach(() => {
		jest.clearAllMocks();
		mockGetDoc.mockReset();
		mockSetDoc.mockReset();
		
		// Re-import module
		jest.resetModules();
		const mod = require('../pushTokens');
		savePushToken = mod.savePushToken;
		getUserPushTokens = mod.getUserPushTokens;
	});

	describe('savePushToken', () => {
		it('should throw error for missing userId', async () => {
			await expect(savePushToken(null, 'token123')).rejects.toThrow('userId and token are required');
		});

		it('should throw error for missing token', async () => {
			await expect(savePushToken('user1', null)).rejects.toThrow('userId and token are required');
		});

		it('should save new token when no existing tokens', async () => {
			mockGetDoc.mockResolvedValueOnce({
				exists: () => false,
				data: () => null,
			});
			mockSetDoc.mockResolvedValueOnce();

			await savePushToken('user1', 'ExponentPushToken[new]', {
				platform: 'ios',
				osVersion: '17.0',
			});

			expect(mockSetDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					tokens: ['ExponentPushToken[new]'],
					updatedAt: 'SERVER_TIMESTAMP',
					latest: expect.objectContaining({
						token: 'ExponentPushToken[new]',
						platform: 'ios',
						osVersion: '17.0',
					}),
				}),
				{ merge: true }
			);
		});

		it('should append token to existing tokens', async () => {
			mockGetDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ tokens: ['ExponentPushToken[existing]'] }),
			});
			mockSetDoc.mockResolvedValueOnce();

			await savePushToken('user1', 'ExponentPushToken[new]');

			expect(mockSetDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					tokens: ['ExponentPushToken[existing]', 'ExponentPushToken[new]'],
				}),
				{ merge: true }
			);
		});

		it('should deduplicate tokens', async () => {
			mockGetDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ tokens: ['ExponentPushToken[token1]', 'ExponentPushToken[token1]'] }),
			});
			mockSetDoc.mockResolvedValueOnce();

			await savePushToken('user1', 'ExponentPushToken[token1]');

			expect(mockSetDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					tokens: ['ExponentPushToken[token1]'],
				}),
				{ merge: true }
			);
		});

		it('should filter out non-string tokens', async () => {
			mockGetDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ tokens: ['valid', null, undefined, 123, 'another'] }),
			});
			mockSetDoc.mockResolvedValueOnce();

			await savePushToken('user1', 'ExponentPushToken[new]');

			expect(mockSetDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					tokens: ['valid', 'another', 'ExponentPushToken[new]'],
				}),
				{ merge: true }
			);
		});

		it('should use default metadata values', async () => {
			mockGetDoc.mockResolvedValueOnce({ exists: () => false });
			mockSetDoc.mockResolvedValueOnce();

			await savePushToken('user1', 'ExponentPushToken[new]');

			expect(mockSetDoc).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					latest: expect.objectContaining({
						platform: 'unknown',
						osVersion: 'unknown',
						deviceName: 'unknown',
						appId: 'unknown',
						appVersion: 'unknown',
					}),
				}),
				{ merge: true }
			);
		});
	});

	describe('getUserPushTokens', () => {
		it('should throw error for missing userId', async () => {
			await expect(getUserPushTokens(null)).rejects.toThrow('userId is required');
		});

		it('should return empty array when document does not exist', async () => {
			mockGetDoc.mockResolvedValueOnce({
				exists: () => false,
			});

			const tokens = await getUserPushTokens('user1');

			expect(tokens).toEqual([]);
		});

		it('should return empty array when tokens field is not an array', async () => {
			mockGetDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({ tokens: 'not-an-array' }),
			});

			const tokens = await getUserPushTokens('user1');

			expect(tokens).toEqual([]);
		});

		it('should return empty array when tokens field is missing', async () => {
			mockGetDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({}),
			});

			const tokens = await getUserPushTokens('user1');

			expect(tokens).toEqual([]);
		});

		it('should return filtered string tokens', async () => {
			mockGetDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					tokens: ['token1', 'token2', null, undefined, 123, 'token3'],
				}),
			});

			const tokens = await getUserPushTokens('user1');

			expect(tokens).toEqual(['token1', 'token2', 'token3']);
		});
	});
});
