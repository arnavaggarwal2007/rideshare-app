/**
 * StarRating Component Tests
 * Phase 1: Week 7 Implementation Plan
 * Updated Phase 11: Star selection animation
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import StarRating from '../StarRating';

describe('StarRating Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders 5 stars by default', () => {
      render(<StarRating rating={0} />);
      // Should render 5 star buttons
      const stars = screen.getAllByRole('button');
      expect(stars).toHaveLength(5);
    });

    it('renders custom number of stars', () => {
      render(<StarRating rating={0} maxStars={10} />);
      const stars = screen.getAllByRole('button');
      expect(stars).toHaveLength(10);
    });

    it('renders filled stars based on rating', () => {
      render(<StarRating rating={3} />);
      // Should have star icons rendered
      expect(screen.getByLabelText('Rating: 3 out of 5 stars')).toBeTruthy();
    });

    it('renders partial stars for decimal ratings', () => {
      render(<StarRating rating={3.5} />);
      expect(screen.getByLabelText('Rating: 3.5 out of 5 stars')).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('calls onRatingChange when star is pressed', async () => {
      const mockOnChange = jest.fn();
      render(<StarRating rating={0} onRatingChange={mockOnChange} />);
      
      const stars = screen.getAllByRole('button');
      
      await act(async () => {
        fireEvent.press(stars[2]); // Press 3rd star
        jest.runAllTimers();
      });
      
      expect(mockOnChange).toHaveBeenCalledWith(3);
    });

    it('does not call onRatingChange when disabled', async () => {
      const mockOnChange = jest.fn();
      render(<StarRating rating={0} onRatingChange={mockOnChange} disabled={true} />);
      
      const stars = screen.getAllByRole('button');
      
      await act(async () => {
        fireEvent.press(stars[2]);
        jest.runAllTimers();
      });
      
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('triggers haptic feedback when star is pressed', async () => {
      const mockOnChange = jest.fn();
      render(<StarRating rating={0} onRatingChange={mockOnChange} />);
      
      const stars = screen.getAllByRole('button');
      
      await act(async () => {
        fireEvent.press(stars[0]);
        jest.runAllTimers();
      });
      
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('updates internal state when star is pressed', async () => {
      const mockOnChange = jest.fn();
      render(<StarRating rating={0} onRatingChange={mockOnChange} />);
      
      const stars = screen.getAllByRole('button');
      
      await act(async () => {
        fireEvent.press(stars[4]); // Press 5th star
        jest.runAllTimers();
      });
      
      expect(mockOnChange).toHaveBeenCalledWith(5);
    });
  });

  describe('Animation', () => {
    it('renders with animation enabled by default', async () => {
      const mockOnChange = jest.fn();
      render(<StarRating rating={0} onRatingChange={mockOnChange} />);
      
      const stars = screen.getAllByRole('button');
      
      await act(async () => {
        fireEvent.press(stars[2]);
        jest.runAllTimers();
      });
      
      // Animation should trigger without errors
      expect(mockOnChange).toHaveBeenCalledWith(3);
    });

    it('can disable animation with animated=false prop', async () => {
      const mockOnChange = jest.fn();
      render(<StarRating rating={0} onRatingChange={mockOnChange} animated={false} />);
      
      const stars = screen.getAllByRole('button');
      
      await act(async () => {
        fireEvent.press(stars[2]);
        jest.runAllTimers();
      });
      
      expect(mockOnChange).toHaveBeenCalledWith(3);
    });

    it('does not animate when disabled', async () => {
      const mockOnChange = jest.fn();
      render(<StarRating rating={0} onRatingChange={mockOnChange} disabled={true} animated={true} />);
      
      const stars = screen.getAllByRole('button');
      
      await act(async () => {
        fireEvent.press(stars[2]);
        jest.runAllTimers();
      });
      
      // onRatingChange should not be called when disabled
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('animates multiple stars in sequence when selecting higher rating', async () => {
      const mockOnChange = jest.fn();
      render(<StarRating rating={0} onRatingChange={mockOnChange} />);
      
      const stars = screen.getAllByRole('button');
      
      await act(async () => {
        fireEvent.press(stars[4]); // Press 5th star
        jest.advanceTimersByTime(200); // Allow animation to complete
      });
      
      expect(mockOnChange).toHaveBeenCalledWith(5);
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels for each star', () => {
      render(<StarRating rating={3} />);
      
      expect(screen.getByLabelText('1 star')).toBeTruthy();
      expect(screen.getByLabelText('2 stars')).toBeTruthy();
      expect(screen.getByLabelText('3 stars')).toBeTruthy();
    });

    it('has disabled state in accessibility when disabled', () => {
      render(<StarRating rating={3} disabled={true} />);
      
      const stars = screen.getAllByRole('button');
      stars.forEach(star => {
        expect(star.props.accessibilityState.disabled).toBe(true);
      });
    });
  });

  describe('Props Sync', () => {
    it('updates when rating prop changes', () => {
      const { rerender } = render(<StarRating rating={2} />);
      expect(screen.getByLabelText('Rating: 2 out of 5 stars')).toBeTruthy();
      
      rerender(<StarRating rating={4} />);
      expect(screen.getByLabelText('Rating: 4 out of 5 stars')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('applies custom size to stars', () => {
      render(<StarRating rating={3} size={48} />);
      // Component should render without crashing with custom size
      expect(screen.getByLabelText('Rating: 3 out of 5 stars')).toBeTruthy();
    });

    it('applies custom colors', () => {
      render(<StarRating rating={3} color="#FF0000" emptyColor="#CCCCCC" />);
      // Component should render with custom colors
      expect(screen.getByLabelText('Rating: 3 out of 5 stars')).toBeTruthy();
    });

    it('applies custom spacing', () => {
      render(<StarRating rating={3} spacing={8} />);
      expect(screen.getByLabelText('Rating: 3 out of 5 stars')).toBeTruthy();
    });
  });
});
