

import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/AuthContext';
import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

export default function ProfileScreen() {
  const { user, userProfile, loading } = useAuth();
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });
  if (!fontsLoaded) return null;
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FB' }}>
          <ActivityIndicator size="large" color="#2774AE" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#2774AE', textAlign: 'center', fontFamily: 'Montserrat_700Bold', fontWeight: 'bold' }}>
            Loading your profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/images/react-logo.png')} style={styles.profileImage} />
          <Text style={styles.name}>{userProfile?.name || 'Full Name'}</Text>
          <Text style={styles.email}>{userProfile?.email || user?.user?.email || 'user@email.com'}</Text>
        </View>

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
                <Text style={styles.bodyText}>Phone: {contact.phoneNumber || '-'}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#F7F9FB',
    flexGrow: 1,
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
});
