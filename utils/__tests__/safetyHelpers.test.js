/**
 * Safety Helpers Tests
 * Phase 6: Week 7 Implementation Plan
 */

import { Alert } from 'react-native';
import {
    showBlockConfirmation,
    showBlockSuccessAlert,
    showReportSuccessAlert,
    showSafetyErrorAlert,
    showUnblockConfirmation,
    showUnblockSuccessAlert,
} from '../safetyHelpers';

// Mock Alert
jest.mock('react-native', () => ({
	Alert: {
		alert: jest.fn(),
	},
}));

describe('Safety Helpers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('showBlockConfirmation', () => {
		it('shows alert with correct title', () => {
			showBlockConfirmation('John', jest.fn());
			expect(Alert.alert).toHaveBeenCalledWith(
				'Block User',
				expect.any(String),
				expect.any(Array),
				expect.any(Object)
			);
		});

		it('shows user name in message', () => {
			showBlockConfirmation('John', jest.fn());
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toContain('John');
		});

		it('uses default name when userName is not provided', () => {
			showBlockConfirmation(null, jest.fn());
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toContain('this user');
		});

		it('includes consequences in message', () => {
			showBlockConfirmation('John', jest.fn());
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toContain('Consequences');
			expect(message).toContain("won't see their rides");
		});

		it('provides Cancel and Block buttons', () => {
			showBlockConfirmation('John', jest.fn());
			const buttons = Alert.alert.mock.calls[0][2];
			expect(buttons).toHaveLength(2);
			expect(buttons[0].text).toBe('Cancel');
			expect(buttons[1].text).toBe('Block');
		});

		it('Block button has destructive style', () => {
			showBlockConfirmation('John', jest.fn());
			const buttons = Alert.alert.mock.calls[0][2];
			expect(buttons[1].style).toBe('destructive');
		});

		it('calls onConfirm when Block is pressed', () => {
			const onConfirm = jest.fn();
			showBlockConfirmation('John', onConfirm);
			const buttons = Alert.alert.mock.calls[0][2];
			buttons[1].onPress();
			expect(onConfirm).toHaveBeenCalled();
		});

		it('calls onCancel when Cancel is pressed', () => {
			const onCancel = jest.fn();
			showBlockConfirmation('John', jest.fn(), onCancel);
			const buttons = Alert.alert.mock.calls[0][2];
			buttons[0].onPress();
			expect(onCancel).toHaveBeenCalled();
		});

		it('uses empty function as default onCancel', () => {
			showBlockConfirmation('John', jest.fn());
			const buttons = Alert.alert.mock.calls[0][2];
			// Should not throw
			expect(() => buttons[0].onPress()).not.toThrow();
		});

		it('sets cancelable to true', () => {
			showBlockConfirmation('John', jest.fn());
			const options = Alert.alert.mock.calls[0][3];
			expect(options.cancelable).toBe(true);
		});
	});

	describe('showUnblockConfirmation', () => {
		it('shows alert with correct title', () => {
			showUnblockConfirmation('Jane', jest.fn());
			expect(Alert.alert).toHaveBeenCalledWith(
				'Unblock User',
				expect.any(String),
				expect.any(Array),
				expect.any(Object)
			);
		});

		it('shows user name in message', () => {
			showUnblockConfirmation('Jane', jest.fn());
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toContain('Jane');
		});

		it('uses default name when userName is not provided', () => {
			showUnblockConfirmation(undefined, jest.fn());
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toContain('this user');
		});

		it('provides Cancel and Unblock buttons', () => {
			showUnblockConfirmation('Jane', jest.fn());
			const buttons = Alert.alert.mock.calls[0][2];
			expect(buttons).toHaveLength(2);
			expect(buttons[0].text).toBe('Cancel');
			expect(buttons[1].text).toBe('Unblock');
		});

		it('Unblock button has default style', () => {
			showUnblockConfirmation('Jane', jest.fn());
			const buttons = Alert.alert.mock.calls[0][2];
			expect(buttons[1].style).toBe('default');
		});

		it('calls onConfirm when Unblock is pressed', () => {
			const onConfirm = jest.fn();
			showUnblockConfirmation('Jane', onConfirm);
			const buttons = Alert.alert.mock.calls[0][2];
			buttons[1].onPress();
			expect(onConfirm).toHaveBeenCalled();
		});

		it('calls onCancel when Cancel is pressed', () => {
			const onCancel = jest.fn();
			showUnblockConfirmation('Jane', jest.fn(), onCancel);
			const buttons = Alert.alert.mock.calls[0][2];
			buttons[0].onPress();
			expect(onCancel).toHaveBeenCalled();
		});
	});

	describe('showReportSuccessAlert', () => {
		it('shows alert with correct title', () => {
			showReportSuccessAlert();
			expect(Alert.alert).toHaveBeenCalledWith(
				'Report Submitted',
				expect.any(String),
				expect.any(Array)
			);
		});

		it('shows thank you message', () => {
			showReportSuccessAlert();
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toContain('Thank you');
		});

		it('provides OK button', () => {
			showReportSuccessAlert();
			const buttons = Alert.alert.mock.calls[0][2];
			expect(buttons).toHaveLength(1);
			expect(buttons[0].text).toBe('OK');
		});

		it('calls onDismiss when OK is pressed', () => {
			const onDismiss = jest.fn();
			showReportSuccessAlert(onDismiss);
			const buttons = Alert.alert.mock.calls[0][2];
			buttons[0].onPress();
			expect(onDismiss).toHaveBeenCalled();
		});

		it('uses empty function as default onDismiss', () => {
			showReportSuccessAlert();
			const buttons = Alert.alert.mock.calls[0][2];
			expect(() => buttons[0].onPress()).not.toThrow();
		});
	});

	describe('showBlockSuccessAlert', () => {
		it('shows alert with correct title', () => {
			showBlockSuccessAlert('Bob');
			expect(Alert.alert).toHaveBeenCalledWith(
				'User Blocked',
				expect.any(String),
				expect.any(Array)
			);
		});

		it('includes user name in message', () => {
			showBlockSuccessAlert('Bob');
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toContain('Bob');
		});

		it('uses default name when userName is not provided', () => {
			showBlockSuccessAlert(null);
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toContain('User');
		});

		it('calls onDismiss when OK is pressed', () => {
			const onDismiss = jest.fn();
			showBlockSuccessAlert('Bob', onDismiss);
			const buttons = Alert.alert.mock.calls[0][2];
			buttons[0].onPress();
			expect(onDismiss).toHaveBeenCalled();
		});
	});

	describe('showUnblockSuccessAlert', () => {
		it('shows alert with correct title', () => {
			showUnblockSuccessAlert('Alice');
			expect(Alert.alert).toHaveBeenCalledWith(
				'User Unblocked',
				expect.any(String),
				expect.any(Array)
			);
		});

		it('includes user name in message', () => {
			showUnblockSuccessAlert('Alice');
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toContain('Alice');
		});

		it('uses default name when userName is not provided', () => {
			showUnblockSuccessAlert('');
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toContain('User');
		});

		it('calls onDismiss when OK is pressed', () => {
			const onDismiss = jest.fn();
			showUnblockSuccessAlert('Alice', onDismiss);
			const buttons = Alert.alert.mock.calls[0][2];
			buttons[0].onPress();
			expect(onDismiss).toHaveBeenCalled();
		});
	});

	describe('showSafetyErrorAlert', () => {
		it('shows alert with operation in title', () => {
			showSafetyErrorAlert('block', 'Network error');
			expect(Alert.alert).toHaveBeenCalledWith(
				'Failed to block',
				expect.any(String),
				expect.any(Array)
			);
		});

		it('shows error message', () => {
			showSafetyErrorAlert('report', 'Connection failed');
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toBe('Connection failed');
		});

		it('shows default message when error message is not provided', () => {
			showSafetyErrorAlert('unblock', null);
			const message = Alert.alert.mock.calls[0][1];
			expect(message).toContain('Something went wrong');
		});

		it('shows only OK button when no retry callback', () => {
			showSafetyErrorAlert('block', 'Error');
			const buttons = Alert.alert.mock.calls[0][2];
			expect(buttons).toHaveLength(1);
			expect(buttons[0].text).toBe('OK');
		});

		it('shows OK and Retry buttons when retry callback provided', () => {
			showSafetyErrorAlert('block', 'Error', jest.fn());
			const buttons = Alert.alert.mock.calls[0][2];
			expect(buttons).toHaveLength(2);
			expect(buttons[0].text).toBe('OK');
			expect(buttons[1].text).toBe('Retry');
		});

		it('calls retry callback when Retry is pressed', () => {
			const onRetry = jest.fn();
			showSafetyErrorAlert('block', 'Error', onRetry);
			const buttons = Alert.alert.mock.calls[0][2];
			buttons[1].onPress();
			expect(onRetry).toHaveBeenCalled();
		});

		it('OK button has cancel style', () => {
			showSafetyErrorAlert('block', 'Error');
			const buttons = Alert.alert.mock.calls[0][2];
			expect(buttons[0].style).toBe('cancel');
		});
	});
});
