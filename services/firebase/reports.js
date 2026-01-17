/**
 * Firebase Reports Service
 * Handle user reports for safety and moderation
 */

import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from './config';

/**
 * Report reasons enum
 */
export const REPORT_REASONS = [
	'inappropriate_behavior',
	'safety_concern',
	'fake_profile',
	'harassment',
	'spam',
	'other'
];

/**
 * Human-readable labels for report reasons
 */
export const REPORT_REASON_LABELS = {
	inappropriate_behavior: 'Inappropriate Behavior',
	safety_concern: 'Safety Concern',
	fake_profile: 'Fake Profile',
	harassment: 'Harassment',
	spam: 'Spam',
	other: 'Other'
};

/**
 * Submit a report against a user
 * @param {string} reporterId - The user submitting the report
 * @param {string} reportedUserId - The user being reported
 * @param {string} reason - One of REPORT_REASONS
 * @param {string} description - Additional details about the report
 * @param {string|null} relatedTripId - Optional trip ID related to the report
 * @param {string|null} relatedReviewId - Optional review ID related to the report
 * @returns {Promise<Object>} - The created report with ID
 */
export async function submitReport(reporterId, reportedUserId, reason, description = '', relatedTripId = null, relatedReviewId = null) {
	// Validation
	if (!reporterId) {
		throw new Error('Reporter ID is required');
	}
	if (!reportedUserId) {
		throw new Error('Reported user ID is required');
	}
	if (!reason) {
		throw new Error('Report reason is required');
	}
	if (!REPORT_REASONS.includes(reason)) {
		throw new Error(`Invalid report reason. Must be one of: ${REPORT_REASONS.join(', ')}`);
	}
	if (reporterId === reportedUserId) {
		throw new Error('You cannot report yourself');
	}

	// Check for existing pending report
	const existingReport = await hasUserReportedUser(reporterId, reportedUserId);
	if (existingReport) {
		throw new Error('You have already submitted a report for this user that is pending review');
	}

	const reportData = {
		reporterId,
		reportedUserId,
		reason,
		description: description.trim(),
		relatedTripId,
		relatedReviewId,
		status: 'pending', // pending, reviewed, resolved, dismissed
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	};

	const reportsRef = collection(db, 'reports');
	const docRef = await addDoc(reportsRef, reportData);

	return {
		id: docRef.id,
		...reportData,
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

/**
 * Check if a user has already reported another user (with pending status)
 * @param {string} reporterId - The user who may have reported
 * @param {string} reportedUserId - The user who may have been reported
 * @returns {Promise<boolean>} - True if a pending report exists
 */
export async function hasUserReportedUser(reporterId, reportedUserId) {
	if (!reporterId || !reportedUserId) {
		return false;
	}

	const reportsRef = collection(db, 'reports');
	const q = query(
		reportsRef,
		where('reporterId', '==', reporterId),
		where('reportedUserId', '==', reportedUserId),
		where('status', '==', 'pending')
	);

	const snapshot = await getDocs(q);
	return !snapshot.empty;
}

/**
 * Get all reports submitted by a user
 * @param {string} userId - The reporter's user ID
 * @returns {Promise<Array>} - Array of reports
 */
export async function getReportsByUser(userId) {
	if (!userId) {
		throw new Error('User ID is required');
	}

	const reportsRef = collection(db, 'reports');
	const q = query(reportsRef, where('reporterId', '==', userId));
	const snapshot = await getDocs(q);

	return snapshot.docs.map(doc => ({
		id: doc.id,
		...doc.data()
	}));
}

/**
 * Get all reports against a user
 * @param {string} userId - The reported user's ID
 * @returns {Promise<Array>} - Array of reports
 */
export async function getReportsAgainstUser(userId) {
	if (!userId) {
		throw new Error('User ID is required');
	}

	const reportsRef = collection(db, 'reports');
	const q = query(reportsRef, where('reportedUserId', '==', userId));
	const snapshot = await getDocs(q);

	return snapshot.docs.map(doc => ({
		id: doc.id,
		...doc.data()
	}));
}
