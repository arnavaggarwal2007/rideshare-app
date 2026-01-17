/**
 * ReportModal Component Tests
 * Phase 5: Week 7 Implementation Plan
 */

import { fireEvent, render } from '@testing-library/react-native';
import { REPORT_REASONS, REPORT_REASON_LABELS } from '../../services/firebase/reports';
import ReportModal from '../ReportModal';

// Mock the reports service
jest.mock('../../services/firebase/reports', () => ({
	REPORT_REASONS: [
		'inappropriate_behavior',
		'safety_concern',
		'fake_profile',
		'harassment',
		'spam',
		'other'
	],
	REPORT_REASON_LABELS: {
		inappropriate_behavior: 'Inappropriate Behavior',
		safety_concern: 'Safety Concern',
		fake_profile: 'Fake Profile',
		harassment: 'Harassment',
		spam: 'Spam',
		other: 'Other'
	}
}));

describe('ReportModal', () => {
	const mockOnClose = jest.fn();
	const mockOnSubmit = jest.fn();

	const defaultProps = {
		visible: true,
		onClose: mockOnClose,
		onSubmit: mockOnSubmit,
		reportedUserName: 'John Doe',
		submitting: false,
		error: null,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Rendering', () => {
		it('renders when visible is true', () => {
			const { getByText } = render(<ReportModal {...defaultProps} />);
			expect(getByText('Report User')).toBeTruthy();
		});

		it('displays the reported user name', () => {
			const { getByText } = render(<ReportModal {...defaultProps} />);
			expect(getByText(/John Doe/)).toBeTruthy();
		});

		it('displays default user name when not provided', () => {
			const { getByText } = render(
				<ReportModal {...defaultProps} reportedUserName={undefined} />
			);
			expect(getByText(/this user/)).toBeTruthy();
		});

		it('renders all report reasons', () => {
			const { getByText } = render(<ReportModal {...defaultProps} />);
			
			Object.values(REPORT_REASON_LABELS).forEach(label => {
				expect(getByText(label)).toBeTruthy();
			});
		});

		it('renders submit and cancel buttons', () => {
			const { getByText, getByLabelText } = render(<ReportModal {...defaultProps} />);
			expect(getByText('Cancel')).toBeTruthy();
			expect(getByText('Submit Report')).toBeTruthy();
		});

		it('renders description input', () => {
			const { getByLabelText } = render(<ReportModal {...defaultProps} />);
			expect(getByLabelText('Additional details')).toBeTruthy();
		});

		it('renders character count for description', () => {
			const { getByText } = render(<ReportModal {...defaultProps} />);
			expect(getByText('0/500')).toBeTruthy();
		});

		it('renders close button', () => {
			const { getByLabelText } = render(<ReportModal {...defaultProps} />);
			expect(getByLabelText('Close')).toBeTruthy();
		});
	});

	describe('Error Display', () => {
		it('displays error message when error prop is provided', () => {
			const { getByText } = render(
				<ReportModal {...defaultProps} error="Something went wrong" />
			);
			expect(getByText('Something went wrong')).toBeTruthy();
		});

		it('does not display error container when error is null', () => {
			const { queryByText } = render(
				<ReportModal {...defaultProps} error={null} />
			);
			expect(queryByText('Something went wrong')).toBeNull();
		});
	});

	describe('Reason Selection', () => {
		it('selects a reason when pressed', () => {
			const { getByText, getByLabelText } = render(<ReportModal {...defaultProps} />);
			
			fireEvent.press(getByText('Harassment'));
			
			// The radio button should be checked
			const harassmentOption = getByLabelText('Harassment');
			expect(harassmentOption.props.accessibilityState.checked).toBe(true);
		});

		it('changes selection when different reason is pressed', () => {
			const { getByText, getByLabelText } = render(<ReportModal {...defaultProps} />);
			
			fireEvent.press(getByText('Harassment'));
			fireEvent.press(getByText('Spam'));
			
			const spamOption = getByLabelText('Spam');
			const harassmentOption = getByLabelText('Harassment');
			
			expect(spamOption.props.accessibilityState.checked).toBe(true);
			expect(harassmentOption.props.accessibilityState.checked).toBe(false);
		});

		it('each reason option has proper accessibility role', () => {
			const { getByLabelText } = render(<ReportModal {...defaultProps} />);
			
			REPORT_REASONS.forEach(reason => {
				const option = getByLabelText(REPORT_REASON_LABELS[reason]);
				expect(option.props.accessibilityRole).toBe('radio');
			});
		});
	});

	describe('Description Input', () => {
		it('updates description text when typed', () => {
			const { getByLabelText, getByText } = render(<ReportModal {...defaultProps} />);
			
			const input = getByLabelText('Additional details');
			fireEvent.changeText(input, 'This is my description');
			
			expect(input.props.value).toBe('This is my description');
			expect(getByText('22/500')).toBeTruthy();
		});

		it('updates character count as user types', () => {
			const { getByLabelText, getByText } = render(<ReportModal {...defaultProps} />);
			
			const input = getByLabelText('Additional details');
			fireEvent.changeText(input, 'Hello');
			
			expect(getByText('5/500')).toBeTruthy();
		});
	});

	describe('Submit Button', () => {
		it('is disabled when no reason is selected', () => {
			const { getByLabelText } = render(<ReportModal {...defaultProps} />);
			
			const submitButton = getByLabelText('Submit report');
			expect(submitButton.props.accessibilityState.disabled).toBe(true);
		});

		it('is enabled when a reason is selected', () => {
			const { getByText, getByLabelText } = render(<ReportModal {...defaultProps} />);
			
			fireEvent.press(getByText('Harassment'));
			
			const submitButton = getByLabelText('Submit report');
			expect(submitButton.props.accessibilityState.disabled).toBe(false);
		});

		it('is disabled when submitting', () => {
			const { getByText, getByLabelText } = render(
				<ReportModal {...defaultProps} submitting={true} />
			);
			
			fireEvent.press(getByText('Harassment'));
			
			const submitButton = getByLabelText('Submit report');
			expect(submitButton.props.accessibilityState.disabled).toBe(true);
		});

		it('calls onSubmit with reason and description when pressed', () => {
			const { getByText, getByLabelText } = render(<ReportModal {...defaultProps} />);
			
			fireEvent.press(getByText('Harassment'));
			
			const input = getByLabelText('Additional details');
			fireEvent.changeText(input, 'They were rude');
			
			fireEvent.press(getByText('Submit Report'));
			
			expect(mockOnSubmit).toHaveBeenCalledWith('harassment', 'They were rude');
		});

		it('does not call onSubmit when no reason selected', () => {
			const { getByText } = render(<ReportModal {...defaultProps} />);
			
			fireEvent.press(getByText('Submit Report'));
			
			expect(mockOnSubmit).not.toHaveBeenCalled();
		});
	});

	describe('Cancel/Close Behavior', () => {
		it('calls onClose when Cancel button is pressed', () => {
			const { getByText } = render(<ReportModal {...defaultProps} />);
			
			fireEvent.press(getByText('Cancel'));
			
			expect(mockOnClose).toHaveBeenCalled();
		});

		it('calls onClose when close button (X) is pressed', () => {
			const { getByLabelText } = render(<ReportModal {...defaultProps} />);
			
			fireEvent.press(getByLabelText('Close'));
			
			expect(mockOnClose).toHaveBeenCalled();
		});

		it('resets form state when closed via Cancel', () => {
			const { getByText, getByLabelText, rerender } = render(
				<ReportModal {...defaultProps} />
			);
			
			// Select a reason and add description
			fireEvent.press(getByText('Harassment'));
			fireEvent.changeText(getByLabelText('Additional details'), 'Test description');
			
			// Close the modal
			fireEvent.press(getByText('Cancel'));
			
			// Rerender with modal visible again
			rerender(<ReportModal {...defaultProps} />);
			
			// State should be reset (character count back to 0)
			expect(getByText('0/500')).toBeTruthy();
		});

		it('resets form state when closed via X button', () => {
			const { getByText, getByLabelText, rerender } = render(
				<ReportModal {...defaultProps} />
			);
			
			// Select a reason
			fireEvent.press(getByText('Spam'));
			fireEvent.changeText(getByLabelText('Additional details'), 'Spam content');
			
			// Close via X button
			fireEvent.press(getByLabelText('Close'));
			
			// Rerender
			rerender(<ReportModal {...defaultProps} />);
			
			expect(getByText('0/500')).toBeTruthy();
		});
	});

	describe('Loading State', () => {
		it('shows ActivityIndicator when submitting', () => {
			const { getByText, UNSAFE_getByType } = render(
				<ReportModal {...defaultProps} submitting={true} />
			);
			
			// The submit button text should not be visible when loading
			expect(() => getByText('Submit Report')).toThrow();
		});

		it('hides submit text when submitting', () => {
			const { queryByText } = render(
				<ReportModal {...defaultProps} submitting={true} />
			);
			
			expect(queryByText('Submit Report')).toBeNull();
		});
	});

	describe('Accessibility', () => {
		it('has accessible labels for all interactive elements', () => {
			const { getByLabelText } = render(<ReportModal {...defaultProps} />);
			
			expect(getByLabelText('Close')).toBeTruthy();
			expect(getByLabelText('Cancel')).toBeTruthy();
			expect(getByLabelText('Submit report')).toBeTruthy();
			expect(getByLabelText('Additional details')).toBeTruthy();
		});

		it('has correct accessibility roles', () => {
			const { getByLabelText } = render(<ReportModal {...defaultProps} />);
			
			expect(getByLabelText('Close').props.accessibilityRole).toBe('button');
			expect(getByLabelText('Cancel').props.accessibilityRole).toBe('button');
			expect(getByLabelText('Submit report').props.accessibilityRole).toBe('button');
		});
	});

	describe('Section Titles', () => {
		it('displays "Reason for Report" section title', () => {
			const { getByText } = render(<ReportModal {...defaultProps} />);
			expect(getByText('Reason for Report')).toBeTruthy();
		});

		it('displays "Additional Details" section title', () => {
			const { getByText } = render(<ReportModal {...defaultProps} />);
			expect(getByText('Additional Details (Optional)')).toBeTruthy();
		});
	});

	describe('Placeholder Text', () => {
		it('displays placeholder in description input', () => {
			const { getByLabelText } = render(<ReportModal {...defaultProps} />);
			const input = getByLabelText('Additional details');
			expect(input.props.placeholder).toContain('additional information');
		});
	});
});
