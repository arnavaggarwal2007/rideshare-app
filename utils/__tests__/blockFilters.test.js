/**
 * Block Filter Utilities Tests
 * Phase 7: Week 7 Implementation Plan
 */

import {
    filterByBlockedUsers,
    getOtherParticipantId,
    isUserBlocked,
    sortChatsByBlockedStatus,
} from '../blockFilters';

describe('Block Filter Utilities', () => {
	describe('filterByBlockedUsers', () => {
		const sampleRides = [
			{ id: 'ride1', driverId: 'user1', destination: 'NYC' },
			{ id: 'ride2', driverId: 'user2', destination: 'LA' },
			{ id: 'ride3', driverId: 'user3', destination: 'Chicago' },
			{ id: 'ride4', driverId: 'user1', destination: 'Boston' },
		];

		it('returns all items when blockedUsers is empty', () => {
			const result = filterByBlockedUsers(sampleRides, []);
			expect(result).toHaveLength(4);
		});

		it('returns all items when blockedUsers is null', () => {
			const result = filterByBlockedUsers(sampleRides, null);
			expect(result).toHaveLength(4);
		});

		it('returns all items when blockedUsers is undefined', () => {
			const result = filterByBlockedUsers(sampleRides, undefined);
			expect(result).toHaveLength(4);
		});

		it('filters out items from blocked users', () => {
			const result = filterByBlockedUsers(sampleRides, ['user1']);
			expect(result).toHaveLength(2);
			expect(result.map(r => r.driverId)).toEqual(['user2', 'user3']);
		});

		it('filters out multiple blocked users', () => {
			const result = filterByBlockedUsers(sampleRides, ['user1', 'user3']);
			expect(result).toHaveLength(1);
			expect(result[0].driverId).toBe('user2');
		});

		it('returns empty array when all users are blocked', () => {
			const result = filterByBlockedUsers(sampleRides, ['user1', 'user2', 'user3']);
			expect(result).toHaveLength(0);
		});

		it('returns empty array when items is null', () => {
			const result = filterByBlockedUsers(null, ['user1']);
			expect(result).toEqual([]);
		});

		it('returns empty array when items is undefined', () => {
			const result = filterByBlockedUsers(undefined, ['user1']);
			expect(result).toEqual([]);
		});

		it('returns empty array when items is not an array', () => {
			const result = filterByBlockedUsers('not an array', ['user1']);
			expect(result).toEqual([]);
		});

		it('uses custom userIdField', () => {
			const items = [
				{ id: '1', ownerId: 'user1' },
				{ id: '2', ownerId: 'user2' },
			];
			const result = filterByBlockedUsers(items, ['user1'], 'ownerId');
			expect(result).toHaveLength(1);
			expect(result[0].ownerId).toBe('user2');
		});
	});

	describe('sortChatsByBlockedStatus', () => {
		const sampleChats = [
			{ id: 'chat1', participants: ['currentUser', 'user1'] },
			{ id: 'chat2', participants: ['currentUser', 'user2'] },
			{ id: 'chat3', participants: ['currentUser', 'user3'] },
		];

		it('returns chats unchanged when blockedUsers is empty', () => {
			const result = sortChatsByBlockedStatus(sampleChats, [], 'currentUser');
			expect(result.map(c => c.id)).toEqual(['chat1', 'chat2', 'chat3']);
		});

		it('returns chats unchanged when blockedUsers is null', () => {
			const result = sortChatsByBlockedStatus(sampleChats, null, 'currentUser');
			expect(result.map(c => c.id)).toEqual(['chat1', 'chat2', 'chat3']);
		});

		it('returns chats unchanged when currentUserId is not provided', () => {
			const result = sortChatsByBlockedStatus(sampleChats, ['user1'], null);
			expect(result.map(c => c.id)).toEqual(['chat1', 'chat2', 'chat3']);
		});

		it('moves blocked user chats to the end', () => {
			const result = sortChatsByBlockedStatus(sampleChats, ['user1'], 'currentUser');
			expect(result[0].id).toBe('chat2');
			expect(result[1].id).toBe('chat3');
			expect(result[2].id).toBe('chat1');
		});

		it('moves multiple blocked user chats to the end', () => {
			const result = sortChatsByBlockedStatus(sampleChats, ['user1', 'user2'], 'currentUser');
			expect(result[0].id).toBe('chat3');
			// Blocked chats maintain relative order
		});

		it('returns empty array when chats is null', () => {
			const result = sortChatsByBlockedStatus(null, ['user1'], 'currentUser');
			expect(result).toEqual([]);
		});

		it('returns empty array when chats is not an array', () => {
			const result = sortChatsByBlockedStatus('not an array', ['user1'], 'currentUser');
			expect(result).toEqual([]);
		});

		it('does not mutate original array', () => {
			const original = [...sampleChats];
			sortChatsByBlockedStatus(sampleChats, ['user1'], 'currentUser');
			expect(sampleChats).toEqual(original);
		});

		it('handles chats without participants array', () => {
			const chatsWithMissing = [
				{ id: 'chat1' },
				{ id: 'chat2', participants: ['currentUser', 'user2'] },
			];
			const result = sortChatsByBlockedStatus(chatsWithMissing, ['user1'], 'currentUser');
			expect(result).toHaveLength(2);
		});
	});

	describe('isUserBlocked', () => {
		it('returns true when user is in blocked list', () => {
			expect(isUserBlocked('user1', ['user1', 'user2'])).toBe(true);
		});

		it('returns false when user is not in blocked list', () => {
			expect(isUserBlocked('user3', ['user1', 'user2'])).toBe(false);
		});

		it('returns false when blockedUsers is empty', () => {
			expect(isUserBlocked('user1', [])).toBe(false);
		});

		it('returns false when blockedUsers is null', () => {
			expect(isUserBlocked('user1', null)).toBe(false);
		});

		it('returns false when blockedUsers is undefined', () => {
			expect(isUserBlocked('user1', undefined)).toBe(false);
		});

		it('returns false when userId is null', () => {
			expect(isUserBlocked(null, ['user1'])).toBe(false);
		});

		it('returns false when userId is undefined', () => {
			expect(isUserBlocked(undefined, ['user1'])).toBe(false);
		});

		it('returns false when both parameters are invalid', () => {
			expect(isUserBlocked(null, null)).toBe(false);
		});
	});

	describe('getOtherParticipantId', () => {
		it('returns other participant ID from two-person chat', () => {
			const chat = { participants: ['currentUser', 'otherUser'] };
			expect(getOtherParticipantId(chat, 'currentUser')).toBe('otherUser');
		});

		it('returns first other participant in group chat', () => {
			const chat = { participants: ['currentUser', 'user1', 'user2'] };
			expect(getOtherParticipantId(chat, 'currentUser')).toBe('user1');
		});

		it('returns null when chat is null', () => {
			expect(getOtherParticipantId(null, 'currentUser')).toBeNull();
		});

		it('returns null when chat is undefined', () => {
			expect(getOtherParticipantId(undefined, 'currentUser')).toBeNull();
		});

		it('returns null when participants is missing', () => {
			expect(getOtherParticipantId({}, 'currentUser')).toBeNull();
		});

		it('returns null when participants is not an array', () => {
			const chat = { participants: 'not an array' };
			expect(getOtherParticipantId(chat, 'currentUser')).toBeNull();
		});

		it('returns null when currentUserId is not provided', () => {
			const chat = { participants: ['user1', 'user2'] };
			expect(getOtherParticipantId(chat, null)).toBeNull();
		});

		it('returns null when only current user is participant', () => {
			const chat = { participants: ['currentUser'] };
			expect(getOtherParticipantId(chat, 'currentUser')).toBeNull();
		});

		it('returns first participant when current user not in list', () => {
			const chat = { participants: ['user1', 'user2'] };
			expect(getOtherParticipantId(chat, 'currentUser')).toBe('user1');
		});
	});
});
