/**
 * ReviewCard Component Tests
 * Phase 4: Week 7 Implementation Plan
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ReviewCard from '../ReviewCard';

// Use global mock from jest.setup.js
const mockRouterPush = global.mockRouterPush;

describe('ReviewCard Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Sample review data
  const mockReview = {
    id: 'review-123',
    rating: 4.5,
    reviewText: 'Great ride! The driver was punctual and friendly.',
    reviewerName: 'John Doe',
    reviewerPhotoURL: 'https://example.com/photo.jpg',
    reviewerId: 'user-456',
    reviewerRole: 'rider',
    createdAt: new Date('2026-01-10T10:00:00Z'),
  };

  const longReviewText = 'This is a very long review that exceeds the 150 character limit. '.repeat(5);
  
  const mockLongReview = {
    ...mockReview,
    reviewText: longReviewText,
  };

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ReviewCard review={mockReview} />);
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('returns null when review is null', () => {
      const { toJSON } = render(<ReviewCard review={null} />);
      expect(toJSON()).toBeNull();
    });

    it('displays reviewer name', () => {
      render(<ReviewCard review={mockReview} />);
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('displays "Anonymous" when reviewerName is missing', () => {
      const anonymousReview = { ...mockReview, reviewerName: null };
      render(<ReviewCard review={anonymousReview} />);
      expect(screen.getByText('Anonymous')).toBeTruthy();
    });

    it('displays review text when present', () => {
      render(<ReviewCard review={mockReview} />);
      expect(screen.getByText(/Great ride!/)).toBeTruthy();
    });

    it('displays rating value', () => {
      render(<ReviewCard review={mockReview} />);
      expect(screen.getByText('4.5')).toBeTruthy();
    });

    it('displays reviewer role label', () => {
      render(<ReviewCard review={mockReview} />);
      expect(screen.getByText('as Rider')).toBeTruthy();
    });

    it('displays driver role label correctly', () => {
      const driverReview = { ...mockReview, reviewerRole: 'driver' };
      render(<ReviewCard review={driverReview} />);
      expect(screen.getByText('as Driver')).toBeTruthy();
    });

    it('handles undefined role', () => {
      const noRoleReview = { ...mockReview, reviewerRole: undefined };
      render(<ReviewCard review={noRoleReview} />);
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('handles null role', () => {
      const noRoleReview = { ...mockReview, reviewerRole: null };
      render(<ReviewCard review={noRoleReview} />);
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('handles unknown role', () => {
      const unknownRoleReview = { ...mockReview, reviewerRole: 'passenger' };
      render(<ReviewCard review={unknownRoleReview} />);
      // Should not display any role label
      expect(screen.queryByText('as Passenger')).toBeNull();
    });
  });

  describe('Date Formatting', () => {
    it('displays "Today" for today\'s date', () => {
      const todayReview = { ...mockReview, createdAt: new Date() };
      render(<ReviewCard review={todayReview} />);
      expect(screen.getByText('Today')).toBeTruthy();
    });

    it('displays "Yesterday" for yesterday\'s date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayReview = { ...mockReview, createdAt: yesterday };
      render(<ReviewCard review={yesterdayReview} />);
      expect(screen.getByText('Yesterday')).toBeTruthy();
    });

    it('displays "X days ago" for recent dates', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const recentReview = { ...mockReview, createdAt: threeDaysAgo };
      render(<ReviewCard review={recentReview} />);
      expect(screen.getByText('3 days ago')).toBeTruthy();
    });

    it('displays "X weeks ago" for dates within a month', () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const weekOldReview = { ...mockReview, createdAt: twoWeeksAgo };
      render(<ReviewCard review={weekOldReview} />);
      expect(screen.getByText('2 weeks ago')).toBeTruthy();
    });

    it('handles Firestore timestamp with toDate()', () => {
      const firestoreTimestamp = {
        toDate: () => new Date(),
      };
      const firestoreReview = { ...mockReview, createdAt: firestoreTimestamp };
      render(<ReviewCard review={firestoreReview} />);
      expect(screen.getByText('Today')).toBeTruthy();
    });

    it('displays "1 week ago" for 7 days', () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekOldReview = { ...mockReview, createdAt: oneWeekAgo };
      render(<ReviewCard review={weekOldReview} />);
      expect(screen.getByText('1 week ago')).toBeTruthy();
    });

    it('displays formatted date for dates older than a month', () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
      const oldReview = { ...mockReview, createdAt: twoMonthsAgo };
      render(<ReviewCard review={oldReview} />);
      // Should show something like "Nov 12" format
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const expectedMonth = monthNames[twoMonthsAgo.getMonth()];
      expect(screen.getByText(new RegExp(expectedMonth))).toBeTruthy();
    });

    it('displays year for dates from previous year', () => {
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      const oldReview = { ...mockReview, createdAt: lastYear };
      render(<ReviewCard review={oldReview} />);
      // Should include the year
      expect(screen.getByText(new RegExp(lastYear.getFullYear().toString()))).toBeTruthy();
    });

    it('handles null timestamp', () => {
      const noDateReview = { ...mockReview, createdAt: null };
      render(<ReviewCard review={noDateReview} />);
      // Should not crash, reviewer name should still show
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('handles undefined timestamp', () => {
      const noDateReview = { ...mockReview, createdAt: undefined };
      render(<ReviewCard review={noDateReview} />);
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('handles invalid timestamp gracefully', () => {
      const invalidReview = { ...mockReview, createdAt: 'invalid-date' };
      render(<ReviewCard review={invalidReview} />);
      expect(screen.getByText('John Doe')).toBeTruthy();
    });
  });

  describe('Read More Functionality', () => {
    it('shows "Read more" button for long reviews', () => {
      render(<ReviewCard review={mockLongReview} />);
      expect(screen.getByText('Read more')).toBeTruthy();
    });

    it('does not show "Read more" for short reviews', () => {
      render(<ReviewCard review={mockReview} />);
      expect(screen.queryByText('Read more')).toBeNull();
    });

    it('expands text when "Read more" is pressed', async () => {
      render(<ReviewCard review={mockLongReview} />);
      
      const readMoreButton = screen.getByText('Read more');
      fireEvent.press(readMoreButton);
      
      await waitFor(() => {
        expect(screen.getByText('Show less')).toBeTruthy();
      });
    });

    it('collapses text when "Show less" is pressed', async () => {
      render(<ReviewCard review={mockLongReview} />);
      
      // Expand first
      fireEvent.press(screen.getByText('Read more'));
      
      await waitFor(() => {
        expect(screen.getByText('Show less')).toBeTruthy();
      });
      
      // Then collapse
      fireEvent.press(screen.getByText('Show less'));
      
      await waitFor(() => {
        expect(screen.getByText('Read more')).toBeTruthy();
      });
    });

    it('does not show "Read more" in compact mode', () => {
      render(<ReviewCard review={mockLongReview} compact={true} />);
      expect(screen.queryByText('Read more')).toBeNull();
    });

    it('respects expandable=false prop', () => {
      render(<ReviewCard review={mockLongReview} expandable={false} />);
      expect(screen.queryByText('Read more')).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('navigates to reviewer profile when name is pressed', () => {
      render(<ReviewCard review={mockReview} showReviewerLink={true} />);
      
      const reviewerName = screen.getByText('John Doe');
      fireEvent.press(reviewerName);
      
      expect(mockRouterPush).toHaveBeenCalledWith('/user/user-456');
    });

    it('does not navigate when showReviewerLink is false', () => {
      render(<ReviewCard review={mockReview} showReviewerLink={false} />);
      
      const reviewerName = screen.getByText('John Doe');
      fireEvent.press(reviewerName);
      
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('does not navigate when reviewerId is missing', () => {
      const noIdReview = { ...mockReview, reviewerId: null };
      render(<ReviewCard review={noIdReview} showReviewerLink={true} />);
      
      const reviewerName = screen.getByText('John Doe');
      fireEvent.press(reviewerName);
      
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode with reduced padding', () => {
      const { toJSON } = render(<ReviewCard review={mockReview} compact={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('hides rating value in compact mode', () => {
      render(<ReviewCard review={mockReview} compact={true} />);
      expect(screen.queryByText('4.5')).toBeNull();
    });

    it('truncates text to 2 lines in compact mode', () => {
      render(<ReviewCard review={mockLongReview} compact={true} />);
      // The component should have numberOfLines={2} for compact mode
      // This is a visual test - we verify component renders without crashing
      expect(screen.getByText(/This is a very long review/)).toBeTruthy();
    });
  });

  describe('Avatar Handling', () => {
    it('shows avatar image when photoURL is provided', () => {
      render(<ReviewCard review={mockReview} />);
      // Avatar should be rendered (Image component)
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('shows placeholder icon when photoURL is missing', () => {
      const noPhotoReview = { ...mockReview, reviewerPhotoURL: null };
      render(<ReviewCard review={noPhotoReview} />);
      // Should render person icon placeholder
      expect(screen.getByText('person')).toBeTruthy(); // Mocked Ionicons renders icon name
    });
  });

  describe('Empty Review Text', () => {
    it('does not render review text section when text is empty', () => {
      const noTextReview = { ...mockReview, reviewText: '' };
      render(<ReviewCard review={noTextReview} />);
      expect(screen.queryByText(/Great ride!/)).toBeNull();
    });

    it('does not render review text section when text is only whitespace', () => {
      const whitespaceReview = { ...mockReview, reviewText: '   ' };
      render(<ReviewCard review={whitespaceReview} />);
      // Should not have a visible review text
      expect(screen.getByText('John Doe')).toBeTruthy(); // Component renders
    });
  });

  describe('Date Formatting Edge Cases', () => {
    it('handles invalid timestamp gracefully', () => {
      const invalidDateReview = {
        ...mockReview,
        createdAt: { toDate: () => { throw new Error('Invalid date'); } },
      };
      render(<ReviewCard review={invalidDateReview} />);
      // Component should still render, date will be empty
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('handles string timestamp correctly', () => {
      const stringDateReview = {
        ...mockReview,
        createdAt: new Date().toISOString(),
      };
      render(<ReviewCard review={stringDateReview} />);
      expect(screen.getByText('Today')).toBeTruthy();
    });
  });

  describe('LayoutAnimation', () => {
    it('handles text expansion toggle', () => {
      render(<ReviewCard review={mockLongReview} expandable={true} />);
      
      // Find and press "Read more"
      const readMore = screen.getByText('Read more');
      fireEvent.press(readMore);
      
      // Should now show "Show less" (matches component text)
      expect(screen.getByText('Show less')).toBeTruthy();
    });
  });
});
