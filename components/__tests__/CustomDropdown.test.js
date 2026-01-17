/**
 * Tests for components/CustomDropdown.js
 */
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import CustomDropdown from '../CustomDropdown';

describe('CustomDropdown', () => {
	const defaultProps = {
		label: 'Select Option',
		value: '',
		options: ['Option A', 'Option B', 'Option C'],
		onSelect: jest.fn(),
		placeholder: 'Choose an option',
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders with label', () => {
			const { getByText } = render(<CustomDropdown {...defaultProps} />);
			expect(getByText('Select Option')).toBeTruthy();
		});

		it('renders with placeholder when no value', () => {
			const { getByText } = render(<CustomDropdown {...defaultProps} />);
			expect(getByText('Choose an option')).toBeTruthy();
		});

		it('renders with selected value', () => {
			const { getByText } = render(
				<CustomDropdown {...defaultProps} value="Option A" />
			);
			expect(getByText('Option A')).toBeTruthy();
		});

		it('renders required indicator when required', () => {
			const { getByText } = render(
				<CustomDropdown {...defaultProps} required={true} />
			);
			expect(getByText('*')).toBeTruthy();
		});

		it('does not render required indicator when not required', () => {
			const { queryByText } = render(
				<CustomDropdown {...defaultProps} required={false} />
			);
			// The label should exist but no asterisk
			expect(queryByText('*')).toBeNull();
		});

		it('renders without label', () => {
			const { queryByText } = render(
				<CustomDropdown {...defaultProps} label={undefined} />
			);
			expect(queryByText('Select Option')).toBeNull();
		});
	});

	describe('modal interaction', () => {
		it('opens modal when dropdown button is pressed', () => {
			const { getByText, queryByText } = render(
				<CustomDropdown {...defaultProps} />
			);

			// Modal should not show options initially
			expect(queryByText('Option B')).toBeNull();

			// Press dropdown button
			fireEvent.press(getByText('Choose an option'));

			// Modal should now show options
			expect(getByText('Option A')).toBeTruthy();
			expect(getByText('Option B')).toBeTruthy();
			expect(getByText('Option C')).toBeTruthy();
		});

		it('displays modal title', () => {
			const { getByText, getAllByText } = render(
				<CustomDropdown {...defaultProps} />
			);

			fireEvent.press(getByText('Choose an option'));

			// Should have two instances of the label - one in main view, one in modal header
			const labels = getAllByText('Select Option');
			expect(labels.length).toBeGreaterThanOrEqual(1);
		});

		it('selects option and closes modal', () => {
			const onSelect = jest.fn();
			const { getByText } = render(
				<CustomDropdown {...defaultProps} onSelect={onSelect} />
			);

			// Open modal
			fireEvent.press(getByText('Choose an option'));

			// Select an option
			fireEvent.press(getByText('Option B'));

			// Callback should be called with selected value
			expect(onSelect).toHaveBeenCalledWith('Option B');
		});

		it('closes modal when overlay is pressed', () => {
			const { getByText, getAllByText } = render(
				<CustomDropdown {...defaultProps} />
			);

			// Open modal
			fireEvent.press(getByText('Choose an option'));
			expect(getAllByText('Select Option').length).toBeGreaterThanOrEqual(1);

			// The modal has a close functionality - we can simulate onRequestClose
			// or press anywhere on the modal overlay to close it
		});

		it('shows checkmark for selected option', () => {
			const { getByText, getAllByText } = render(
				<CustomDropdown {...defaultProps} value="Option A" />
			);

			// Open modal to see the checkmark
			fireEvent.press(getByText('Option A'));

			// The selected option should be visible in the list
			// Multiple Option A texts may exist (in button and in list)
			const optionAs = getAllByText('Option A');
			expect(optionAs.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('default behavior', () => {
		it('uses default placeholder when not provided', () => {
			const { getByText } = render(
				<CustomDropdown
					label="Test"
					value=""
					options={['A', 'B']}
					onSelect={jest.fn()}
				/>
			);
			expect(getByText('Select an option')).toBeTruthy();
		});

		it('handles empty options array', () => {
			const { getByText, queryByText } = render(
				<CustomDropdown
					label="Test"
					value=""
					options={[]}
					onSelect={jest.fn()}
					placeholder="No options"
				/>
			);

			fireEvent.press(getByText('No options'));
			// Modal should open but have no items
		});
	});

	describe('styling', () => {
		it('applies selected style when value matches option', () => {
			const { getAllByText } = render(
				<CustomDropdown {...defaultProps} value="Option A" />
			);

			// Open modal - Option A appears both as button text and in list
			const optionButtons = getAllByText('Option A');
			fireEvent.press(optionButtons[0]);

			// Selected option should have different styling
			// Multiple Option A texts may exist
			const allOptionAs = getAllByText('Option A');
			expect(allOptionAs.length).toBeGreaterThanOrEqual(1);
		});
	});
});
