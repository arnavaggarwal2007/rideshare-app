/**
 * Tests for components/EmergencyContactInput.js
 */
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import EmergencyContactInput from '../EmergencyContactInput';

// Mock CustomDropdown since it's used internally
jest.mock('../CustomDropdown', () => {
	const { TouchableOpacity, Text } = require('react-native');
	return function MockDropdown({ options, value, onSelect, placeholder }) {
		return (
			<TouchableOpacity
				testID="dropdown"
				onPress={() => onSelect(options[0])}
			>
				<Text>{value || placeholder}</Text>
			</TouchableOpacity>
		);
	};
});

describe('EmergencyContactInput', () => {
	const defaultContact = {
		name: '',
		phone: '',
		relationship: '',
	};

	const filledContact = {
		name: 'John Doe',
		phone: '(123) 456-7890',
		relationship: 'Parent',
	};

	const defaultProps = {
		contact: defaultContact,
		index: 0,
		onUpdate: jest.fn(),
		onRemove: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders contact header with index', () => {
			const { getByText } = render(
				<EmergencyContactInput {...defaultProps} index={0} />
			);
			expect(getByText('Contact 1')).toBeTruthy();
		});

		it('renders correct contact number for different indices', () => {
			const { getByText, rerender } = render(
				<EmergencyContactInput {...defaultProps} index={0} />
			);
			expect(getByText('Contact 1')).toBeTruthy();

			rerender(<EmergencyContactInput {...defaultProps} index={2} />);
			expect(getByText('Contact 3')).toBeTruthy();
		});

		it('renders name input field', () => {
			const { getByPlaceholderText } = render(
				<EmergencyContactInput {...defaultProps} />
			);
			expect(getByPlaceholderText('Contact name')).toBeTruthy();
		});

		it('renders phone input field', () => {
			const { getByPlaceholderText } = render(
				<EmergencyContactInput {...defaultProps} />
			);
			expect(getByPlaceholderText('(123) 456-7890')).toBeTruthy();
		});

		it('renders remove button', () => {
			const { getByText } = render(
				<EmergencyContactInput {...defaultProps} />
			);
			expect(getByText('Remove')).toBeTruthy();
		});

		it('renders input labels', () => {
			const { getByText } = render(
				<EmergencyContactInput {...defaultProps} />
			);
			expect(getByText('Name')).toBeTruthy();
			expect(getByText('Phone Number')).toBeTruthy();
			expect(getByText('Relationship')).toBeTruthy();
		});

		it('displays filled contact values', () => {
			const { getByDisplayValue } = render(
				<EmergencyContactInput {...defaultProps} contact={filledContact} />
			);
			expect(getByDisplayValue('John Doe')).toBeTruthy();
			expect(getByDisplayValue('(123) 456-7890')).toBeTruthy();
		});
	});

	describe('input interactions', () => {
		it('calls onUpdate when name is changed', () => {
			const onUpdate = jest.fn();
			const { getByPlaceholderText } = render(
				<EmergencyContactInput {...defaultProps} onUpdate={onUpdate} />
			);

			fireEvent.changeText(getByPlaceholderText('Contact name'), 'Jane Doe');
			expect(onUpdate).toHaveBeenCalledWith(0, 'name', 'Jane Doe');
		});

		it('calls onUpdate when phone is changed', () => {
			const onUpdate = jest.fn();
			const { getByPlaceholderText } = render(
				<EmergencyContactInput {...defaultProps} onUpdate={onUpdate} />
			);

			fireEvent.changeText(
				getByPlaceholderText('(123) 456-7890'),
				'(987) 654-3210'
			);
			expect(onUpdate).toHaveBeenCalledWith(0, 'phone', '(987) 654-3210');
		});

		it('calls onUpdate with correct index', () => {
			const onUpdate = jest.fn();
			const { getByPlaceholderText } = render(
				<EmergencyContactInput {...defaultProps} index={2} onUpdate={onUpdate} />
			);

			fireEvent.changeText(getByPlaceholderText('Contact name'), 'Test');
			expect(onUpdate).toHaveBeenCalledWith(2, 'name', 'Test');
		});

		it('calls onUpdate when relationship is selected', () => {
			const onUpdate = jest.fn();
			const { getByTestId } = render(
				<EmergencyContactInput {...defaultProps} onUpdate={onUpdate} />
			);

			const dropdown = getByTestId('dropdown');
			fireEvent.press(dropdown);
			expect(onUpdate).toHaveBeenCalledWith(0, 'relationship', 'Parent');
		});
	});

	describe('remove button', () => {
		it('calls onRemove when remove button is pressed', () => {
			const onRemove = jest.fn();
			const { getByText } = render(
				<EmergencyContactInput {...defaultProps} onRemove={onRemove} />
			);

			fireEvent.press(getByText('Remove'));
			expect(onRemove).toHaveBeenCalledTimes(1);
		});

		it('calls onRemove multiple times when pressed multiple times', () => {
			const onRemove = jest.fn();
			const { getByText } = render(
				<EmergencyContactInput {...defaultProps} onRemove={onRemove} />
			);

			fireEvent.press(getByText('Remove'));
			fireEvent.press(getByText('Remove'));
			expect(onRemove).toHaveBeenCalledTimes(2);
		});
	});

	describe('input configurations', () => {
		it('name input has autoCapitalize words', () => {
			const { getByPlaceholderText } = render(
				<EmergencyContactInput {...defaultProps} />
			);
			const input = getByPlaceholderText('Contact name');
			expect(input.props.autoCapitalize).toBe('words');
		});

		it('name input has autoCorrect disabled', () => {
			const { getByPlaceholderText } = render(
				<EmergencyContactInput {...defaultProps} />
			);
			const input = getByPlaceholderText('Contact name');
			expect(input.props.autoCorrect).toBe(false);
		});

		it('phone input has phone-pad keyboard', () => {
			const { getByPlaceholderText } = render(
				<EmergencyContactInput {...defaultProps} />
			);
			const input = getByPlaceholderText('(123) 456-7890');
			expect(input.props.keyboardType).toBe('phone-pad');
		});
	});

	describe('edge cases', () => {
		it('handles empty contact object', () => {
			const emptyContact = { name: '', phone: '', relationship: '' };
			expect(() => {
				render(
					<EmergencyContactInput {...defaultProps} contact={emptyContact} />
				);
			}).not.toThrow();
		});

		it('handles special characters in name', () => {
			const specialContact = {
				...defaultContact,
				name: "O'Brien-Smith, Jr.",
			};
			const { getByDisplayValue } = render(
				<EmergencyContactInput {...defaultProps} contact={specialContact} />
			);
			expect(getByDisplayValue("O'Brien-Smith, Jr.")).toBeTruthy();
		});

		it('handles international phone numbers', () => {
			const intlContact = {
				...defaultContact,
				phone: '+1 (234) 567-8901',
			};
			const { getByDisplayValue } = render(
				<EmergencyContactInput {...defaultProps} contact={intlContact} />
			);
			expect(getByDisplayValue('+1 (234) 567-8901')).toBeTruthy();
		});
	});
});
