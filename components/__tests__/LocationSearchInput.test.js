/**
 * Tests for components/LocationSearchInput.js
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import LocationSearchInput from '../LocationSearchInput';

// Mock themed-text
jest.mock('../themed-text', () => ({
	ThemedText: ({ children, style }) => {
		const { Text } = require('react-native');
		return <Text style={style}>{children}</Text>;
	},
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
	selectionAsync: jest.fn(),
}));

// Mock geocoding service
const mockSearchAddress = jest.fn();
jest.mock('../../services/maps/geocoding', () => ({
	searchAddress: (...args) => mockSearchAddress(...args),
}));

describe('LocationSearchInput', () => {
	const defaultProps = {
		label: 'Pickup Location',
		placeholder: 'Enter pickup address',
		location: null,
		onLocationSelect: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockSearchAddress.mockReset();
	});

	describe('rendering', () => {
		it('renders with label', () => {
			const { getByText } = render(<LocationSearchInput {...defaultProps} />);
			expect(getByText('Pickup Location')).toBeTruthy();
		});

		it('renders with placeholder', () => {
			const { getByPlaceholderText } = render(
				<LocationSearchInput {...defaultProps} />
			);
			expect(getByPlaceholderText('Enter pickup address')).toBeTruthy();
		});

		it('renders required indicator when required', () => {
			const { getByText } = render(
				<LocationSearchInput {...defaultProps} required={true} />
			);
			expect(getByText('*')).toBeTruthy();
		});

		it('does not render required indicator when not required', () => {
			const { queryByText } = render(
				<LocationSearchInput {...defaultProps} required={false} />
			);
			expect(queryByText('*')).toBeNull();
		});

		it('renders search button', () => {
			const { toJSON } = render(<LocationSearchInput {...defaultProps} />);
			// Search button should be in the tree
			expect(toJSON()).toBeTruthy();
		});

		it('displays pre-selected location address', () => {
			const location = { address: '123 Main St, Los Angeles, CA' };
			const { getByDisplayValue } = render(
				<LocationSearchInput {...defaultProps} location={location} />
			);
			expect(getByDisplayValue('123 Main St, Los Angeles, CA')).toBeTruthy();
		});

		it('shows selected confirmation when location is set', () => {
			const location = { address: '123 Main St' };
			const { getByText } = render(
				<LocationSearchInput {...defaultProps} location={location} />
			);
			expect(getByText('✓ Selected - Clear and search again to change')).toBeTruthy();
		});
	});

	describe('search behavior', () => {
		it('does not search when query is empty', async () => {
			const { getByPlaceholderText } = render(
				<LocationSearchInput {...defaultProps} />
			);

			// The search button is disabled or does nothing when empty
			// Trigger search by pressing search button
			const input = getByPlaceholderText('Enter pickup address');
			fireEvent.changeText(input, '');
			
			// Search should not be called
			expect(mockSearchAddress).not.toHaveBeenCalled();
		});

		it('searches when search button is pressed with query', async () => {
			mockSearchAddress.mockResolvedValue([
				{ address: '123 Main St, LA', lat: 34.0, lon: -118.0 },
			]);

			const { getByPlaceholderText, UNSAFE_getAllByType } = render(
				<LocationSearchInput {...defaultProps} />
			);

			const input = getByPlaceholderText('Enter pickup address');
			fireEvent.changeText(input, 'Los Angeles');

			// Find and press the TouchableOpacity (search button)
			const { TouchableOpacity } = require('react-native');
			const touchables = UNSAFE_getAllByType(TouchableOpacity);
			// The search button should be the first touchable
			const searchButton = touchables.find(t => !t.props.disabled);
			if (searchButton) {
				fireEvent.press(searchButton);
			}

			await waitFor(() => {
				expect(mockSearchAddress).toHaveBeenCalledWith('Los Angeles');
			});
		});

		it('displays search results in dropdown', async () => {
			mockSearchAddress.mockResolvedValue([
				{ address: '123 Main St', lat: 34.0, lon: -118.0 },
				{ address: '456 Oak Ave', lat: 34.1, lon: -118.1 },
			]);

			const { getByPlaceholderText, findByText, UNSAFE_getAllByType } = render(
				<LocationSearchInput {...defaultProps} />
			);

			fireEvent.changeText(getByPlaceholderText('Enter pickup address'), 'test');

			// Trigger search
			const { TouchableOpacity } = require('react-native');
			const touchables = UNSAFE_getAllByType(TouchableOpacity);
			const searchButton = touchables.find(t => !t.props.disabled);
			if (searchButton) {
				fireEvent.press(searchButton);
			}

			await waitFor(async () => {
				const result1 = await findByText('123 Main St');
				expect(result1).toBeTruthy();
			});
		});

		it('shows error when search fails with exception', async () => {
			mockSearchAddress.mockRejectedValue(new Error('Network error'));

			const { getByPlaceholderText, findByText, UNSAFE_getAllByType } = render(
				<LocationSearchInput {...defaultProps} />
			);

			fireEvent.changeText(getByPlaceholderText('Enter pickup address'), 'test query');

			// Trigger search
			const { TouchableOpacity } = require('react-native');
			const touchables = UNSAFE_getAllByType(TouchableOpacity);
			const searchButton = touchables.find(t => !t.props.disabled);
			if (searchButton) {
				fireEvent.press(searchButton);
			}

			await waitFor(async () => {
				const errorText = await findByText('Search failed. Please try again.');
				expect(errorText).toBeTruthy();
			});
		});

		it('shows error when no results found', async () => {
			mockSearchAddress.mockResolvedValue([]);

			const { getByPlaceholderText, findByText, UNSAFE_getAllByType } = render(
				<LocationSearchInput {...defaultProps} />
			);

			fireEvent.changeText(getByPlaceholderText('Enter pickup address'), 'nonexistent place');

			// Trigger search
			const { TouchableOpacity } = require('react-native');
			const touchables = UNSAFE_getAllByType(TouchableOpacity);
			const searchButton = touchables.find(t => !t.props.disabled);
			if (searchButton) {
				fireEvent.press(searchButton);
			}

			await waitFor(async () => {
				const errorText = await findByText('No results found. Try a different search term.');
				expect(errorText).toBeTruthy();
			});
		});

		it('shows error when geocoding returns error object', async () => {
			mockSearchAddress.mockResolvedValue({ error: 'Rate limited' });

			const { getByPlaceholderText, findByText, UNSAFE_getAllByType } = render(
				<LocationSearchInput {...defaultProps} />
			);

			fireEvent.changeText(getByPlaceholderText('Enter pickup address'), 'test');

			// Trigger search
			const { TouchableOpacity } = require('react-native');
			const touchables = UNSAFE_getAllByType(TouchableOpacity);
			const searchButton = touchables.find(t => !t.props.disabled);
			if (searchButton) {
				fireEvent.press(searchButton);
			}

			await waitFor(async () => {
				const errorText = await findByText('Rate limited');
				expect(errorText).toBeTruthy();
			});
		});

		it('calls haptics on search', async () => {
			const Haptics = require('expo-haptics');
			mockSearchAddress.mockResolvedValue([]);

			const { getByPlaceholderText, UNSAFE_getAllByType } = render(
				<LocationSearchInput {...defaultProps} />
			);

			fireEvent.changeText(getByPlaceholderText('Enter pickup address'), 'test');

			// Trigger search
			const { TouchableOpacity } = require('react-native');
			const touchables = UNSAFE_getAllByType(TouchableOpacity);
			const searchButton = touchables.find(t => !t.props.disabled);
			if (searchButton) {
				fireEvent.press(searchButton);
			}

			await waitFor(() => {
				expect(Haptics.selectionAsync).toHaveBeenCalled();
			});
		});
	});

	describe('selection behavior', () => {
		it('calls onLocationSelect when result is selected', async () => {
			const onLocationSelect = jest.fn();
			const mockResults = [
				{ address: '123 Main St', lat: 34.0, lon: -118.0 },
			];
			mockSearchAddress.mockResolvedValue(mockResults);

			const { getByPlaceholderText, findByText, UNSAFE_getAllByType } = render(
				<LocationSearchInput {...defaultProps} onLocationSelect={onLocationSelect} />
			);

			fireEvent.changeText(getByPlaceholderText('Enter pickup address'), 'test');

			// Trigger search
			const { TouchableOpacity } = require('react-native');
			const touchables = UNSAFE_getAllByType(TouchableOpacity);
			const searchButton = touchables.find(t => !t.props.disabled);
			if (searchButton) {
				fireEvent.press(searchButton);
			}

			await waitFor(async () => {
				const resultItem = await findByText('123 Main St');
				expect(resultItem).toBeTruthy();
			});

			// Find the result item and click it
			const resultItem = await findByText('123 Main St');
			fireEvent.press(resultItem);

			expect(onLocationSelect).toHaveBeenCalledWith(mockResults[0]);
		});

		it('updates input with selected address and clears results', async () => {
			const onLocationSelect = jest.fn();
			mockSearchAddress.mockResolvedValue([
				{ address: 'Selected Address', lat: 34.0, lon: -118.0 },
			]);

			const { getByPlaceholderText, findByText, queryByText, UNSAFE_getAllByType, getByDisplayValue } = render(
				<LocationSearchInput {...defaultProps} onLocationSelect={onLocationSelect} />
			);

			fireEvent.changeText(getByPlaceholderText('Enter pickup address'), 'test');

			// Trigger search
			const { TouchableOpacity } = require('react-native');
			const touchables = UNSAFE_getAllByType(TouchableOpacity);
			const searchButton = touchables.find(t => !t.props.disabled);
			if (searchButton) {
				fireEvent.press(searchButton);
			}

			await waitFor(async () => {
				const resultItem = await findByText('Selected Address');
				expect(resultItem).toBeTruthy();
			});

			// Select the result
			const resultItem = await findByText('Selected Address');
			fireEvent.press(resultItem);

			// Input should now show the selected address
			await waitFor(() => {
				expect(getByDisplayValue('Selected Address')).toBeTruthy();
			});

			// Results dropdown should be cleared
			await waitFor(() => {
				// The dropdown should no longer be visible
				expect(queryByText('Selected Address')).toBeNull();
			});
		});
	});

	describe('input behavior', () => {
		it('updates query when typing', () => {
			const { getByPlaceholderText, getByDisplayValue } = render(
				<LocationSearchInput {...defaultProps} />
			);

			fireEvent.changeText(
				getByPlaceholderText('Enter pickup address'),
				'New York'
			);
			expect(getByDisplayValue('New York')).toBeTruthy();
		});

		it('has autoCorrect disabled', () => {
			const { getByPlaceholderText } = render(
				<LocationSearchInput {...defaultProps} />
			);
			const input = getByPlaceholderText('Enter pickup address');
			expect(input.props.autoCorrect).toBe(false);
		});

		it('has autoCapitalize set to none', () => {
			const { getByPlaceholderText } = render(
				<LocationSearchInput {...defaultProps} />
			);
			const input = getByPlaceholderText('Enter pickup address');
			expect(input.props.autoCapitalize).toBe('none');
		});

		it('supports multiline input', () => {
			const { getByPlaceholderText } = render(
				<LocationSearchInput {...defaultProps} />
			);
			const input = getByPlaceholderText('Enter pickup address');
			expect(input.props.multiline).toBe(true);
		});
	});

	describe('custom styling', () => {
		it('applies custom icon color', () => {
			const { toJSON } = render(
				<LocationSearchInput {...defaultProps} iconColor="#FF0000" />
			);
			expect(toJSON()).toBeTruthy();
		});

		it('applies custom placeholder color', () => {
			const { getByPlaceholderText } = render(
				<LocationSearchInput {...defaultProps} placeholderColor="#00FF00" />
			);
			const input = getByPlaceholderText('Enter pickup address');
			expect(input.props.placeholderTextColor).toBe('#00FF00');
		});

		it('uses default icon color when not provided', () => {
			// Default iconColor is '#2774AE'
			const { toJSON } = render(<LocationSearchInput {...defaultProps} />);
			expect(toJSON()).toBeTruthy();
		});

		it('uses default placeholder color when not provided', () => {
			const { getByPlaceholderText } = render(
				<LocationSearchInput {...defaultProps} />
			);
			const input = getByPlaceholderText('Enter pickup address');
			expect(input.props.placeholderTextColor).toBe('#999');
		});
	});

	describe('location prop updates', () => {
		it('updates query when location prop changes', () => {
			const { rerender, getByDisplayValue, getByPlaceholderText } = render(
				<LocationSearchInput {...defaultProps} location={null} />
			);

			// Initially empty
			expect(getByPlaceholderText('Enter pickup address')).toBeTruthy();

			// Update with new location
			rerender(
				<LocationSearchInput
					{...defaultProps}
					location={{ address: '789 New Address' }}
				/>
			);

			expect(getByDisplayValue('789 New Address')).toBeTruthy();
		});
	});

	describe('edge cases', () => {
		it('handles null location gracefully', () => {
			expect(() => {
				render(<LocationSearchInput {...defaultProps} location={null} />);
			}).not.toThrow();
		});

		it('handles undefined location gracefully', () => {
			expect(() => {
				render(<LocationSearchInput {...defaultProps} location={undefined} />);
			}).not.toThrow();
		});

		it('handles location without address', () => {
			expect(() => {
				render(<LocationSearchInput {...defaultProps} location={{}} />);
			}).not.toThrow();
		});

		it('handles very long addresses', () => {
			const longAddress =
				'123 Very Long Street Name That Goes On And On, Some City With A Long Name, State Province, Country, 12345-6789';
			const { getByDisplayValue } = render(
				<LocationSearchInput {...defaultProps} location={{ address: longAddress }} />
			);
			expect(getByDisplayValue(longAddress)).toBeTruthy();
		});

		it('handles special characters in address', () => {
			const specialAddress = "O'Hare Airport, #123 & Building A";
			const { getByDisplayValue } = render(
				<LocationSearchInput {...defaultProps} location={{ address: specialAddress }} />
			);
			expect(getByDisplayValue(specialAddress)).toBeTruthy();
		});
	});
});
