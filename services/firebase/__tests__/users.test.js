/**
 * Firebase Users Service Tests
 * Phase 6: Week 7 Implementation Plan
 */

import {
    blockUser,
    getBlockedUsers,
    getUserById,
    incrementCompletedTrips,
    isUserBlocked,
    unblockUser,
    updateUserProfile,
    updateUserRating,
} from '../users';

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
	doc: jest.fn(() => 'mockDocRef'),
	getDoc: jest.fn(),
	updateDoc: jest.fn(),
	arrayUnion: jest.fn((val) => ({ arrayUnion: val })),
	arrayRemove: jest.fn((val) => ({ arrayRemove: val })),
	serverTimestamp: jest.fn(() => 'mockTimestamp'),
}));

jest.mock('../config', () => ({
	db: {},
}));

const { getDoc, updateDoc } = require('firebase/firestore');

describe('Firebase Users Service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getUserById', () => {
		it('throws error when userId is missing', async () => {
			await expect(getUserById(null)).rejects.toThrow('userId is required');
			await expect(getUserById('')).rejects.toThrow('userId is required');
		});

		it('returns null when user does not exist', async () => {
			getDoc.mockResolvedValue({ exists: () => false });
			const result = await getUserById('nonexistent-user');
			expect(result).toBeNull();
		});

		it('returns user data with id when user exists', async () => {
			const mockUserData = {
				name: 'Test User',
				email: 'test@example.com',
				averageRating: 4.5,
			};
			getDoc.mockResolvedValue({
				exists: () => true,
				id: 'user-123',
				data: () => mockUserData,
			});

			const result = await getUserById('user-123');
			expect(result).toEqual({
				id: 'user-123',
				...mockUserData,
			});
		});
	});

	describe('updateUserProfile', () => {
		it('throws error when userId is missing', async () => {
			await expect(updateUserProfile(null, { name: 'Test' }))
				.rejects.toThrow('userId and updates are required');
		});

		it('throws error when updates is missing', async () => {
			await expect(updateUserProfile('user-123', null))
				.rejects.toThrow('userId and updates are required');
		});

		it('updates user profile with timestamp', async () => {
			updateDoc.mockResolvedValue();
			
			await updateUserProfile('user-123', { name: 'New Name' });
			
			expect(updateDoc).toHaveBeenCalledWith('mockDocRef', {
				name: 'New Name',
				updatedAt: 'mockTimestamp',
			});
		});
	});

	describe('blockUser', () => {
		it('throws error when userId is missing', async () => {
			await expect(blockUser(null, 'blocked-user'))
				.rejects.toThrow('userId and blockedUserId are required');
		});

		it('throws error when blockedUserId is missing', async () => {
			await expect(blockUser('user-123', null))
				.rejects.toThrow('userId and blockedUserId are required');
		});

		it('throws error when trying to block self', async () => {
			await expect(blockUser('user-123', 'user-123'))
				.rejects.toThrow('Cannot block yourself');
		});

		it('successfully blocks a user', async () => {
			updateDoc.mockResolvedValue();
			
			await blockUser('user-123', 'blocked-user');
			
			expect(updateDoc).toHaveBeenCalledWith('mockDocRef', expect.objectContaining({
				blockedUsers: { arrayUnion: 'blocked-user' },
				updatedAt: 'mockTimestamp',
			}));
		});
	});

	describe('unblockUser', () => {
		it('throws error when userId is missing', async () => {
			await expect(unblockUser(null, 'blocked-user'))
				.rejects.toThrow('userId and blockedUserId are required');
		});

		it('throws error when blockedUserId is missing', async () => {
			await expect(unblockUser('user-123', null))
				.rejects.toThrow('userId and blockedUserId are required');
		});

		it('successfully unblocks a user', async () => {
			updateDoc.mockResolvedValue();
			
			await unblockUser('user-123', 'blocked-user');
			
			expect(updateDoc).toHaveBeenCalledWith('mockDocRef', expect.objectContaining({
				blockedUsers: { arrayRemove: 'blocked-user' },
				updatedAt: 'mockTimestamp',
			}));
		});
	});

	describe('getBlockedUsers', () => {
		it('throws error when userId is missing', async () => {
			await expect(getBlockedUsers(null)).rejects.toThrow('userId is required');
		});

		it('returns empty array when user does not exist', async () => {
			getDoc.mockResolvedValue({ exists: () => false });
			
			const result = await getBlockedUsers('user-123');
			expect(result).toEqual([]);
		});

		it('returns empty array when blockedUsers is undefined', async () => {
			getDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({}),
			});
			
			const result = await getBlockedUsers('user-123');
			expect(result).toEqual([]);
		});

		it('returns blocked users array', async () => {
			getDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({ blockedUsers: ['blocked-1', 'blocked-2'] }),
			});
			
			const result = await getBlockedUsers('user-123');
			expect(result).toEqual(['blocked-1', 'blocked-2']);
		});
	});

	describe('isUserBlocked', () => {
		it('returns false when userId is missing', async () => {
			const result = await isUserBlocked(null, 'target-user');
			expect(result).toBe(false);
		});

		it('returns false when targetUserId is missing', async () => {
			const result = await isUserBlocked('user-123', null);
			expect(result).toBe(false);
		});

		it('returns true when user is blocked', async () => {
			getDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({ blockedUsers: ['target-user'] }),
			});
			
			const result = await isUserBlocked('user-123', 'target-user');
			expect(result).toBe(true);
		});

		it('returns false when user is not blocked', async () => {
			getDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({ blockedUsers: ['other-user'] }),
			});
			
			const result = await isUserBlocked('user-123', 'target-user');
			expect(result).toBe(false);
		});
	});

	describe('updateUserRating', () => {
		it('throws error when userId is missing', async () => {
			await expect(updateUserRating(null, 4.5, 10))
				.rejects.toThrow('userId is required');
		});

		it('updates user rating successfully', async () => {
			updateDoc.mockResolvedValue();
			
			await updateUserRating('user-123', 4.5, 10);
			
			expect(updateDoc).toHaveBeenCalledWith('mockDocRef', {
				averageRating: 4.5,
				totalRatings: 10,
				updatedAt: 'mockTimestamp',
			});
		});
	});

	describe('incrementCompletedTrips', () => {
		it('throws error when userId is missing', async () => {
			await expect(incrementCompletedTrips(null))
				.rejects.toThrow('userId is required');
		});

		it('throws error when user not found', async () => {
			getDoc.mockResolvedValue({ exists: () => false });
			
			await expect(incrementCompletedTrips('nonexistent-user'))
				.rejects.toThrow('User not found');
		});

		it('increments completed trips from 0', async () => {
			getDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({}),
			});
			updateDoc.mockResolvedValue();
			
			await incrementCompletedTrips('user-123');
			
			expect(updateDoc).toHaveBeenCalledWith('mockDocRef', {
				totalTripsCompleted: 1,
				updatedAt: 'mockTimestamp',
			});
		});

		it('increments completed trips from existing count', async () => {
			getDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({ totalTripsCompleted: 5 }),
			});
			updateDoc.mockResolvedValue();
			
			await incrementCompletedTrips('user-123');
			
			expect(updateDoc).toHaveBeenCalledWith('mockDocRef', {
				totalTripsCompleted: 6,
				updatedAt: 'mockTimestamp',
			});
		});
	});
});
