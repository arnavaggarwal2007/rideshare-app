

import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useCallback } from 'react';
import { ActivityIndicator, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import ReviewCard from '../../components/ReviewCard';
import StarRating from '../../components/StarRating';
import { auth } from '../../firebaseConfig';
import { useAuth } from '../../hooks/AuthContext';
import { fetchUserReviewsThunk } from '../../store/slices/reviewsSlice';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const loading = useSelector(state => state.auth.loading);
  const userProfile = useSelector(state => state.auth.userProfile);
  
  // Get refreshProfile from AuthContext
  const { refreshProfile } = useAuth();
  
  // Get reviews from Redux store
  const { userReviews, loading: loadingReviews } = useSelector((state) => state.reviews);
  const reviews = Array.isArray(userReviews) ? userReviews : [];
  
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });

  // Refresh profile and fetch reviews when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        // Refresh profile to get latest rating stats
        refreshProfile(user.uid);
        // Fetch user's reviews
        dispatch(fetchUserReviewsThunk({ userId: user.uid }));
      }
    }, [user?.uid, dispatch, refreshProfile])
  );

  if (!fontsLoaded) return null;
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F9FB" />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FB' }}>
            <ActivityIndicator size="large" color="#2774AE" />
            <Text style={{ marginTop: 16, fontSize: 16, color: '#2774AE', textAlign: 'center', fontFamily: 'Montserrat_700Bold', fontWeight: 'bold' }}>
              Loading your profile...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FB" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
        <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/images/react-logo.png')} style={styles.profileImage} />
          <Text style={styles.name}>{userProfile?.name || 'Full Name'}</Text>
          <Text style={styles.email}>{userProfile?.email || user?.user?.email || 'user@email.com'}</Text>
        </View>

        {/* Rating Display - Clickable */}
        {userProfile?.averageRating > 0 && (
          <TouchableOpacity 
            style={styles.ratingContainer}
            onPress={() => router.push(`/reviews/${user?.uid}`)}
            activeOpacity={0.7}
          >
            <StarRating
              rating={userProfile.averageRating}
              size={20}
              color="#FFB300"
              emptyColor="#D1D5DB"
              disabled
            />
            <Text style={styles.ratingText}>
              {userProfile.averageRating.toFixed(1)} ({userProfile.totalRatings || 0} {userProfile.totalRatings === 1 ? 'review' : 'reviews'})
            </Text>
            {(userProfile.totalTripsCompleted || 0) > 0 && (
              <Text style={styles.statsText}>
                {userProfile.totalTripsCompleted} trips completed
              </Text>
            )}
            <View style={styles.viewReviewsHint}>
              <Text style={styles.viewReviewsText}>Tap to view all reviews</Text>
              <Ionicons name="chevron-forward" size={14} color="#F57C00" />
            </View>
          </TouchableOpacity>
        )}

        {/* User Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.bodyText}>School: {userProfile?.school || '-'}</Text>
          <Text style={styles.bodyText}>Major: {userProfile?.major || '-'}</Text>
          <Text style={styles.bodyText}>Graduation Year: {userProfile?.graduationYear || '-'}</Text>
          <Text style={styles.bodyText}>Pronouns: {userProfile?.pronouns || '-'}</Text>
          <Text style={styles.bodyText}>Bio: {userProfile?.bio || '-'}</Text>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          {Array.isArray(userProfile?.emergencyContacts) && userProfile.emergencyContacts.length > 0 ? (
            userProfile.emergencyContacts.map((contact, idx) => (
              <View key={idx} style={{ marginBottom: 8 }}>
                <Text style={styles.bodyText}>Name: {contact.name || '-'}</Text>
                <Text style={styles.bodyText}>Phone: {contact.phone || '-'}</Text>
                <Text style={styles.bodyText}>Relationship: {contact.relationship || '-'}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.bodyText, { color: '#888' }]}>No emergency contacts added.</Text>
          )}
        </View>

        {/* Ride Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ride Preferences</Text>
          {userProfile?.ridePreferences ? (
            <>
              <Text style={styles.bodyText}>Chattiness: {userProfile.ridePreferences.chattiness || '-'}</Text>
              <Text style={styles.bodyText}>Music Taste: {userProfile.ridePreferences.musicTaste || '-'}</Text>
              <Text style={styles.bodyText}>Pet Friendly: {userProfile.ridePreferences.petFriendly ? 'Yes' : 'No'}</Text>
              <Text style={styles.bodyText}>Smoking OK: {userProfile.ridePreferences.smokingOk ? 'Yes' : 'No'}</Text>
            </>
          ) : (
            <Text style={[styles.bodyText, { color: '#888' }]}>No ride preferences set.</Text>
          )}
        </View>

        {/* Reviews Section - Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {reviews.length > 0 && (
              <TouchableOpacity onPress={() => router.push(`/reviews/${user?.uid}`)}>
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
                <ReviewCard key={review.id} review={review} showReviewerLink={true} />
              ))}
              {reviews.length > 3 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => router.push(`/reviews/${user?.uid}`)}
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
              <Text style={styles.noReviewsSubtext}>Complete trips to receive reviews</Text>
            </View>
          )}
        </View>

        {/* Edit Profile Button */}
        <TouchableOpacity style={styles.button} onPress={() => router.push('/modal/edit-profile')}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={async () => {
            try {
              await signOut(auth);
              router.replace('/(auth)/signin');
            } catch (error) {
              console.error('Sign out error:', error);
            }
          }}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 100,
    backgroundColor: '#F7F9FB',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: '#E0E3E7',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#3C4F5A',
    marginBottom: 8,
  },
  ratingContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  ratingText: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginTop: 8,
  },
  statsText: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#3C4F5A',
    marginTop: 4,
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
  button: {
    backgroundColor: '#2774AE',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
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
  noReviewsSubtext: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: '#B0B7BD',
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
