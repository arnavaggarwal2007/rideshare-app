/**
 * ReviewCard Component
 * Displays a single review with rating, text, and reviewer info
 * Supports expandable text for long reviews
 * 
 * Phase 4: Week 7 Implementation Plan
 */

import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import StarRating from './StarRating';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Character limit for truncation
const TEXT_TRUNCATE_LENGTH = 150;

/**
 * ReviewCard - Displays a review from another user
 * 
 * @param {Object} props
 * @param {Object} props.review - The review object
 * @param {number} props.review.rating - Star rating (1-5)
 * @param {string} props.review.reviewText - Optional review text
 * @param {string} props.review.reviewerName - Name of the reviewer
 * @param {string} props.review.reviewerPhotoURL - Profile photo URL
 * @param {string} props.review.reviewerId - ID of the reviewer
 * @param {string} props.review.reviewerRole - 'driver' or 'rider'
 * @param {Object} props.review.createdAt - Firestore timestamp
 * @param {boolean} props.compact - Whether to use compact layout
 * @param {boolean} props.showReviewerLink - Whether to make reviewer name clickable
 * @param {boolean} props.expandable - Whether long text can be expanded (default: true)
 */
export default function ReviewCard({ 
  review, 
  compact = false,
  showReviewerLink = true,
  expandable = true
}) {
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });
  
  // State for expanded text
  const [isExpanded, setIsExpanded] = useState(false);

  if (!fontsLoaded || !review) return null;
  
  // Check if text should be truncated
  const reviewText = review.reviewText || '';
  const shouldTruncate = !compact && expandable && reviewText.length > TEXT_TRUNCATE_LENGTH;
  const displayText = shouldTruncate && !isExpanded 
    ? reviewText.substring(0, TEXT_TRUNCATE_LENGTH).trim() + '...'
    : reviewText;
    
  // Toggle expanded state with animation
  const handleToggleExpand = () => {
    // LayoutAnimation may not be available in test environment
    if (LayoutAnimation?.configureNext) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setIsExpanded(!isExpanded);
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (_e) {
      return '';
    }
  };

  // Get role label
  const getRoleLabel = (role) => {
    switch (role) {
      case 'driver':
        return 'as Driver';
      case 'rider':
        return 'as Rider';
      default:
        return '';
    }
  };

  // Handle reviewer profile navigation
  const handleReviewerPress = () => {
    if (showReviewerLink && review.reviewerId) {
      router.push(`/user/${review.reviewerId}`);
    }
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Header with reviewer info */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.reviewerInfo}
          onPress={handleReviewerPress}
          disabled={!showReviewerLink}
          activeOpacity={showReviewerLink ? 0.7 : 1}
        >
          {review.reviewerPhotoURL ? (
            <Image 
              source={{ uri: review.reviewerPhotoURL }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={16} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.reviewerDetails}>
            <Text style={[
              styles.reviewerName,
              showReviewerLink && styles.reviewerNameLink
            ]}>
              {review.reviewerName || 'Anonymous'}
            </Text>
            {review.reviewerRole && (
              <Text style={styles.roleLabel}>
                {getRoleLabel(review.reviewerRole)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
      </View>

      {/* Rating */}
      <View style={styles.ratingRow}>
        <StarRating
          rating={review.rating}
          size={compact ? 14 : 16}
          color="#FFB300"
          emptyColor="#D1D5DB"
          disabled
          spacing={2}
        />
        {!compact && (
          <Text style={styles.ratingValue}>{review.rating.toFixed(1)}</Text>
        )}
      </View>

      {/* Review text with Read More functionality */}
      {reviewText.trim() !== '' && (
        <View>
          <Text 
            style={[styles.reviewText, compact && styles.reviewTextCompact]}
            numberOfLines={compact ? 2 : undefined}
          >
            {compact ? reviewText : displayText}
          </Text>
          {shouldTruncate && (
            <TouchableOpacity 
              onPress={handleToggleExpand}
              style={styles.readMoreButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.readMoreText}>
                {isExpanded ? 'Show less' : 'Read more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  containerCompact: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerDetails: {
    marginLeft: 10,
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
  },
  reviewerNameLink: {
    color: '#1B4965',
  },
  roleLabel: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: '#687076',
    marginTop: 1,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: '#9CA3AF',
    marginLeft: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#F57C00',
  },
  reviewText: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#374151',
    lineHeight: 20,
  },
  reviewTextCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  readMoreButton: {
    marginTop: 4,
  },
  readMoreText: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: '#2774AE',
  },
});
