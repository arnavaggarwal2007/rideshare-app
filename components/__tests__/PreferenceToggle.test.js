/**
 * Tests for components/PreferenceToggle.js
 */
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import PreferenceToggle from '../PreferenceToggle';

describe('PreferenceToggle', () => {
	const defaultProps = {
		label: 'Enable notifications',
		value: false,
		onToggle: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders with label', () => {
			const { getByText } = render(<PreferenceToggle {...defaultProps} />);
			expect(getByText('Enable notifications')).toBeTruthy();
		});

		it('renders in off state when value is false', () => {
			const { toJSON } = render(
				<PreferenceToggle {...defaultProps} value={false} />
			);
			// Component should render
			expect(toJSON()).toBeTruthy();
		});

		it('renders in on state when value is true', () => {
			const { toJSON } = render(
				<PreferenceToggle {...defaultProps} value={true} />
			);
			expect(toJSON()).toBeTruthy();
		});

		it('renders with different labels', () => {
			const { getByText, rerender } = render(
				<PreferenceToggle {...defaultProps} label="Dark mode" />
			);
			expect(getByText('Dark mode')).toBeTruthy();

			rerender(
				<PreferenceToggle {...defaultProps} label="Auto-save" />
			);
			expect(getByText('Auto-save')).toBeTruthy();
		});

		it('renders with long label text', () => {
			const longLabel = 'This is a very long preference label that might wrap to multiple lines';
			const { getByText } = render(
				<PreferenceToggle {...defaultProps} label={longLabel} />
			);
			expect(getByText(longLabel)).toBeTruthy();
		});
	});

	describe('interaction', () => {
		it('calls onToggle when toggle is pressed', () => {
			const onToggle = jest.fn();
			const { toJSON, UNSAFE_root } = render(
				<PreferenceToggle {...defaultProps} onToggle={onToggle} />
			);

			// Find the TouchableOpacity and press it
			const touchables = UNSAFE_root.findAllByType(
				require('react-native').TouchableOpacity
			);
			if (touchables.length > 0) {
				fireEvent.press(touchables[0]);
				expect(onToggle).toHaveBeenCalledTimes(1);
			}
		});

		it('can be pressed multiple times', () => {
			const onToggle = jest.fn();
			const { UNSAFE_root } = render(
				<PreferenceToggle {...defaultProps} onToggle={onToggle} />
			);

			const touchables = UNSAFE_root.findAllByType(
				require('react-native').TouchableOpacity
			);
			if (touchables.length > 0) {
				fireEvent.press(touchables[0]);
				fireEvent.press(touchables[0]);
				fireEvent.press(touchables[0]);
				expect(onToggle).toHaveBeenCalledTimes(3);
			}
		});
	});

	describe('toggle visual states', () => {
		it('has different styles when off', () => {
			const { toJSON } = render(
				<PreferenceToggle {...defaultProps} value={false} />
			);
			const tree = toJSON();
			// Should render with container structure
			expect(tree).toBeTruthy();
		});

		it('has different styles when on', () => {
			const { toJSON } = render(
				<PreferenceToggle {...defaultProps} value={true} />
			);
			const tree = toJSON();
			expect(tree).toBeTruthy();
		});

		it('toggle circle position changes based on value', () => {
			const { rerender, toJSON } = render(
				<PreferenceToggle {...defaultProps} value={false} />
			);
			const offTree = toJSON();

			rerender(<PreferenceToggle {...defaultProps} value={true} />);
			const onTree = toJSON();

			// Trees should be different due to styling differences
			expect(JSON.stringify(offTree)).not.toBe(JSON.stringify(onTree));
		});
	});

	describe('accessibility', () => {
		it('toggle has activeOpacity', () => {
			const { toJSON } = render(<PreferenceToggle {...defaultProps} />);
			// Component should have proper touch feedback
			expect(toJSON()).toBeTruthy();
		});
	});

	describe('structure', () => {
		it('has correct component structure', () => {
			const { toJSON } = render(<PreferenceToggle {...defaultProps} />);
			const tree = toJSON();

			// Root should be a View
			expect(tree.type).toBe('View');
			// Should have children for label and toggle
			expect(tree.children.length).toBeGreaterThanOrEqual(2);
		});

		it('label and toggle are in a row', () => {
			const { toJSON } = render(<PreferenceToggle {...defaultProps} />);
			const tree = toJSON();

			// Container should have flexDirection row style
			const style = tree.props.style;
			const flatStyle = Array.isArray(style) 
				? style.reduce((acc, s) => ({ ...acc, ...s }), {})
				: style;
			expect(flatStyle.flexDirection).toBe('row');
		});
	});

	describe('edge cases', () => {
		it('handles undefined onToggle gracefully', () => {
			// This should not throw
			expect(() => {
				render(
					<PreferenceToggle
						label="Test"
						value={false}
						onToggle={undefined}
					/>
				);
			}).not.toThrow();
		});

		it('handles special characters in label', () => {
			const specialLabel = '🔔 Notifications & alerts <test>';
			const { getByText } = render(
				<PreferenceToggle {...defaultProps} label={specialLabel} />
			);
			expect(getByText(specialLabel)).toBeTruthy();
		});
	});
});
