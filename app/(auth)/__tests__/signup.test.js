/**
 * Tests for app/(auth)/signup.js
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
	useRouter: () => ({
		push: mockPush,
	}),
}));

// Mock Firebase auth
const mockCreateUserWithEmailAndPassword = jest.fn();
jest.mock('firebase/auth', () => ({
	createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
}));

// Mock Firebase firestore (dynamic import)
const mockSetDoc = jest.fn();
jest.mock('firebase/firestore', () => ({
	doc: jest.fn(() => ({ id: 'user123' })),
	setDoc: (...args) => mockSetDoc(...args),
	serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
}));

// Mock firebaseConfig
jest.mock('../../../firebaseConfig', () => ({
	auth: {},
	db: {},
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

// Mock vector icons
jest.mock('@expo/vector-icons/Ionicons', () => {
	const { Text } = require('react-native');
	return (props) => <Text testID={`icon-${props.name}`}>{props.name}</Text>;
});

import SignUpScreen from '../signup';

describe('SignUpScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders signup form', () => {
			const { getAllByText, getByText } = render(<SignUpScreen />);

			// "Create Account" appears twice - as title and button
			expect(getAllByText('Create Account').length).toBe(2);
			expect(getByText('Join RideShare today')).toBeTruthy();
		});

		it('renders all input fields', () => {
			const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(
				<SignUpScreen />
			);

			// Labels have asterisks attached - use partial matching
			expect(getByText(/Email/)).toBeTruthy();
			expect(getByText(/^Password/)).toBeTruthy();
			expect(getByText(/Confirm Password/)).toBeTruthy();
			expect(getByPlaceholderText('your@email.com')).toBeTruthy();
			expect(getAllByPlaceholderText('••••••••').length).toBe(2);
		});

		it('renders password requirements hint', () => {
			const { getByText } = render(<SignUpScreen />);

			expect(
				getByText('Min 8 characters, 1 uppercase letter, 1 number')
			).toBeTruthy();
		});

		it('renders sign in link', () => {
			const { getByText } = render(<SignUpScreen />);

			expect(getByText(/Already have an account/)).toBeTruthy();
			expect(getByText('Sign In')).toBeTruthy();
		});
	});

	describe('form validation', () => {
		it('shows error when fields are empty', async () => {
			const { getAllByText, findByText } = render(<SignUpScreen />);

			// Get the button (second "Create Account")
			const createAccountButtons = getAllByText('Create Account');
			fireEvent.press(createAccountButtons[1]); // Button is second element

			const error = await findByText('Please fill in all fields');
			expect(error).toBeTruthy();
		});

		it('shows error for invalid email', async () => {
			const { getAllByText, getByPlaceholderText, getAllByPlaceholderText, findByText } =
				render(<SignUpScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'invalidemail');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Password1');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Password1');
			fireEvent.press(getAllByText('Create Account')[1]);

			const error = await findByText('Please enter a valid email address');
			expect(error).toBeTruthy();
		});

		it('shows error for weak password - too short', async () => {
			const { getAllByText, getByPlaceholderText, getAllByPlaceholderText, findByText } =
				render(<SignUpScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Pass1'); // Too short
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Pass1');
			fireEvent.press(getAllByText('Create Account')[1]);

			const error = await findByText(
				'Password must be at least 8 characters with 1 uppercase letter and 1 number'
			);
			expect(error).toBeTruthy();
		});

		it('shows error for weak password - no uppercase', async () => {
			const { getAllByText, getByPlaceholderText, getAllByPlaceholderText, findByText } =
				render(<SignUpScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'password1'); // No uppercase
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'password1');
			fireEvent.press(getAllByText('Create Account')[1]);

			const error = await findByText(
				'Password must be at least 8 characters with 1 uppercase letter and 1 number'
			);
			expect(error).toBeTruthy();
		});

		it('shows error for weak password - no number', async () => {
			const { getAllByText, getByPlaceholderText, getAllByPlaceholderText, findByText } =
				render(<SignUpScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Password'); // No number
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Password');
			fireEvent.press(getAllByText('Create Account')[1]);

			const error = await findByText(
				'Password must be at least 8 characters with 1 uppercase letter and 1 number'
			);
			expect(error).toBeTruthy();
		});

		it('shows error when passwords do not match', async () => {
			const { getAllByText, getByPlaceholderText, getAllByPlaceholderText, findByText } =
				render(<SignUpScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Password1');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Password2');
			fireEvent.press(getAllByText('Create Account')[1]);

			const error = await findByText('Passwords do not match');
			expect(error).toBeTruthy();
		});
	});

	describe('signup flow', () => {
		it('calls createUserWithEmailAndPassword with valid data', async () => {
			const mockUser = { uid: 'user123', email: 'test@example.com' };
			mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({
				user: mockUser,
			});
			mockSetDoc.mockResolvedValueOnce();

			const { getAllByText, getByPlaceholderText, getAllByPlaceholderText } = render(
				<SignUpScreen />
			);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Password1');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Password1');
			fireEvent.press(getAllByText('Create Account')[1]);

			await waitFor(() => {
				expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
					expect.anything(),
					'test@example.com',
					'Password1'
				);
			});
		});

		it('shows error when email already in use', async () => {
			mockCreateUserWithEmailAndPassword.mockRejectedValueOnce({
				code: 'auth/email-already-in-use',
			});

			const { getAllByText, getByPlaceholderText, getAllByPlaceholderText, findByText } =
				render(<SignUpScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'existing@example.com');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Password1');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Password1');
			fireEvent.press(getAllByText('Create Account')[1]);

			const error = await findByText('Email already registered. Please sign in instead.');
			expect(error).toBeTruthy();
		});

		it('shows error for weak password from Firebase', async () => {
			mockCreateUserWithEmailAndPassword.mockRejectedValueOnce({
				code: 'auth/weak-password',
			});

			const { getAllByText, getByPlaceholderText, getAllByPlaceholderText, findByText } =
				render(<SignUpScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Password1');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Password1');
			fireEvent.press(getAllByText('Create Account')[1]);

			const error = await findByText(
				'Password is too weak. Please use a stronger password.'
			);
			expect(error).toBeTruthy();
		});

		it('shows error for invalid email from Firebase', async () => {
			mockCreateUserWithEmailAndPassword.mockRejectedValueOnce({
				code: 'auth/invalid-email',
			});

			const { getAllByText, getByPlaceholderText, getAllByPlaceholderText, findByText } =
				render(<SignUpScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Password1');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Password1');
			fireEvent.press(getAllByText('Create Account')[1]);

			const error = await findByText('Invalid email address');
			expect(error).toBeTruthy();
		});

		it('shows generic error for other Firebase errors', async () => {
			mockCreateUserWithEmailAndPassword.mockRejectedValueOnce({
				code: 'auth/network-error',
				message: 'Network error occurred',
			});

			const { getAllByText, getByPlaceholderText, getAllByPlaceholderText, findByText } =
				render(<SignUpScreen />);

			fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[0], 'Password1');
			fireEvent.changeText(getAllByPlaceholderText('••••••••')[1], 'Password1');
			fireEvent.press(getAllByText('Create Account')[1]);

			const error = await findByText('Network error occurred');
			expect(error).toBeTruthy();
		});
	});

	describe('navigation', () => {
		it('navigates to signin screen', () => {
			const { getByText } = render(<SignUpScreen />);

			fireEvent.press(getByText('Sign In'));

			expect(mockPush).toHaveBeenCalledWith('/signin');
		});
	});

	describe('password visibility', () => {
		it('toggles password visibility', () => {
			const { getAllByPlaceholderText, getAllByTestId } = render(<SignUpScreen />);

			const passwordInputs = getAllByPlaceholderText('••••••••');

			// Initially hidden
			expect(passwordInputs[0].props.secureTextEntry).toBe(true);
			expect(passwordInputs[1].props.secureTextEntry).toBe(true);

			// Find and press the eye icon for first password (there are two)
			const eyeIcons = getAllByTestId('icon-eye-off');
			expect(eyeIcons.length).toBe(2);
			fireEvent.press(eyeIcons[0]);
		});
	});
});
