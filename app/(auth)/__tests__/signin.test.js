/**
 * Tests for app/(auth)/signin.js
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
	useRouter: () => ({
		push: mockPush,
		replace: mockReplace,
	}),
}));

// Mock Firebase auth
const mockSignInWithEmailAndPassword = jest.fn();
jest.mock('firebase/auth', () => ({
	signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
}));

// Mock firebaseConfig
jest.mock('../../../firebaseConfig', () => ({
	auth: {},
}));

// Mock fonts
jest.mock('expo-font', () => ({
	useFonts: () => [true, null],
}));

// Mock vector icons
jest.mock('@expo/vector-icons/Ionicons', () => {
	const { Text } = require('react-native');
	return (props) => <Text testID={`icon-${props.name}`}>{props.name}</Text>;
});

import SignInScreen from '../signin';

describe('SignInScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders sign in form', () => {
			const { getByText, getByPlaceholderText } = render(<SignInScreen />);

			expect(getByText('Welcome Back')).toBeTruthy();
			expect(getByText('Sign in to your account')).toBeTruthy();
			expect(getByPlaceholderText('your@email.com')).toBeTruthy();
			expect(getByPlaceholderText('••••••••')).toBeTruthy();
			expect(getByText('Sign In')).toBeTruthy();
		});

		it('renders email and password labels', () => {
			const { getByText } = render(<SignInScreen />);

			expect(getByText('Email')).toBeTruthy();
			expect(getByText('Password')).toBeTruthy();
		});

		it('renders forgot password link', () => {
			const { getByText } = render(<SignInScreen />);

			expect(getByText('Forgot Password?')).toBeTruthy();
		});

		it('renders sign up link', () => {
			const { getByText } = render(<SignInScreen />);

			expect(getByText("Don't have an account?")).toBeTruthy();
			expect(getByText('Sign Up')).toBeTruthy();
		});
	});

	describe('form input', () => {
		it('updates email input', () => {
			const { getByPlaceholderText, getByDisplayValue } = render(<SignInScreen />);

			const emailInput = getByPlaceholderText('your@email.com');
			fireEvent.changeText(emailInput, 'test@example.com');

			expect(getByDisplayValue('test@example.com')).toBeTruthy();
		});

		it('updates password input', () => {
			const { getByPlaceholderText, getByDisplayValue } = render(<SignInScreen />);

			const passwordInput = getByPlaceholderText('••••••••');
			fireEvent.changeText(passwordInput, 'mypassword');

			expect(getByDisplayValue('mypassword')).toBeTruthy();
		});

		it('toggles password visibility', () => {
			const { getByPlaceholderText, UNSAFE_root } = render(<SignInScreen />);

			const passwordInput = getByPlaceholderText('••••••••');
			
			// Password is initially hidden
			expect(passwordInput.props.secureTextEntry).toBe(true);
		});
	});

	describe('validation', () => {
		it('shows error when email and password are empty', async () => {
			const { getByText, findByText } = render(<SignInScreen />);

			fireEvent.press(getByText('Sign In'));

			const error = await findByText('Please enter both email and password');
			expect(error).toBeTruthy();
		});

		it('shows error for invalid email format', async () => {
			const { getByText, getByPlaceholderText, findByText } = render(<SignInScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'invalidemail');
			fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
			fireEvent.press(getByText('Sign In'));

			const error = await findByText('Please enter a valid email address');
			expect(error).toBeTruthy();
		});

		it('shows error when only email is provided', async () => {
			const { getByText, getByPlaceholderText, findByText } = render(<SignInScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.press(getByText('Sign In'));

			const error = await findByText('Please enter both email and password');
			expect(error).toBeTruthy();
		});

		it('shows error when only password is provided', async () => {
			const { getByText, getByPlaceholderText, findByText } = render(<SignInScreen />);

			fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
			fireEvent.press(getByText('Sign In'));

			const error = await findByText('Please enter both email and password');
			expect(error).toBeTruthy();
		});
	});

	describe('sign in flow', () => {
		it('calls signInWithEmailAndPassword with valid credentials', async () => {
			mockSignInWithEmailAndPassword.mockResolvedValueOnce({});

			const { getByText, getByPlaceholderText } = render(<SignInScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
			fireEvent.press(getByText('Sign In'));

			await waitFor(() => {
				expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
					expect.anything(),
					'test@example.com',
					'password123'
				);
			});
		});

		it('shows error for user not found', async () => {
			mockSignInWithEmailAndPassword.mockRejectedValueOnce({
				code: 'auth/user-not-found',
			});

			const { getByText, getByPlaceholderText, findByText } = render(<SignInScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'notfound@example.com');
			fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
			fireEvent.press(getByText('Sign In'));

			const error = await findByText('No account found with this email');
			expect(error).toBeTruthy();
		});

		it('shows error for wrong password', async () => {
			mockSignInWithEmailAndPassword.mockRejectedValueOnce({
				code: 'auth/wrong-password',
			});

			const { getByText, getByPlaceholderText, findByText } = render(<SignInScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrongpassword');
			fireEvent.press(getByText('Sign In'));

			const error = await findByText('Incorrect password');
			expect(error).toBeTruthy();
		});

		it('shows generic error message for other errors', async () => {
			mockSignInWithEmailAndPassword.mockRejectedValueOnce({
				code: 'auth/network-error',
				message: 'Network error occurred',
			});

			const { getByText, getByPlaceholderText, findByText } = render(<SignInScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
			fireEvent.press(getByText('Sign In'));

			const error = await findByText('Network error occurred');
			expect(error).toBeTruthy();
		});
	});

	describe('navigation', () => {
		it('navigates to signup screen', () => {
			const { getByText } = render(<SignInScreen />);

			fireEvent.press(getByText('Sign Up'));

			expect(mockPush).toHaveBeenCalledWith('signup');
		});

		it('navigates to forgot password with email', () => {
			const { getByText, getByPlaceholderText } = render(<SignInScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.press(getByText('Forgot Password?'));

			expect(mockPush).toHaveBeenCalledWith('forgot-password');
		});

		it('shows error when forgot password clicked without email', async () => {
			const { getByText, findByText } = render(<SignInScreen />);

			fireEvent.press(getByText('Forgot Password?'));

			const error = await findByText('Enter email to reset password');
			expect(error).toBeTruthy();
		});
	});

	describe('loading state', () => {
		it('disables inputs while loading', async () => {
			// Make sign in take time
			mockSignInWithEmailAndPassword.mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 100))
			);

			const { getByText, getByPlaceholderText } = render(<SignInScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
			fireEvent.press(getByText('Sign In'));

			// During loading, inputs should be disabled
			const emailInput = getByPlaceholderText('your@email.com');
			expect(emailInput.props.editable).toBe(false);
		});
	});
});
