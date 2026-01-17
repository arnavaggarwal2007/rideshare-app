/**
 * Tests for components/ErrorAlert.js
 */
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import ErrorAlert from '../ErrorAlert';

describe('ErrorAlert', () => {
	const defaultProps = {
		visible: true,
		message: 'An error occurred',
		onDismiss: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('visibility', () => {
		it('renders when visible is true', () => {
			const { getByText } = render(<ErrorAlert {...defaultProps} />);
			expect(getByText('An error occurred')).toBeTruthy();
		});

		it('does not render when visible is false', () => {
			const { queryByText } = render(
				<ErrorAlert {...defaultProps} visible={false} />
			);
			expect(queryByText('An error occurred')).toBeNull();
		});

		it('returns null when not visible', () => {
			const { toJSON } = render(
				<ErrorAlert {...defaultProps} visible={false} />
			);
			expect(toJSON()).toBeNull();
		});
	});

	describe('content', () => {
		it('displays error message', () => {
			const { getByText } = render(
				<ErrorAlert {...defaultProps} message="Custom error message" />
			);
			expect(getByText('Custom error message')).toBeTruthy();
		});

		it('displays dismiss button', () => {
			const { getByText } = render(<ErrorAlert {...defaultProps} />);
			expect(getByText('Dismiss')).toBeTruthy();
		});

		it('renders with long error message', () => {
			const longMessage = 'This is a very long error message that might wrap to multiple lines in the UI. It should still render correctly and be readable.';
			const { getByText } = render(
				<ErrorAlert {...defaultProps} message={longMessage} />
			);
			expect(getByText(longMessage)).toBeTruthy();
		});

		it('renders with empty message', () => {
			const { getByText } = render(
				<ErrorAlert {...defaultProps} message="" />
			);
			expect(getByText('Dismiss')).toBeTruthy();
		});
	});

	describe('interaction', () => {
		it('calls onDismiss when dismiss button is pressed', () => {
			const onDismiss = jest.fn();
			const { getByText } = render(
				<ErrorAlert {...defaultProps} onDismiss={onDismiss} />
			);

			fireEvent.press(getByText('Dismiss'));
			expect(onDismiss).toHaveBeenCalledTimes(1);
		});

		it('calls onDismiss multiple times when pressed multiple times', () => {
			const onDismiss = jest.fn();
			const { getByText } = render(
				<ErrorAlert {...defaultProps} onDismiss={onDismiss} />
			);

			fireEvent.press(getByText('Dismiss'));
			fireEvent.press(getByText('Dismiss'));
			fireEvent.press(getByText('Dismiss'));
			expect(onDismiss).toHaveBeenCalledTimes(3);
		});
	});

	describe('styling', () => {
		it('renders with proper structure', () => {
			const { toJSON } = render(<ErrorAlert {...defaultProps} />);
			const tree = toJSON();
			
			// Should have a View container with Text and TouchableOpacity children
			expect(tree.type).toBe('View');
			expect(tree.children).toHaveLength(2);
		});

		it('message has correct styling', () => {
			const { getByText } = render(<ErrorAlert {...defaultProps} />);
			const message = getByText('An error occurred');
			
			// Check parent has styles applied
			expect(message.props.style).toBeDefined();
		});
	});

	describe('edge cases', () => {
		it('handles undefined message gracefully', () => {
			const { getByText } = render(
				<ErrorAlert visible={true} message={undefined} onDismiss={jest.fn()} />
			);
			expect(getByText('Dismiss')).toBeTruthy();
		});

		it('handles special characters in message', () => {
			const specialMessage = '<script>alert("xss")</script> & "quotes" \'single\'';
			const { getByText } = render(
				<ErrorAlert {...defaultProps} message={specialMessage} />
			);
			expect(getByText(specialMessage)).toBeTruthy();
		});

		it('handles emoji in message', () => {
			const emojiMessage = '❌ Error occurred! 🚨';
			const { getByText } = render(
				<ErrorAlert {...defaultProps} message={emojiMessage} />
			);
			expect(getByText(emojiMessage)).toBeTruthy();
		});
	});
});
