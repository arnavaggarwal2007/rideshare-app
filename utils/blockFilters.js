/**
 * Block Filter Utilities
 * Helper functions for filtering content by blocked users
 */

/**
 * Filter items by removing those from blocked users
 * @param {Array} items - Array of items with a userId field
 * @param {Array} blockedUsers - Array of blocked user IDs
 * @param {string} userIdField - The field name containing the user ID (default: 'driverId')
 * @returns {Array} - Filtered array
 */
export function filterByBlockedUsers(items, blockedUsers, userIdField = 'driverId') {
	if (!items || !Array.isArray(items)) {
		return [];
	}
	
	if (!blockedUsers || !Array.isArray(blockedUsers) || blockedUsers.length === 0) {
		return items;
	}
	
	return items.filter(item => !blockedUsers.includes(item[userIdField]));
}

/**
 * Sort chats by blocked status (non-blocked first)
 * @param {Array} chats - Array of chat objects
 * @param {Array} blockedUsers - Array of blocked user IDs
 * @param {string} currentUserId - Current user's ID
 * @returns {Array} - Sorted array with non-blocked chats first
 */
export function sortChatsByBlockedStatus(chats, blockedUsers, currentUserId) {
	if (!chats || !Array.isArray(chats)) {
		return [];
	}
	
	if (!currentUserId) {
		return chats;
	}
	
	if (!blockedUsers || !Array.isArray(blockedUsers) || blockedUsers.length === 0) {
		return chats;
	}
	
	return [...chats].sort((a, b) => {
		const aOtherParticipant = a.participants?.find(p => p !== currentUserId);
		const bOtherParticipant = b.participants?.find(p => p !== currentUserId);
		const aIsBlocked = blockedUsers.includes(aOtherParticipant);
		const bIsBlocked = blockedUsers.includes(bOtherParticipant);
		
		// Non-blocked chats come first
		if (aIsBlocked && !bIsBlocked) return 1;
		if (!aIsBlocked && bIsBlocked) return -1;
		return 0;
	});
}

/**
 * Check if a user is in the blocked list
 * @param {string} userId - User ID to check
 * @param {Array} blockedUsers - Array of blocked user IDs
 * @returns {boolean} - True if user is blocked
 */
export function isUserBlocked(userId, blockedUsers) {
	if (!userId || !blockedUsers || !Array.isArray(blockedUsers)) {
		return false;
	}
	
	return blockedUsers.includes(userId);
}

/**
 * Get the other participant ID from a chat
 * @param {Object} chat - Chat object with participants array
 * @param {string} currentUserId - Current user's ID
 * @returns {string|null} - Other participant's ID or null
 */
export function getOtherParticipantId(chat, currentUserId) {
	if (!chat?.participants || !Array.isArray(chat.participants) || !currentUserId) {
		return null;
	}
	
	return chat.participants.find(p => p !== currentUserId) || null;
}
