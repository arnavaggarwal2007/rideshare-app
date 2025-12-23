import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

export default function OtherUserProfileScreen() {
  const { id } = useLocalSearchParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });

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
      } catch (e) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProfile();
  }, [id]);

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
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{'< Back'}</Text>
        </TouchableOpacity>
        {/* Profile Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/images/react-logo.png')} style={styles.profileImage} />
          <Text style={styles.name}>{profile.name || 'Full Name'}</Text>
          <Text style={styles.email}>{profile.email || 'user@email.com'}</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#F7F9FB',
    flexGrow: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E0E3E7',
    borderRadius: 6,
  },
  backButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#2774AE',
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
});
