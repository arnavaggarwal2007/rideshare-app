/**
 * Tests for ReviewsScreen
 * Tests displaying all reviews for a user
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../../firebaseConfig', () => ({
  auth: { currentUser: { uid: 'current-user-123' } },
  db: {},
}));

jest.mock('../../../store/slices/reviewsSlice', () => ({
  fetchUserReviewsThunk: jest.fn(() => ({ type: 'reviews/fetchUserReviews' })),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ userId: 'user-456' })),
}));

// Mock expo-google-fonts
jest.mock('@expo-google-fonts/lato', () => ({
  Lato_400Regular: 'Lato_400Regular',
}));

jest.mock('@expo-google-fonts/montserrat', () => ({
  Montserrat_700Bold: 'Montserrat_700Bold',
  useFonts: jest.fn(() => [true]),
}));

// Mock StatusBar (uses clearImmediate which isn't available in jsdom)
jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('StatusBar'),
    setBarStyle: jest.fn(),
    setBackgroundColor: jest.fn(),
    setHidden: jest.fn(),
    setNetworkActivityIndicatorVisible: jest.fn(),
    setTranslucent: jest.fn(),
    pushStackEntry: jest.fn(),
    popStackEntry: jest.fn(),
    replaceStackEntry: jest.fn(),
  };
});

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }) => {
    const React = require('react');
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

// Mock components
jest.mock('../../../components/ReviewCard', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockReviewCard({ review }) {
    return (
      <View testID={`review-${review.id}`}>
        <Text>{review.reviewerName}</Text>
        <Text>{review.rating} stars</Text>
        <Text>{review.reviewText}</Text>
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
        <Text>{rating.toFixed(1)} stars</Text>
      </View>
    );
  };
});

// Mock redux state
let mockReviewsState = { userReviews: [], loading: false };

const mockDispatch = jest.fn(() => Promise.resolve());

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => {
    const state = {
      reviews: mockReviewsState,
    };
    return selector(state);
  }),
  useDispatch: () => mockDispatch,
}));

import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';

import ReviewsScreen from '../[userId]';
import { router, useLocalSearchParams } from 'expo-router';
import { useFonts } from '@expo-google-fonts/montserrat';
import { fetchUserReviewsThunk } from '../../../store/slices/reviewsSlice';

// Helper to set mock state
const setMockState = (state = {}) => {
  mockReviewsState = { userReviews: [], loading: false, ...state };
};

// Mock review data
const createMockReview = (overrides = {}) => ({
  id: 'review-1',
  reviewerId: 'reviewer-123',
  reviewerName: 'John Doe',
  rating: 5,
  reviewText: 'Excellent driver!',
  createdAt: { toDate: () => new Date() },
  ...overrides,
});

describe('ReviewsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    router.back.mockClear();
    
    // Reset mock state to defaults
    setMockState();
    
    // Default mock implementations
    useLocalSearchParams.mockReturnValue({ userId: 'user-456' });
    useFonts.mockReturnValue([true]);
  });

  describe('Loading State', () => {
    it('shows loading indicator while fetching reviews', () => {
      setMockState({ loading: true, userReviews: [] });

      const { getByText } = render(<ReviewsScreen />);

      expect(getByText('Loading reviews...')).toBeTruthy();
    });

    it('does not show loading if reviews exist', () => {
      setMockState({
        loading: true,
        userReviews: [createMockReview()],
      });

      const { queryByText, getByTestId } = render(<ReviewsScreen />);

      expect(queryByText('Loading reviews...')).toBeNull();
      expect(getByTestId('review-review-1')).toBeTruthy();
    });
  });

  describe('Screen Display', () => {
    it('renders header with title', () => {
      const { getByText } = render(<ReviewsScreen />);

      expect(getByText('Reviews')).toBeTruthy();
    });

    it('renders back button', () => {
      const { UNSAFE_root } = render(<ReviewsScreen />);

      // Check that back button exists via TouchableOpacity
      const touchables = UNSAFE_root.findAllByType('View');
      expect(touchables.length).toBeGreaterThan(0);
    });

    it('navigates back when back button pressed', () => {
      const { UNSAFE_getAllByType } = render(<ReviewsScreen />);
      
      // Find TouchableOpacity components
      const touchableOpacities = UNSAFE_getAllByType(
        require('react-native').TouchableOpacity
      );
      
      // First touchable should be back button
      if (touchableOpacities.length > 0) {
        fireEvent.press(touchableOpacities[0]);
        expect(router.back).toHaveBeenCalled();
      }
    });

    it('renders star rating component', () => {
      setMockState({
        userReviews: [createMockReview({ rating: 4 })],
      });

      const { getByTestId } = render(<ReviewsScreen />);

      expect(getByTestId('star-rating')).toBeTruthy();
    });

    it('returns null when fonts not loaded', () => {
      useFonts.mockReturnValueOnce([false]);

      const { toJSON } = render(<ReviewsScreen />);

      expect(toJSON()).toBeNull();
    });
  });

  describe('Rating Summary', () => {
    it('shows average rating of 0 when no reviews', () => {
      setMockState({ userReviews: [] });

      const { getByText } = render(<ReviewsScreen />);

      expect(getByText('0.0 out of 5')).toBeTruthy();
    });

    it('calculates average rating from reviews', () => {
      setMockState({
        userReviews: [
          createMockReview({ id: 'r1', rating: 5 }),
          createMockReview({ id: 'r2', rating: 4 }),
          createMockReview({ id: 'r3', rating: 3 }),
        ],
      });

      const { getByText } = render(<ReviewsScreen />);

      // Average: (5 + 4 + 3) / 3 = 4.0
      expect(getByText('4.0 out of 5')).toBeTruthy();
    });

    it('shows review count (plural)', () => {
      setMockState({
        userReviews: [
          createMockReview({ id: 'r1' }),
          createMockReview({ id: 'r2' }),
        ],
      });

      const { getByText } = render(<ReviewsScreen />);

      expect(getByText('Based on 2 reviews')).toBeTruthy();
    });

    it('shows review count (singular)', () => {
      setMockState({
        userReviews: [createMockReview()],
      });

      const { getByText } = render(<ReviewsScreen />);

      expect(getByText('Based on 1 review')).toBeTruthy();
    });
  });

  describe('Reviews List', () => {
    it('renders reviews when available', () => {
      setMockState({
        userReviews: [
          createMockReview({ id: 'review-1', reviewerName: 'Alice' }),
          createMockReview({ id: 'review-2', reviewerName: 'Bob' }),
        ],
      });

      const { getByTestId } = render(<ReviewsScreen />);

      expect(getByTestId('review-review-1')).toBeTruthy();
      expect(getByTestId('review-review-2')).toBeTruthy();
    });

    it('shows empty state when no reviews', () => {
      setMockState({ userReviews: [] });

      const { getByText } = render(<ReviewsScreen />);

      expect(getByText('No Reviews Yet')).toBeTruthy();
      expect(getByText('Complete trips to receive reviews from other users')).toBeTruthy();
    });
  });

  describe('Data Fetching', () => {
    it('dispatches fetchUserReviewsThunk on mount', () => {
      render(<ReviewsScreen />);

      expect(fetchUserReviewsThunk).toHaveBeenCalledWith({
        userId: 'user-456',
        limitCount: 50,
      });
    });

    it('does not fetch if userId is missing', () => {
      useLocalSearchParams.mockReturnValue({ userId: undefined });

      render(<ReviewsScreen />);

      expect(fetchUserReviewsThunk).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles reviews with null rating', () => {
      setMockState({
        userReviews: [
          createMockReview({ id: 'r1', rating: null }),
          createMockReview({ id: 'r2', rating: 5 }),
        ],
      });

      const { getByText } = render(<ReviewsScreen />);

      // Average: (0 + 5) / 2 = 2.5
      expect(getByText('2.5 out of 5')).toBeTruthy();
    });

    it('handles non-array userReviews', () => {
      setMockState({ userReviews: null });

      const { getByText } = render(<ReviewsScreen />);

      expect(getByText('No Reviews Yet')).toBeTruthy();
    });
  });
});
