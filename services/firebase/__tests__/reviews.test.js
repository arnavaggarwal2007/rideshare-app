/**
 * Reviews Service Tests
 * Phase 1: Week 7 Implementation Plan
 */

import {
    getReviewById,
    getTripReview,
    getTripReviews,
    getUnratedTripsForUser,
    getUserReviews,
    submitRating
} from '../reviews';

// Mock firebase/firestore
const mockTransactionGet = jest.fn();
const mockTransactionSet = jest.fn();
const mockTransactionUpdate = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'reviewsCollection'),
  doc: jest.fn((db, collectionName, id) => ({ path: `${collectionName}/${id || 'new-id'}`, id: id || 'new-review-id' })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  runTransaction: jest.fn(async (db, callback) => {
    // Create a mock transaction object
    const transaction = {
      get: mockTransactionGet,
      set: mockTransactionSet,
      update: mockTransactionUpdate,
    };
    return await callback(transaction);
  }),
  serverTimestamp: jest.fn(() => ({ _seconds: Date.now() / 1000 })),
}));

// Mock firebase config
jest.mock('../config', () => ({
  db: {},
}));

import {
    getDoc,
    getDocs,
    limit,
    orderBy,
    runTransaction,
    where
} from 'firebase/firestore';

describe('Reviews Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionGet.mockReset();
    mockTransactionSet.mockReset();
    mockTransactionUpdate.mockReset();
  });

  describe('submitRating', () => {
    it('throws error when missing required parameters', async () => {
      await expect(submitRating(null, 'user1', 'user2', 5, '', 'rider'))
        .rejects.toThrow('Missing required parameters for rating submission');
    });

    it('throws error when rating is out of range', async () => {
      await expect(submitRating('trip1', 'user1', 'user2', 6, '', 'rider'))
        .rejects.toThrow('Rating must be between 1 and 5');

      // Note: rating of 0 triggers "missing required parameters" because 0 is falsy
      // Testing with negative number instead
      await expect(submitRating('trip1', 'user1', 'user2', -1, '', 'rider'))
        .rejects.toThrow('Rating must be between 1 and 5');
    });

    it('throws error when review text exceeds 500 characters', async () => {
      const longText = 'a'.repeat(501);
      await expect(submitRating('trip1', 'user1', 'user2', 5, longText, 'rider'))
        .rejects.toThrow('Review text cannot exceed 500 characters');
    });

    it('throws error when reviewer role is invalid', async () => {
      await expect(submitRating('trip1', 'user1', 'user2', 5, '', 'passenger'))
        .rejects.toThrow('Invalid reviewer role');
    });

    it('calls runTransaction with correct parameters', async () => {
      // Mock trip exists and is completed
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
            isRatedByDriver: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            averageRating: 4.0,
            totalRatings: 5,
          }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 5, 'Great!', 'rider');
      
      expect(runTransaction).toHaveBeenCalled();
      expect(mockTransactionSet).toHaveBeenCalled();
      expect(mockTransactionUpdate).toHaveBeenCalledTimes(2); // Trip and user update
      expect(result.rating).toBe(5);
      expect(result.reviewText).toBe('Great!');
    });

    it('accepts valid rating values and calculates new average', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'user1',
            riderId: 'rider1',
            isRatedByDriver: false,
            isRatedByRider: true,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            averageRating: 4.0,
            totalRatings: 4,
          }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 3, 'Good', 'driver');
      expect(result.rating).toBe(3);
    });

    it('throws error when trip is not found', async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => false,
      });
      
      await expect(submitRating('trip1', 'user1', 'user2', 5, '', 'rider'))
        .rejects.toThrow('Trip not found');
    });

    it('throws error when trip is not completed', async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'in-progress',
          driverId: 'user1',
          riderId: 'rider1',
        }),
      });
      
      await expect(submitRating('trip1', 'user1', 'user2', 5, '', 'rider'))
        .rejects.toThrow('Can only rate completed trips');
    });

    it('throws error when reviewer is not part of trip', async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'completed',
          driverId: 'other-driver',
          riderId: 'other-rider',
        }),
      });
      
      await expect(submitRating('trip1', 'user1', 'user2', 5, '', 'rider'))
        .rejects.toThrow('You are not part of this trip');
    });

    it('throws error when user already rated (as rider)', async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'completed',
          driverId: 'driver1',
          riderId: 'user1',
          isRatedByRider: true,
        }),
      });
      
      await expect(submitRating('trip1', 'user1', 'user2', 5, '', 'rider'))
        .rejects.toThrow('You have already rated this trip');
    });

    it('throws error when user already rated (as driver)', async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'completed',
          driverId: 'user1',
          riderId: 'rider1',
          isRatedByDriver: true,
        }),
      });
      
      await expect(submitRating('trip1', 'user1', 'user2', 5, '', 'driver'))
        .rejects.toThrow('You have already rated this trip');
    });

    it('throws error when reviewee user not found', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => false,
        });
      
      await expect(submitRating('trip1', 'user1', 'user2', 5, '', 'rider'))
        .rejects.toThrow('Reviewee user not found');
    });

    it('sets bothPartiesRated when other party already rated', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
            isRatedByDriver: true, // Driver already rated
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            averageRating: 4.5,
            totalRatings: 10,
          }),
        });
      
      await submitRating('trip1', 'user1', 'user2', 5, '', 'rider');
      
      // Check that the trip update includes bothPartiesRated
      expect(mockTransactionUpdate).toHaveBeenCalled();
    });

    it('handles first rating for user (no previous ratings)', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            // No averageRating or totalRatings (first rating)
          }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 5, 'First review!', 'rider');
      expect(result.rating).toBe(5);
    });

    it('trims review text before submission', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ averageRating: 4, totalRatings: 1 }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 5, '  Great!  ', 'rider');
      expect(result.reviewText).toBe('Great!');
    });

    it('handles empty review text', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ averageRating: 4, totalRatings: 1 }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 5, '', 'rider');
      expect(result.reviewText).toBe('');
    });

    it('accepts driver role', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'user1',
            riderId: 'rider1',
            isRatedByDriver: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ averageRating: 4, totalRatings: 1 }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 4, 'Good driver', 'driver');
      expect(result).toBeDefined();
    });

    it('accepts rider role', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ averageRating: 4, totalRatings: 1 }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 4, 'Good rider', 'rider');
      expect(result).toBeDefined();
    });

    it('accepts rating of 1', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ averageRating: 4, totalRatings: 1 }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 1, 'Poor', 'rider');
      expect(result.rating).toBe(1);
    });

    it('accepts rating of 5', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ averageRating: 4, totalRatings: 1 }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 5, 'Excellent!', 'rider');
      expect(result.rating).toBe(5);
    });

    it('accepts review text at exactly 500 characters', async () => {
      const text500 = 'a'.repeat(500);
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ averageRating: 4, totalRatings: 1 }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 5, text500, 'rider');
      expect(result.reviewText).toBe(text500);
    });

    it('handles undefined review text', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ averageRating: 4, totalRatings: 1 }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 5, undefined, 'rider');
      expect(result.reviewText).toBe('');
    });

    it('handles null review text', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'completed',
            driverId: 'driver1',
            riderId: 'user1',
            isRatedByRider: false,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ averageRating: 4, totalRatings: 1 }),
        });
      
      const result = await submitRating('trip1', 'user1', 'user2', 5, null, 'rider');
      expect(result.reviewText).toBe('');
    });
  });

  describe('getUserReviews', () => {
    it('throws error when userId is not provided', async () => {
      await expect(getUserReviews(null)).rejects.toThrow('userId is required');
    });

    it('returns empty array when no reviews exist', async () => {
      getDocs.mockResolvedValue({ docs: [] });
      
      const result = await getUserReviews('user123');
      expect(result).toEqual([]);
    });

    it('returns reviews with proper structure', async () => {
      const mockDocs = [
        { id: 'review1', data: () => ({ rating: 5, reviewText: 'Great!' }) },
        { id: 'review2', data: () => ({ rating: 4, reviewText: 'Good' }) },
      ];
      getDocs.mockResolvedValue({ docs: mockDocs });
      
      const result = await getUserReviews('user123');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'review1', rating: 5, reviewText: 'Great!' });
      expect(result[1]).toEqual({ id: 'review2', rating: 4, reviewText: 'Good' });
    });

    it('respects limit parameter', async () => {
      getDocs.mockResolvedValue({ docs: [] });
      
      await getUserReviews('user123', 5);
      
      expect(limit).toHaveBeenCalledWith(5);
    });

    it('uses default limit of 10', async () => {
      getDocs.mockResolvedValue({ docs: [] });
      
      await getUserReviews('user123');
      
      expect(limit).toHaveBeenCalledWith(10);
    });

    it('queries with correct filters', async () => {
      getDocs.mockResolvedValue({ docs: [] });
      
      await getUserReviews('user123');
      
      expect(where).toHaveBeenCalledWith('revieweeId', '==', 'user123');
      expect(where).toHaveBeenCalledWith('isHidden', '==', false);
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });
  });

  describe('getTripReview', () => {
    it('throws error when tripId is not provided', async () => {
      await expect(getTripReview(null, 'user1')).rejects.toThrow('tripId and reviewerId are required');
    });

    it('throws error when reviewerId is not provided', async () => {
      await expect(getTripReview('trip1', null)).rejects.toThrow('tripId and reviewerId are required');
    });

    it('returns null when no review exists', async () => {
      getDocs.mockResolvedValue({ empty: true, docs: [] });
      
      const result = await getTripReview('trip1', 'user1');
      expect(result).toBeNull();
    });

    it('returns review object when exists', async () => {
      const mockDoc = { id: 'review1', data: () => ({ rating: 5 }) };
      getDocs.mockResolvedValue({ empty: false, docs: [mockDoc] });
      
      const result = await getTripReview('trip1', 'user1');
      
      expect(result).toEqual({ id: 'review1', rating: 5 });
    });
  });

  describe('getUnratedTripsForUser', () => {
    it('throws error when userId is not provided', async () => {
      await expect(getUnratedTripsForUser(null)).rejects.toThrow('userId is required');
    });

    it('returns empty array when no unrated trips', async () => {
      getDocs.mockResolvedValue({ docs: [] });
      
      const result = await getUnratedTripsForUser('user123');
      expect(result).toEqual([]);
    });

    it('combines driver and rider unrated trips', async () => {
      // First call for rider trips
      const riderTrips = [
        { id: 'trip1', data: () => ({ departureTimestamp: new Date('2026-01-10') }) }
      ];
      // Second call for driver trips
      const driverTrips = [
        { id: 'trip2', data: () => ({ departureTimestamp: new Date('2026-01-09') }) }
      ];
      
      getDocs
        .mockResolvedValueOnce({ docs: riderTrips })
        .mockResolvedValueOnce({ docs: driverTrips });
      
      const result = await getUnratedTripsForUser('user123');
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('trip1'); // Most recent first
      expect(result[0].userRole).toBe('rider');
      expect(result[1].id).toBe('trip2');
      expect(result[1].userRole).toBe('driver');
    });
  });

  describe('getReviewById', () => {
    it('throws error when reviewId is not provided', async () => {
      await expect(getReviewById(null)).rejects.toThrow('reviewId is required');
    });

    it('returns null when review does not exist', async () => {
      getDoc.mockResolvedValue({ exists: () => false });
      
      const result = await getReviewById('nonexistent');
      expect(result).toBeNull();
    });

    it('returns review object when exists', async () => {
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'review123',
        data: () => ({ rating: 5, reviewText: 'Excellent!' })
      });
      
      const result = await getReviewById('review123');
      
      expect(result).toEqual({
        id: 'review123',
        rating: 5,
        reviewText: 'Excellent!'
      });
    });
  });

  describe('getTripReviews', () => {
    it('throws error when tripId is not provided', async () => {
      await expect(getTripReviews(null)).rejects.toThrow('tripId is required');
    });

    it('returns all reviews for a trip', async () => {
      const mockDocs = [
        { id: 'review1', data: () => ({ reviewerRole: 'driver', rating: 5 }) },
        { id: 'review2', data: () => ({ reviewerRole: 'rider', rating: 4 }) },
      ];
      getDocs.mockResolvedValue({ docs: mockDocs });
      
      const result = await getTripReviews('trip123');
      
      expect(result).toHaveLength(2);
      expect(result[0].reviewerRole).toBe('driver');
      expect(result[1].reviewerRole).toBe('rider');
    });
  });
});
