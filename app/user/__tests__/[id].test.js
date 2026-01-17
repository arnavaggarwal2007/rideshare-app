/**
 * Tests for OtherUserProfileScreen
 * Tests user profile display, reviews, safety features (block/report)
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../../firebaseConfig', () => ({
  auth: { currentUser: { uid: 'current-user-123' } },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'current-user-123' },
  })),
}));

jest.mock('../../../store/slices/reviewsSlice', () => ({
  fetchUserReviewsThunk: jest.fn(() => ({ type: 'reviews/fetchUserReviews' })),
}));

jest.mock('../../../store/slices/safetySlice', () => ({
  blockUserThunk: jest.fn(),
  unblockUserThunk: jest.fn(),
  submitReportThunk: jest.fn(),
  fetchBlockedUsersThunk: jest.fn(() => ({ type: 'safety/fetchBlockedUsers' })),
}));

jest.mock('../../../utils/safetyHelpers', () => ({
  showBlockConfirmation: jest.fn(),
  showBlockSuccessAlert: jest.fn(),
  showReportSuccessAlert: jest.fn(),
  showSafetyErrorAlert: jest.fn(),
  showUnblockConfirmation: jest.fn(),
  showUnblockSuccessAlert: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: 'user-456' })),
}));

// Mock expo-google-fonts
jest.mock('@expo-google-fonts/lato', () => ({
  Lato_400Regular: 'Lato_400Regular',
}));

jest.mock('@expo-google-fonts/montserrat', () => ({
  Montserrat_700Bold: 'Montserrat_700Bold',
  useFonts: jest.fn(() => [true]),
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }) => {
    const React = require('react');
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

// Mock components
jest.mock('../../../components/ReportModal', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockReportModal({ visible, onClose, onSubmit, reportedUserName }) {
    if (!visible) return null;
    return (
      <View testID="report-modal">
        <Text>Report {reportedUserName}</Text>
        <TouchableOpacity testID="close-modal" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="submit-report" onPress={() => onSubmit('spam', 'Test description')}>
          <Text>Submit Report</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../../../components/ReviewCard', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockReviewCard({ review }) {
    return (
      <View testID={`review-${review.id}`}>
        <Text>{review.comment}</Text>
      </View>
    );
  };
});

jest.mock('../../../components/StarRating', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockStarRating({ rating }) {
    return (
      <View testID="star-rating">
        <Text>{rating} stars</Text>
      </View>
    );
  };
});

// Mock redux state - variables must be declared before mock
let mockReviewsState = { userReviews: [], loading: false };
let mockSafetyState = { blockedUsers: [], submitting: false, submitError: null };

const mockDispatch = jest.fn(() => Promise.resolve());

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => {
    const state = {
      reviews: mockReviewsState,
      safety: mockSafetyState,
    };
    return selector(state);
  }),
  useDispatch: () => mockDispatch,
}));

import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import OtherUserProfileScreen from '../[id]';
import { getDoc } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { router, useLocalSearchParams } from 'expo-router';
import { useFonts } from '@expo-google-fonts/montserrat';

// Alert spy
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Helper to set mock state
const setMockState = (reviews = {}, safety = {}) => {
  mockReviewsState = { userReviews: [], loading: false, ...reviews };
  mockSafetyState = { blockedUsers: [], submitting: false, submitError: null, ...safety };
};

// Mock user profile data
const createMockProfile = (overrides = {}) => ({
  uid: 'user-456',
  name: 'Jane Smith',
  email: 'jane@university.edu',
  school: 'UCLA',
  major: 'Computer Science',
  graduationYear: '2025',
  pronouns: 'she/her',
  bio: 'Love to travel!',
  averageRating: 4.5,
  totalRatings: 12,
  totalTripsCompleted: 20,
  ridePreferences: {
    chattiness: 'Moderate',
    musicTaste: 'Pop',
    petFriendly: true,
    smokingOk: false,
  },
  ...overrides,
});

describe('OtherUserProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();
    router.back.mockClear();
    router.push.mockClear();
    
    // Reset mock state to defaults
    setMockState();
    
    // Default mock implementations
    useLocalSearchParams.mockReturnValue({ id: 'user-456' });
    useAuth.mockReturnValue({ user: { uid: 'current-user-123' } });
    useFonts.mockReturnValue([true]);
    
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => createMockProfile(),
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator while fetching profile', async () => {
      getDoc.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { getByText } = render(<OtherUserProfileScreen />);

      expect(getByText('Loading profile...')).toBeTruthy();
    });

    it('renders profile after loading', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Jane Smith')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('shows user not found when profile does not exist', async () => {
      getDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      });

      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('User not found.')).toBeTruthy();
    });

    it('shows user not found when fetch fails', async () => {
      getDoc.mockRejectedValue(new Error('Network error'));

      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('User not found.')).toBeTruthy();
    });
  });

  describe('Profile Display', () => {
    it('renders user name', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Jane Smith')).toBeTruthy();
    });

    it('renders user email', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('jane@university.edu')).toBeTruthy();
    });

    it('renders back button', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('← Back')).toBeTruthy();
    });

    it('renders more options button for other users', async () => {
      const { findByLabelText } = render(<OtherUserProfileScreen />);

      expect(await findByLabelText('More options')).toBeTruthy();
    });

    it('hides more options button for own profile', async () => {
      useAuth.mockReturnValue({ user: { uid: 'user-456' } }); // Same as profile user
      useLocalSearchParams.mockReturnValue({ id: 'user-456' });

      const { findByText, queryByLabelText } = render(<OtherUserProfileScreen />);

      await findByText('Jane Smith');
      expect(queryByLabelText('More options')).toBeNull();
    });

    it('renders user details section', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Details')).toBeTruthy();
      expect(await findByText('School: UCLA')).toBeTruthy();
      expect(await findByText('Major: Computer Science')).toBeTruthy();
      expect(await findByText('Graduation Year: 2025')).toBeTruthy();
    });

    it('renders pronouns', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Pronouns: she/her')).toBeTruthy();
    });

    it('renders bio', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Bio: Love to travel!')).toBeTruthy();
    });
  });

  describe('Rating Display', () => {
    it('displays star rating when user has ratings', async () => {
      const { findByTestId } = render(<OtherUserProfileScreen />);

      expect(await findByTestId('star-rating')).toBeTruthy();
    });

    it('displays rating count', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText(/4\.5.*12 reviews/)).toBeTruthy();
    });

    it('displays trips completed', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('20 trips completed')).toBeTruthy();
    });

    it('shows view reviews hint', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Tap to view all reviews')).toBeTruthy();
    });

    it('navigates to reviews on rating tap', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      const ratingHint = await findByText('Tap to view all reviews');
      fireEvent.press(ratingHint);

      expect(router.push).toHaveBeenCalledWith('/reviews/user-456');
    });
  });

  describe('Ride Preferences', () => {
    it('renders ride preferences section', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Ride Preferences')).toBeTruthy();
    });

    it('displays chattiness preference', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Chattiness: Moderate')).toBeTruthy();
    });

    it('displays music taste', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Music Taste: Pop')).toBeTruthy();
    });

    it('displays pet friendly status', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Pet Friendly: Yes')).toBeTruthy();
    });

    it('displays smoking status', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Smoking OK: No')).toBeTruthy();
    });

    it('shows message when no ride preferences set', async () => {
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => createMockProfile({ ridePreferences: null }),
      });

      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('No ride preferences set.')).toBeTruthy();
    });
  });

  describe('Reviews Section', () => {
    it('renders reviews section title', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Reviews')).toBeTruthy();
    });

    it('shows loading indicator when loading reviews', async () => {
      setMockState({ loading: true });

      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Loading reviews...')).toBeTruthy();
    });

    it('displays reviews when available', async () => {
      setMockState({
        userReviews: [
          { id: 'review-1', comment: 'Great driver!' },
          { id: 'review-2', comment: 'Very friendly' },
        ],
      });

      const { findByTestId } = render(<OtherUserProfileScreen />);

      expect(await findByTestId('review-review-1')).toBeTruthy();
      expect(await findByTestId('review-review-2')).toBeTruthy();
    });

    it('shows no reviews message when empty', async () => {
      setMockState({ userReviews: [] });

      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('No reviews yet')).toBeTruthy();
    });

    it('shows View All link when reviews exist', async () => {
      setMockState({
        userReviews: [{ id: 'review-1', comment: 'Great!' }],
      });

      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('View All')).toBeTruthy();
    });

    it('shows view all button when more than 3 reviews', async () => {
      setMockState({
        userReviews: [
          { id: 'review-1', comment: 'Great!' },
          { id: 'review-2', comment: 'Good!' },
          { id: 'review-3', comment: 'Nice!' },
          { id: 'review-4', comment: 'Excellent!' },
        ],
      });

      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('View all 4 reviews')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button pressed', async () => {
      const { findByText } = render(<OtherUserProfileScreen />);

      const backButton = await findByText('← Back');
      fireEvent.press(backButton);

      expect(router.back).toHaveBeenCalled();
    });

    it('navigates to reviews page when View All pressed', async () => {
      setMockState({
        userReviews: [{ id: 'review-1', comment: 'Great!' }],
      });

      const { findByText } = render(<OtherUserProfileScreen />);

      const viewAllButton = await findByText('View All');
      fireEvent.press(viewAllButton);

      expect(router.push).toHaveBeenCalledWith('/reviews/user-456');
    });
  });

  describe('Blocked User', () => {
    it('shows blocked banner when user is blocked', async () => {
      setMockState({}, { blockedUsers: ['user-456'] });

      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('You have blocked this user')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('returns null when fonts not loaded', () => {
      useFonts.mockReturnValueOnce([false]);

      const { toJSON } = render(<OtherUserProfileScreen />);

      expect(toJSON()).toBeNull();
    });

    it('handles profile with missing optional fields', async () => {
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          name: 'Minimal User',
          email: 'minimal@test.com',
        }),
      });

      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText('Minimal User')).toBeTruthy();
      expect(await findByText('School: -')).toBeTruthy();
    });

    it('uses singular review text for one review', async () => {
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => createMockProfile({ totalRatings: 1 }),
      });

      const { findByText } = render(<OtherUserProfileScreen />);

      expect(await findByText(/4\.5.*1 review\)/)).toBeTruthy();
    });
  });
});
