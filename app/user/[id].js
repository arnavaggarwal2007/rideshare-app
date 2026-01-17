import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import ReportModal from '../../components/ReportModal';
import ReviewCard from '../../components/ReviewCard';
import StarRating from '../../components/StarRating';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { fetchUserReviewsThunk } from '../../store/slices/reviewsSlice';
import { blockUserThunk, fetchBlockedUsersThunk, submitReportThunk, unblockUserThunk } from '../../store/slices/safetySlice';
import { showBlockConfirmation, showBlockSuccessAlert, showReportSuccessAlert, showSafetyErrorAlert, showUnblockConfirmation, showUnblockSuccessAlert } from '../../utils/safetyHelpers';

export default function OtherUserProfileScreen() {
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });

  // Get reviews from Redux store
  const { userReviews, loading: loadingReviews } = useSelector((state) => state.reviews);
  const reviews = Array.isArray(userReviews) ? userReviews : [];
  
  // Get safety state from Redux store
  const { blockedUsers, submitting: safetySubmitting, submitError } = useSelector((state) => state.safety);
  
  // Check if current user is viewing their own profile
  const isOwnProfile = user?.uid === id;
  
  // Check if this user is blocked
  const isBlocked = blockedUsers.includes(id);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          setProfile(null);
        }
      } catch (_err) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchProfile();
      // Fetch user reviews
      dispatch(fetchUserReviewsThunk({ userId: id }));
    }
    // Fetch blocked users if user is logged in
    if (user?.uid) {
      dispatch(fetchBlockedUsersThunk({ userId: user.uid }));
    }
  }, [id, dispatch, user?.uid]);

  // Handle More Options button press
  const handleMoreOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Report User', isBlocked ? 'Unblock User' : 'Block User'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: isBlocked ? undefined : 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setReportModalVisible(true);
          } else if (buttonIndex === 2) {
            if (isBlocked) {
              handleUnblock();
            } else {
              handleBlock();
            }
          }
        }
      );
    } else {
      // Android fallback with Alert
      Alert.alert(
        'Options',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Report User', onPress: () => setReportModalVisible(true) },
          { 
            text: isBlocked ? 'Unblock User' : 'Block User', 
            style: isBlocked ? 'default' : 'destructive',
            onPress: isBlocked ? handleUnblock : handleBlock,
          },
        ]
      );
    }
  };

  // Handle report submission
  const handleReportSubmit = async (reason, description) => {
    try {
      await dispatch(submitReportThunk({
        reporterId: user.uid,
        reportedUserId: id,
        reason,
        description,
      })).unwrap();
      
      setReportModalVisible(false);
      showReportSuccessAlert();
    } catch (error) {
      showSafetyErrorAlert('submit report', error);
    }
  };

  // Handle block user
  const handleBlock = () => {
    showBlockConfirmation(profile?.name, async () => {
      try {
        await dispatch(blockUserThunk({
          userId: user.uid,
          blockedUserId: id,
        })).unwrap();
        
        showBlockSuccessAlert(profile?.name, () => {
          router.back();
        });
      } catch (error) {
        showSafetyErrorAlert('block user', error);
      }
    });
  };

  // Handle unblock user
  const handleUnblock = () => {
    showUnblockConfirmation(profile?.name, async () => {
      try {
        await dispatch(unblockUserThunk({
          userId: user.uid,
          blockedUserId: id,
        })).unwrap();
        
        showUnblockSuccessAlert(profile?.name);
      } catch (error) {
        showSafetyErrorAlert('unblock user', error);
      }
    });
  };

  if (!fontsLoaded) return null;
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2774AE" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>User not found.</Text>
      </View>
    );
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Row with Back Button and More Options */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          {!isOwnProfile && (
            <TouchableOpacity 
              style={styles.moreOptionsButton} 
              onPress={handleMoreOptions}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
            </TouchableOpacity>
          )}
        </View>

        {/* Blocked User Indicator */}
        {isBlocked && (
          <View style={styles.blockedBanner}>
            <Ionicons name="ban-outline" size={18} color="#D32F2F" />
            <Text style={styles.blockedBannerText}>You have blocked this user</Text>
          </View>
        )}

        {/* Profile Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/images/react-logo.png')} style={styles.profileImage} />
          <Text style={styles.name}>{profile.name || 'Full Name'}</Text>
          <Text style={styles.email}>{profile.email || 'user@email.com'}</Text>
          
          {/* Rating Display - Clickable */}
          {profile.averageRating > 0 && (
            <TouchableOpacity 
              style={styles.ratingContainer}
              onPress={() => router.push(`/reviews/${id}`)}
              activeOpacity={0.7}
            >
              <StarRating
                rating={profile.averageRating}
                size={20}
                color="#FFB300"
                emptyColor="#D1D5DB"
                disabled
              />
              <Text style={styles.ratingText}>
                {profile.averageRating.toFixed(1)} ({profile.totalRatings || 0} {profile.totalRatings === 1 ? 'review' : 'reviews'})
              </Text>
              {(profile.totalTripsCompleted || 0) > 0 && (
                <Text style={styles.statsText}>
                  {profile.totalTripsCompleted} trips completed
                </Text>
              )}
              <View style={styles.viewReviewsHint}>
                <Text style={styles.viewReviewsText}>Tap to view all reviews</Text>
                <Ionicons name="chevron-forward" size={14} color="#F57C00" />
              </View>
            </TouchableOpacity>
          )}
        </View>
        {/* User Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.bodyText}>School: {profile.school || '-'}</Text>
          <Text style={styles.bodyText}>Major: {profile.major || '-'}</Text>
          <Text style={styles.bodyText}>Graduation Year: {profile.graduationYear || '-'}</Text>
          <Text style={styles.bodyText}>Pronouns: {profile.pronouns || '-'}</Text>
          <Text style={styles.bodyText}>Bio: {profile.bio || '-'}</Text>
        </View>
        {/* Ride Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ride Preferences</Text>
          {profile.ridePreferences ? (
            <>
              <Text style={styles.bodyText}>Chattiness: {profile.ridePreferences.chattiness || '-'}</Text>
              <Text style={styles.bodyText}>Music Taste: {profile.ridePreferences.musicTaste || '-'}</Text>
              <Text style={styles.bodyText}>Pet Friendly: {profile.ridePreferences.petFriendly ? 'Yes' : 'No'}</Text>
              <Text style={styles.bodyText}>Smoking OK: {profile.ridePreferences.smokingOk ? 'Yes' : 'No'}</Text>
            </>
          ) : (
            <Text style={[styles.bodyText, { color: '#888' }]}>No ride preferences set.</Text>
          )}
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {reviews.length > 0 && (
              <TouchableOpacity onPress={() => router.push(`/reviews/${id}`)}>
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          {loadingReviews ? (
            <View style={styles.reviewsLoading}>
              <ActivityIndicator size="small" color="#2774AE" />
              <Text style={styles.loadingReviewsText}>Loading reviews...</Text>
            </View>
          ) : reviews.length > 0 ? (
            <View style={styles.reviewsList}>
              {reviews.slice(0, 3).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
              {reviews.length > 3 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => router.push(`/reviews/${id}`)}
                >
                  <Text style={styles.viewAllButtonText}>
                    View all {reviews.length} reviews
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#2774AE" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noReviews}>
              <Ionicons name="chatbubble-outline" size={32} color="#9CA3AF" />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        reportedUserName={profile?.name}
        submitting={safetySubmitting}
        error={submitError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#F7F9FB',
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: { paddingVertical: 8, paddingHorizontal: 0 },
  backButtonText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#2774AE', fontWeight: '600' },
  moreOptionsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  blockedBannerText: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#D32F2F',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2774AE',
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: '#E0E3E7',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
    color: '#1A1A1A',
  },
  email: {
    fontSize: 14,
    color: '#3C4F5A',
    marginBottom: 8,
    fontFamily: 'Lato_400Regular',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  bodyText: {
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 20,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#F57C00',
  },
  statsText: {
    fontSize: 13,
    fontFamily: 'Lato_400Regular',
    color: '#F57C00',
    marginTop: 2,
  },
  reviewsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingReviewsText: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#687076',
  },
  reviewsList: {
    gap: 12,
  },
  noReviews: {
    alignItems: 'center',
    padding: 24,
  },
  noReviewsText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#9CA3AF',
  },
  moreReviewsText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#2774AE',
    marginTop: 8,
  },
  viewReviewsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  viewReviewsText: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: '#F57C00',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllLink: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#2774AE',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EAF2FF',
    borderRadius: 8,
    marginTop: 12,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#2774AE',
  },
});
