/**
 * Tests for hooks/useAuth.js
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAuth } from '../useAuth';

// Mock Firebase
const mockOnAuthStateChanged = jest.fn();
const mockGetDoc = jest.fn();

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
}));

jest.mock('firebase/firestore', () => ({
	doc: jest.fn((db, collection, id) => ({ id, collection })),
	getDoc: (...args) => mockGetDoc(...args),
}));

jest.mock('../../firebaseConfig', () => ({
	auth: { currentUser: null },
	db: {},
}));

describe('useAuth hook', () => {
	let unsubscribeMock;

	beforeEach(() => {
		jest.clearAllMocks();
		unsubscribeMock = jest.fn();
		mockOnAuthStateChanged.mockImplementation((auth, callback) => {
			// Store callback for later use
			mockOnAuthStateChanged.callback = callback;
			return unsubscribeMock;
		});
	});

	describe('initial state', () => {
		it('starts with loading true', () => {
			mockOnAuthStateChanged.mockImplementation(() => unsubscribeMock);
			
			const { result } = renderHook(() => useAuth());
			
			expect(result.current.loading).toBe(true);
		});

		it('starts with user as null', () => {
			mockOnAuthStateChanged.mockImplementation(() => unsubscribeMock);
			
			const { result } = renderHook(() => useAuth());
			
			expect(result.current.user).toBe(null);
		});

		it('starts with profileComplete as false', () => {
			mockOnAuthStateChanged.mockImplementation(() => unsubscribeMock);
			
			const { result } = renderHook(() => useAuth());
			
			expect(result.current.profileComplete).toBe(false);
		});
	});

	describe('authentication state changes', () => {
		it('sets user to null when not authenticated', async () => {
			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(null);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.user).toBe(null);
			expect(result.current.profileComplete).toBe(false);
		});

		it('sets user when authenticated', async () => {
			const mockUser = { uid: 'user123', email: 'test@example.com' };
			
			mockGetDoc.mockResolvedValue({
				exists: () => false,
			});

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.user).toEqual(mockUser);
		});

		it('sets profileComplete to true when profile is complete', async () => {
			const mockUser = { uid: 'user123' };
			
			mockGetDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({
					profileComplete: true,
					name: 'John Doe',
					school: 'UCLA',
					major: 'Computer Science',
					graduationYear: '2025',
				}),
			});

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.profileComplete).toBe(true);
			});
		});

		it('sets profileComplete to false when profile is incomplete', async () => {
			const mockUser = { uid: 'user123' };
			
			mockGetDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({
					profileComplete: false,
					name: 'John',
					// Missing other required fields
				}),
			});

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.profileComplete).toBe(false);
		});

		it('sets profileComplete to false when user document does not exist', async () => {
			const mockUser = { uid: 'user123' };
			
			mockGetDoc.mockResolvedValue({
				exists: () => false,
			});

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.profileComplete).toBe(false);
		});
	});

	describe('cleanup', () => {
		it('unsubscribes on unmount', () => {
			mockOnAuthStateChanged.mockImplementation(() => unsubscribeMock);
			
			const { unmount } = renderHook(() => useAuth());
			
			unmount();
			
			expect(unsubscribeMock).toHaveBeenCalled();
		});
	});

	describe('refreshProfile', () => {
		it('provides refreshProfile function', () => {
			mockOnAuthStateChanged.mockImplementation(() => unsubscribeMock);
			
			const { result } = renderHook(() => useAuth());
			
			expect(typeof result.current.refreshProfile).toBe('function');
		});

		it('refreshProfile updates profile data', async () => {
			const mockUser = { uid: 'user123' };
			
			mockGetDoc
				.mockResolvedValueOnce({
					exists: () => false,
				})
				.mockResolvedValueOnce({
					exists: () => true,
					data: () => ({
						profileComplete: true,
						name: 'John Doe',
						school: 'UCLA',
						major: 'CS',
						graduationYear: '2025',
					}),
				});

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Now refresh profile
			await act(async () => {
				await result.current.refreshProfile('user123');
			});

			await waitFor(() => {
				expect(result.current.profileComplete).toBe(true);
			});
		});

		it('refreshProfile handles missing userId', async () => {
			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(null);
				return unsubscribeMock;
			});

			// Mock auth.currentUser to be null
			require('../../firebaseConfig').auth.currentUser = null;

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			await act(async () => {
				await result.current.refreshProfile();
			});

			expect(result.current.profileComplete).toBe(false);
		});
	});

	describe('error handling', () => {
		it('handles getDoc error gracefully', async () => {
			const mockUser = { uid: 'user123' };
			
			mockGetDoc.mockRejectedValue(new Error('Firestore error'));

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			// Suppress console.error for this test
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.profileComplete).toBe(false);
			
			consoleSpy.mockRestore();
		});
	});

	describe('profile completeness validation', () => {
		it('requires profileComplete flag to be true', async () => {
			const mockUser = { uid: 'user123' };
			
			mockGetDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({
					profileComplete: false, // Flag is false
					name: 'John',
					school: 'UCLA',
					major: 'CS',
					graduationYear: '2025',
				}),
			});

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.profileComplete).toBe(false);
		});

		it('requires name field', async () => {
			const mockUser = { uid: 'user123' };
			
			mockGetDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({
					profileComplete: true,
					// name is missing
					school: 'UCLA',
					major: 'CS',
					graduationYear: '2025',
				}),
			});

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.profileComplete).toBe(false);
		});

		it('requires school field', async () => {
			const mockUser = { uid: 'user123' };
			
			mockGetDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({
					profileComplete: true,
					name: 'John',
					// school is missing
					major: 'CS',
					graduationYear: '2025',
				}),
			});

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.profileComplete).toBe(false);
		});

		it('requires major field', async () => {
			const mockUser = { uid: 'user123' };
			
			mockGetDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({
					profileComplete: true,
					name: 'John',
					school: 'UCLA',
					// major is missing
					graduationYear: '2025',
				}),
			});

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.profileComplete).toBe(false);
		});

		it('requires graduationYear field', async () => {
			const mockUser = { uid: 'user123' };
			
			mockGetDoc.mockResolvedValue({
				exists: () => true,
				data: () => ({
					profileComplete: true,
					name: 'John',
					school: 'UCLA',
					major: 'CS',
					// graduationYear is missing
				}),
			});

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.profileComplete).toBe(false);
		});

		it('refreshProfile handles error gracefully', async () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
			const mockUser = { uid: 'user123' };
			
			// First call succeeds for initial auth
			mockGetDoc.mockResolvedValueOnce({
				exists: () => true,
				data: () => ({
					profileComplete: true,
					name: 'John',
					school: 'UCLA',
					major: 'CS',
					graduationYear: '2024',
				}),
			});

			mockOnAuthStateChanged.mockImplementation((auth, callback) => {
				callback(mockUser);
				return unsubscribeMock;
			});

			const { result } = renderHook(() => useAuth());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Second call for refreshProfile fails
			mockGetDoc.mockRejectedValueOnce(new Error('Network error'));

			// Now refresh profile - should fail and handle error
			await act(async () => {
				await result.current.refreshProfile('user123');
			});

			// Profile complete should be false due to error handling
			expect(result.current.profileComplete).toBe(false);
			
			consoleSpy.mockRestore();
		});
	});
});
