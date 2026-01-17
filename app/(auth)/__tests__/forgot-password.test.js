/**
 * Tests for app/(auth)/forgot-password.js
 */
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

// Mock expo-router
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
	useRouter: () => ({
		back: mockBack,
	}),
}));

// Mock Firebase auth
const mockSendPasswordResetEmail = jest.fn();
jest.mock('firebase/auth', () => ({
	sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
}));

// Mock firebaseConfig
jest.mock('../../../firebaseConfig', () => ({
	auth: {},
}));

// Mock fonts
jest.mock('expo-font', () => ({
	useFonts: () => [true, null],
}));

// Mock @expo-google-fonts/montserrat
jest.mock('@expo-google-fonts/montserrat', () => ({
	Montserrat_700Bold: {},
	useFonts: () => [true, null],
}));

// Mock @expo-google-fonts/lato
jest.mock('@expo-google-fonts/lato', () => ({
	Lato_400Regular: {},
}));

// Mock vector icons
jest.mock('@expo/vector-icons/Ionicons', () => {
	const { Text } = require('react-native');
	return (props) => <Text testID={`icon-${props.name}`}>{props.name}</Text>;
});

// Silence console.error for expected error handling logs
const originalConsoleError = console.error;
beforeAll(() => {
	console.error = jest.fn();
});
afterAll(() => {
	console.error = originalConsoleError;
});

import ForgotPasswordScreen from '../forgot-password';

describe('ForgotPasswordScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders forgot password form', () => {
			const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);

			expect(getByText('Reset Password')).toBeTruthy();
			expect(
				getByText(/Enter your email and we'll send you a link to reset your password/)
			).toBeTruthy();
			expect(getByPlaceholderText('your@email.com')).toBeTruthy();
		});

		it('renders back button', () => {
			const { getByText, getByTestId } = render(<ForgotPasswordScreen />);

			expect(getByText('Back')).toBeTruthy();
			expect(getByTestId('icon-chevron-back')).toBeTruthy();
		});

		it('renders send reset link button', () => {
			const { getByText } = render(<ForgotPasswordScreen />);

			expect(getByText('Send Reset Link')).toBeTruthy();
		});

		it('renders info box with instructions', () => {
			const { getByText } = render(<ForgotPasswordScreen />);

			expect(
				getByText(/Check your email.*including spam folder.*for the reset link/)
			).toBeTruthy();
		});
	});

	describe('form validation', () => {
		it('shows error when email is empty', async () => {
			const { getByText, findByText } = render(<ForgotPasswordScreen />);

			await act(async () => {
				fireEvent.press(getByText('Send Reset Link'));
			});

			const error = await findByText('Please enter your email address');
			expect(error).toBeTruthy();
		});

		it('shows error for invalid email', async () => {
			const { getByText, getByPlaceholderText, findByText } = render(
				<ForgotPasswordScreen />
			);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'invalidemail');
			await act(async () => {
				fireEvent.press(getByText('Send Reset Link'));
			});

			const error = await findByText('Please enter a valid email address');
			expect(error).toBeTruthy();
		});
	});

	describe('password reset flow', () => {
		it('calls sendPasswordResetEmail with valid email', async () => {
			mockSendPasswordResetEmail.mockResolvedValueOnce();

			const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			await act(async () => {
				fireEvent.press(getByText('Send Reset Link'));
			});

			await waitFor(() => {
				expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
					expect.anything(),
					'test@example.com'
				);
			});
		});

		it('shows success message after sending reset email', async () => {
			mockSendPasswordResetEmail.mockResolvedValueOnce();

			const { getByText, getByPlaceholderText, findByText } = render(
				<ForgotPasswordScreen />
			);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			await act(async () => {
				fireEvent.press(getByText('Send Reset Link'));
			});

			const success = await findByText('Password reset email sent! Check your inbox.');
			expect(success).toBeTruthy();
		});

		it('clears email input after successful reset', async () => {
			mockSendPasswordResetEmail.mockResolvedValueOnce();

			const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);

			const emailInput = getByPlaceholderText('your@email.com');
			fireEvent.changeText(emailInput, 'test@example.com');
			await act(async () => {
				fireEvent.press(getByText('Send Reset Link'));
			});

			await waitFor(() => {
				expect(emailInput.props.value).toBe('');
			});
		});

		it('shows error for user not found', async () => {
			mockSendPasswordResetEmail.mockRejectedValueOnce({
				code: 'auth/user-not-found',
			});

			const { getByText, getByPlaceholderText, findByText } = render(
				<ForgotPasswordScreen />
			);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'notfound@example.com');
			await act(async () => {
				fireEvent.press(getByText('Send Reset Link'));
			});

			const error = await findByText('No account found with this email address');
			expect(error).toBeTruthy();
		});

		it('shows error for invalid email from Firebase', async () => {
			mockSendPasswordResetEmail.mockRejectedValueOnce({
				code: 'auth/invalid-email',
			});

			const { getByText, getByPlaceholderText, findByText } = render(
				<ForgotPasswordScreen />
			);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			await act(async () => {
				fireEvent.press(getByText('Send Reset Link'));
			});

			const error = await findByText('Invalid email address');
			expect(error).toBeTruthy();
		});

		it('shows generic error for other Firebase errors', async () => {
			mockSendPasswordResetEmail.mockRejectedValueOnce({
				code: 'auth/network-error',
				message: 'Network error occurred',
			});

			const { getByText, getByPlaceholderText, findByText } = render(
				<ForgotPasswordScreen />
			);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			await act(async () => {
				fireEvent.press(getByText('Send Reset Link'));
			});

			const error = await findByText('Network error occurred');
			expect(error).toBeTruthy();
		});
	});

	describe('navigation', () => {
		it('navigates back when back button pressed', () => {
			const { getByText } = render(<ForgotPasswordScreen />);

			fireEvent.press(getByText('Back'));

			expect(mockBack).toHaveBeenCalled();
		});
	});

	describe('loading state', () => {
		it('shows ActivityIndicator while loading', async () => {
			// Set up a promise that we can resolve manually
			let resolvePromise;
			mockSendPasswordResetEmail.mockImplementation(
				() =>
					new Promise((resolve) => {
						resolvePromise = resolve;
					})
			);

			const { getByText, getByPlaceholderText, queryByText } = render(
				<ForgotPasswordScreen />
			);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');

			await act(async () => {
				fireEvent.press(getByText('Send Reset Link'));
			});

			// Button text should be hidden during loading
			expect(queryByText('Send Reset Link')).toBeFalsy();

			// Clean up by resolving the promise
			await act(async () => {
				resolvePromise();
			});
		});
	});
});
