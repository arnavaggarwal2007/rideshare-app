/**
 * Reports Service Tests
 * Phase 5: Week 7 Implementation Plan
 */

import {
    getReportsAgainstUser,
    getReportsByUser,
    hasUserReportedUser,
    REPORT_REASON_LABELS,
    REPORT_REASONS,
    submitReport,
} from '../reports';

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
	collection: jest.fn(() => 'reportsCollection'),
	addDoc: jest.fn(),
	getDocs: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	serverTimestamp: jest.fn(() => ({ _seconds: Date.now() / 1000 })),
}));

// Mock firebase config
jest.mock('../config', () => ({
	db: {},
}));

import { addDoc, getDocs, where } from 'firebase/firestore';

describe('Reports Service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('REPORT_REASONS constant', () => {
		it('contains all expected reasons', () => {
			expect(REPORT_REASONS).toContain('inappropriate_behavior');
			expect(REPORT_REASONS).toContain('safety_concern');
			expect(REPORT_REASONS).toContain('fake_profile');
			expect(REPORT_REASONS).toContain('harassment');
			expect(REPORT_REASONS).toContain('spam');
			expect(REPORT_REASONS).toContain('other');
		});

		it('has exactly 6 reasons', () => {
			expect(REPORT_REASONS).toHaveLength(6);
		});
	});

	describe('REPORT_REASON_LABELS constant', () => {
		it('has labels for all reasons', () => {
			REPORT_REASONS.forEach(reason => {
				expect(REPORT_REASON_LABELS[reason]).toBeDefined();
				expect(typeof REPORT_REASON_LABELS[reason]).toBe('string');
			});
		});

		it('has human-readable labels', () => {
			expect(REPORT_REASON_LABELS.inappropriate_behavior).toBe('Inappropriate Behavior');
			expect(REPORT_REASON_LABELS.safety_concern).toBe('Safety Concern');
			expect(REPORT_REASON_LABELS.fake_profile).toBe('Fake Profile');
			expect(REPORT_REASON_LABELS.harassment).toBe('Harassment');
			expect(REPORT_REASON_LABELS.spam).toBe('Spam');
			expect(REPORT_REASON_LABELS.other).toBe('Other');
		});
	});

	describe('submitReport', () => {
		beforeEach(() => {
			// Default: no existing pending report
			getDocs.mockResolvedValue({ empty: true, docs: [] });
			addDoc.mockResolvedValue({ id: 'new-report-id' });
		});

		it('throws error when reporterId is missing', async () => {
			await expect(
				submitReport(null, 'user2', 'harassment', 'description')
			).rejects.toThrow('Reporter ID is required');
		});

		it('throws error when reportedUserId is missing', async () => {
			await expect(
				submitReport('user1', null, 'harassment', 'description')
			).rejects.toThrow('Reported user ID is required');
		});

		it('throws error when reason is missing', async () => {
			await expect(
				submitReport('user1', 'user2', null, 'description')
			).rejects.toThrow('Report reason is required');
		});

		it('throws error when reason is invalid', async () => {
			await expect(
				submitReport('user1', 'user2', 'invalid_reason', 'description')
			).rejects.toThrow('Invalid report reason');
		});

		it('throws error when trying to report yourself', async () => {
			await expect(
				submitReport('user1', 'user1', 'harassment', 'description')
			).rejects.toThrow('You cannot report yourself');
		});

		it('throws error when user already has pending report for this user', async () => {
			getDocs.mockResolvedValue({ 
				empty: false, 
				docs: [{ id: 'existing-report' }] 
			});

			await expect(
				submitReport('user1', 'user2', 'harassment', 'description')
			).rejects.toThrow('You have already submitted a report for this user that is pending review');
		});

		it('successfully submits report with all parameters', async () => {
			const result = await submitReport(
				'reporter1',
				'reported1',
				'harassment',
				'They were being rude',
				'trip123',
				'review456'
			);

			expect(addDoc).toHaveBeenCalled();
			expect(result.id).toBe('new-report-id');
			expect(result.reporterId).toBe('reporter1');
			expect(result.reportedUserId).toBe('reported1');
			expect(result.reason).toBe('harassment');
			expect(result.description).toBe('They were being rude');
			expect(result.relatedTripId).toBe('trip123');
			expect(result.relatedReviewId).toBe('review456');
			expect(result.status).toBe('pending');
		});

		it('trims description before submission', async () => {
			const result = await submitReport(
				'user1',
				'user2',
				'spam',
				'  Spammy behavior  '
			);

			expect(result.description).toBe('Spammy behavior');
		});

		it('handles empty description', async () => {
			const result = await submitReport(
				'user1',
				'user2',
				'fake_profile',
				''
			);

			expect(result.description).toBe('');
		});

		it('handles undefined optional parameters', async () => {
			const result = await submitReport(
				'user1',
				'user2',
				'safety_concern'
			);

			expect(result.relatedTripId).toBeNull();
			expect(result.relatedReviewId).toBeNull();
		});

		it('accepts all valid report reasons', async () => {
			for (const reason of REPORT_REASONS) {
				jest.clearAllMocks();
				getDocs.mockResolvedValue({ empty: true });
				addDoc.mockResolvedValue({ id: `report-${reason}` });

				const result = await submitReport('user1', 'user2', reason);
				expect(result.reason).toBe(reason);
			}
		});
	});

	describe('hasUserReportedUser', () => {
		it('returns false when reporterId is missing', async () => {
			const result = await hasUserReportedUser(null, 'user2');
			expect(result).toBe(false);
		});

		it('returns false when reportedUserId is missing', async () => {
			const result = await hasUserReportedUser('user1', null);
			expect(result).toBe(false);
		});

		it('returns false when both parameters are missing', async () => {
			const result = await hasUserReportedUser(null, null);
			expect(result).toBe(false);
		});

		it('returns false when no pending report exists', async () => {
			getDocs.mockResolvedValue({ empty: true });

			const result = await hasUserReportedUser('user1', 'user2');
			expect(result).toBe(false);
		});

		it('returns true when pending report exists', async () => {
			getDocs.mockResolvedValue({ 
				empty: false,
				docs: [{ id: 'report1' }]
			});

			const result = await hasUserReportedUser('user1', 'user2');
			expect(result).toBe(true);
		});

		it('queries with correct filters', async () => {
			getDocs.mockResolvedValue({ empty: true });

			await hasUserReportedUser('reporter1', 'reported1');

			expect(where).toHaveBeenCalledWith('reporterId', '==', 'reporter1');
			expect(where).toHaveBeenCalledWith('reportedUserId', '==', 'reported1');
			expect(where).toHaveBeenCalledWith('status', '==', 'pending');
		});
	});

	describe('getReportsByUser', () => {
		it('throws error when userId is missing', async () => {
			await expect(getReportsByUser(null)).rejects.toThrow('User ID is required');
		});

		it('returns empty array when no reports exist', async () => {
			getDocs.mockResolvedValue({ docs: [] });

			const result = await getReportsByUser('user1');
			expect(result).toEqual([]);
		});

		it('returns array of reports with proper structure', async () => {
			const mockDocs = [
				{ id: 'report1', data: () => ({ reason: 'harassment', status: 'pending' }) },
				{ id: 'report2', data: () => ({ reason: 'spam', status: 'resolved' }) },
			];
			getDocs.mockResolvedValue({ docs: mockDocs });

			const result = await getReportsByUser('user1');

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ id: 'report1', reason: 'harassment', status: 'pending' });
			expect(result[1]).toEqual({ id: 'report2', reason: 'spam', status: 'resolved' });
		});

		it('queries with correct filter', async () => {
			getDocs.mockResolvedValue({ docs: [] });

			await getReportsByUser('user123');

			expect(where).toHaveBeenCalledWith('reporterId', '==', 'user123');
		});
	});

	describe('getReportsAgainstUser', () => {
		it('throws error when userId is missing', async () => {
			await expect(getReportsAgainstUser(null)).rejects.toThrow('User ID is required');
		});

		it('returns empty array when no reports exist', async () => {
			getDocs.mockResolvedValue({ docs: [] });

			const result = await getReportsAgainstUser('user1');
			expect(result).toEqual([]);
		});

		it('returns array of reports with proper structure', async () => {
			const mockDocs = [
				{ id: 'report1', data: () => ({ reporterId: 'user2', reason: 'fake_profile' }) },
				{ id: 'report2', data: () => ({ reporterId: 'user3', reason: 'safety_concern' }) },
			];
			getDocs.mockResolvedValue({ docs: mockDocs });

			const result = await getReportsAgainstUser('user1');

			expect(result).toHaveLength(2);
			expect(result[0].reporterId).toBe('user2');
			expect(result[1].reporterId).toBe('user3');
		});

		it('queries with correct filter', async () => {
			getDocs.mockResolvedValue({ docs: [] });

			await getReportsAgainstUser('user456');

			expect(where).toHaveBeenCalledWith('reportedUserId', '==', 'user456');
		});
	});
});
