/**
 * Tests for app/index.js - Root entry point routing
 */
import { render } from '@testing-library/react-native';
import React from 'react';

// Mock expo-router
jest.mock('expo-router', () => ({
	Redirect: ({ href }) => {
		const { Text } = require('react-native');
		return <Text testID="redirect">{`Redirect to: ${href}`}</Text>;
	},
}));

// Mock useAuth hook
const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
	useAuth: () => mockUseAuth(),
}));

// Import after mocks
import Index from '../index';

describe('app/index.js - Root Routing', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('loading states', () => {
		it('shows loading indicator when loading is true', () => {
			mockUseAuth.mockReturnValue({
				user: null,
				profileComplete: false,
				loading: true,
				profileLoading: false,
			});

			const { getByTestId, queryByTestId } = render(<Index />);

			// Should show activity indicator, not redirect
			expect(queryByTestId('redirect')).toBeNull();
			// Should have a view container
		});

		it('shows loading indicator when profileLoading is true', () => {
			mockUseAuth.mockReturnValue({
				user: { uid: 'user123' },
				profileComplete: false,
				loading: false,
				profileLoading: true,
			});

			const { queryByTestId } = render(<Index />);

			expect(queryByTestId('redirect')).toBeNull();
		});

		it('shows loading indicator when both loading states are true', () => {
			mockUseAuth.mockReturnValue({
				user: null,
				profileComplete: false,
				loading: true,
				profileLoading: true,
			});

			const { queryByTestId } = render(<Index />);

			expect(queryByTestId('redirect')).toBeNull();
		});
	});

	describe('routing', () => {
		it('redirects to signup when not authenticated', () => {
			mockUseAuth.mockReturnValue({
				user: null,
				profileComplete: false,
				loading: false,
				profileLoading: false,
			});

			const { getByTestId } = render(<Index />);

			expect(getByTestId('redirect').props.children).toBe('Redirect to: /(auth)/signup');
		});

		it('redirects to profile-setup when authenticated but profile incomplete', () => {
			mockUseAuth.mockReturnValue({
				user: { uid: 'user123', email: 'test@example.com' },
				profileComplete: false,
				loading: false,
				profileLoading: false,
			});

			const { getByTestId } = render(<Index />);

			expect(getByTestId('redirect').props.children).toBe('Redirect to: /(auth)/profile-setup');
		});

		it('redirects to home when authenticated and profile complete', () => {
			mockUseAuth.mockReturnValue({
				user: { uid: 'user123', email: 'test@example.com' },
				profileComplete: true,
				loading: false,
				profileLoading: false,
			});

			const { getByTestId } = render(<Index />);

			expect(getByTestId('redirect').props.children).toBe('Redirect to: /(tabs)/home');
		});
	});

	describe('edge cases', () => {
		it('handles user object with empty values', () => {
			mockUseAuth.mockReturnValue({
				user: {}, // Empty user object
				profileComplete: true,
				loading: false,
				profileLoading: false,
			});

			const { getByTestId } = render(<Index />);

			// User exists (truthy), so should redirect to home
			expect(getByTestId('redirect').props.children).toBe('Redirect to: /(tabs)/home');
		});

		it('prioritizes loading state over auth checks', () => {
			mockUseAuth.mockReturnValue({
				user: { uid: 'user123' },
				profileComplete: true,
				loading: true, // Still loading
				profileLoading: false,
			});

			const { queryByTestId } = render(<Index />);

			// Should show loader, not redirect
			expect(queryByTestId('redirect')).toBeNull();
		});
	});
});
