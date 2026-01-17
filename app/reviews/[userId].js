/**
 * Reviews Screen - Shows all reviews for a user
 */

import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import ReviewCard from '../../components/ReviewCard';
import StarRating from '../../components/StarRating';
import { fetchUserReviewsThunk } from '../../store/slices/reviewsSlice';

export default function ReviewsScreen() {
  const { userId } = useLocalSearchParams();
  const dispatch = useDispatch();
  
  const { userReviews, loading } = useSelector((state) => state.reviews);
  const reviews = Array.isArray(userReviews) ? userReviews : [];
  
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserReviewsThunk({ userId, limitCount: 50 }));
    }
  }, [userId, dispatch]);

  // Calculate average rating from reviews
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0;

  if (!fontsLoaded) return null;

  if (loading && reviews.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2774AE" />
            <Text style={styles.loadingText}>Loading reviews...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Rating Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.ratingRow}>
          <StarRating
            rating={averageRating}
            size={32}
            color="#FFB300"
            emptyColor="#D1D5DB"
            disabled
          />
        </View>
        <Text style={styles.ratingText}>
          {averageRating.toFixed(1)} out of 5
        </Text>
        <Text style={styles.reviewCount}>
          Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      {/* Reviews List */}
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.reviewItem}>
            <ReviewCard review={item} showReviewerLink={true} />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete trips to receive reviews from other users
            </Text>
          </View>
        }
      />
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Lato_400Regular',
    color: '#687076',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  ratingRow: {
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  reviewCount: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#687076',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  reviewItem: {
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
