/**
 * Tests for components/DateTimeInput.js
 */
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import DateTimeInput from '../DateTimeInput';

// Mock themed-text
jest.mock('../themed-text', () => ({
	ThemedText: ({ children, style }) => {
		const { Text } = require('react-native');
		return <Text style={style}>{children}</Text>;
	},
}));

describe('DateTimeInput', () => {
	const defaultDateProps = {
		type: 'date',
		label: 'Date',
		value: '',
		onChange: jest.fn(),
	};

	const defaultTimeProps = {
		type: 'time',
		label: 'Time',
		value: '',
		onChange: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('date input', () => {
		it('renders with label', () => {
			const { getByText } = render(<DateTimeInput {...defaultDateProps} />);
			expect(getByText('Date')).toBeTruthy();
		});

		it('renders required indicator when required', () => {
			const { getByText } = render(
				<DateTimeInput {...defaultDateProps} required={true} />
			);
			expect(getByText('*')).toBeTruthy();
		});

		it('shows date placeholder', () => {
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultDateProps} />
			);
			expect(getByPlaceholderText('YYYY-MM-DD')).toBeTruthy();
		});

		it('auto-formats date with dashes', () => {
			const onChange = jest.fn();
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultDateProps} onChange={onChange} />
			);

			const input = getByPlaceholderText('YYYY-MM-DD');

			// Enter year (4 digits) - auto-formatting adds dash after 4 digits
			fireEvent.changeText(input, '2024');
			expect(onChange).toHaveBeenCalledWith('2024-');

			// Enter year and month (6 digits) - adds second dash after 7 chars
			onChange.mockClear();
			fireEvent.changeText(input, '202406');
			expect(onChange).toHaveBeenCalledWith('2024-06-');

			// Enter full date (8 digits)
			onChange.mockClear();
			fireEvent.changeText(input, '20240615');
			expect(onChange).toHaveBeenCalledWith('2024-06-15');
		});

		it('removes non-numeric characters', () => {
			const onChange = jest.fn();
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultDateProps} onChange={onChange} />
			);

			const input = getByPlaceholderText('YYYY-MM-DD');
			fireEvent.changeText(input, '2024abc0615');
			expect(onChange).toHaveBeenCalledWith('2024-06-15');
		});

		it('validates month max to 12', () => {
			const onChange = jest.fn();
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultDateProps} onChange={onChange} />
			);

			const input = getByPlaceholderText('YYYY-MM-DD');
			fireEvent.changeText(input, '20241531');
			expect(onChange).toHaveBeenCalledWith('2024-12-31');
		});

		it('validates day max to 31', () => {
			const onChange = jest.fn();
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultDateProps} onChange={onChange} />
			);

			const input = getByPlaceholderText('YYYY-MM-DD');
			fireEvent.changeText(input, '20240699');
			expect(onChange).toHaveBeenCalledWith('2024-06-31');
		});

		it('has max length of 10 for date', () => {
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultDateProps} />
			);
			const input = getByPlaceholderText('YYYY-MM-DD');
			expect(input.props.maxLength).toBe(10);
		});

		it('displays current value', () => {
			const { getByDisplayValue } = render(
				<DateTimeInput {...defaultDateProps} value="2024-06-15" />
			);
			expect(getByDisplayValue('2024-06-15')).toBeTruthy();
		});
	});

	describe('time input', () => {
		it('renders with label', () => {
			const { getByText } = render(<DateTimeInput {...defaultTimeProps} />);
			expect(getByText('Time')).toBeTruthy();
		});

		it('shows time placeholder', () => {
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultTimeProps} />
			);
			expect(getByPlaceholderText('HH:mm')).toBeTruthy();
		});

		it('auto-formats time with colon', () => {
			const onChange = jest.fn();
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultTimeProps} onChange={onChange} />
			);

			const input = getByPlaceholderText('HH:mm');

			// Enter hour - auto-formatting adds colon after 2 digits
			fireEvent.changeText(input, '14');
			expect(onChange).toHaveBeenCalledWith('14:');

			// Enter full time
			onChange.mockClear();
			fireEvent.changeText(input, '1430');
			expect(onChange).toHaveBeenCalledWith('14:30');
		});

		it('validates hour max to 23', () => {
			const onChange = jest.fn();
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultTimeProps} onChange={onChange} />
			);

			const input = getByPlaceholderText('HH:mm');
			fireEvent.changeText(input, '2530');
			expect(onChange).toHaveBeenCalledWith('23:30');
		});

		it('validates minute max to 59', () => {
			const onChange = jest.fn();
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultTimeProps} onChange={onChange} />
			);

			const input = getByPlaceholderText('HH:mm');
			fireEvent.changeText(input, '1475');
			expect(onChange).toHaveBeenCalledWith('14:59');
		});

		it('has max length of 5 for time', () => {
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultTimeProps} />
			);
			const input = getByPlaceholderText('HH:mm');
			expect(input.props.maxLength).toBe(5);
		});

		it('removes non-numeric characters', () => {
			const onChange = jest.fn();
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultTimeProps} onChange={onChange} />
			);

			const input = getByPlaceholderText('HH:mm');
			fireEvent.changeText(input, '14:30abc');
			expect(onChange).toHaveBeenCalledWith('14:30');
		});
	});

	describe('keyboard type', () => {
		it('uses numeric keyboard for date', () => {
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultDateProps} />
			);
			const input = getByPlaceholderText('YYYY-MM-DD');
			expect(input.props.keyboardType).toBe('numeric');
		});

		it('uses numeric keyboard for time', () => {
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultTimeProps} />
			);
			const input = getByPlaceholderText('HH:mm');
			expect(input.props.keyboardType).toBe('numeric');
		});
	});

	describe('placeholder color', () => {
		it('applies custom placeholder color', () => {
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultDateProps} placeholderColor="#FF0000" />
			);
			const input = getByPlaceholderText('YYYY-MM-DD');
			expect(input.props.placeholderTextColor).toBe('#FF0000');
		});

		it('uses default placeholder color', () => {
			const { getByPlaceholderText } = render(
				<DateTimeInput {...defaultDateProps} />
			);
			const input = getByPlaceholderText('YYYY-MM-DD');
			expect(input.props.placeholderTextColor).toBe('#999');
		});
	});

	describe('default type', () => {
		it('defaults to date type', () => {
			const { getByPlaceholderText } = render(
				<DateTimeInput label="Default" value="" onChange={jest.fn()} />
			);
			expect(getByPlaceholderText('YYYY-MM-DD')).toBeTruthy();
		});
	});
});
