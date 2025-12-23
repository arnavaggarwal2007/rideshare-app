import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { router } from 'expo-router';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CustomDropdown from '../../components/CustomDropdown';
import EmergencyContactInput from '../../components/EmergencyContactInput';
import PreferenceToggle from '../../components/PreferenceToggle';
import { auth, db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/AuthContext';

export default function EditProfileScreen() {
  const { userProfile, loading } = useAuth();
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });
  // Form state, initialized from userProfile
  const [fullName, setFullName] = useState(userProfile?.name || '');
  const [school, setSchool] = useState(userProfile?.school || 'Select your school');
  const [major, setMajor] = useState(userProfile?.major || 'Select Major');
  const [gradYear, setGradYear] = useState(userProfile?.graduationYear || 'Select Year');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [pronouns, setPronouns] = useState(userProfile?.pronouns || 'Prefer not to say');
  const [emergencyContacts, setEmergencyContacts] = useState(userProfile?.emergencyContacts || []);
  const [ridePreferences, setRidePreferences] = useState(userProfile?.ridePreferences || {
    musicTaste: 'Any',
    chattiness: 'Moderate',
    petFriendly: false,
    smokingOk: false,
  });
  const [saving, setSaving] = useState(false);
  // Validation logic (reuse from profile-setup)
  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Information', 'Please enter your full name.');
      return false;
    }
    if (fullName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
      return false;
    }
    if (!school || school === 'Select your school') {
      Alert.alert('Missing Information', 'Please select your school.');
      return false;
    }
    if (!major || major === 'Select Major') {
      Alert.alert('Missing Information', 'Please select your major.');
      return false;
    }
    if (!gradYear || gradYear === 'Select Year') {
      Alert.alert('Missing Information', 'Please select your graduation year.');
      return false;
    }
    if (bio.length > 200) {
      Alert.alert('Bio Too Long', 'Bio must be 200 characters or less.');
      return false;
    }
    return true;
  };

  // Save handler
  const { refreshProfile } = useAuth();
  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.uid) {
        Alert.alert('Not signed in', 'Please sign in and try again.');
        setSaving(false);
        return;
      }
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: fullName.trim(),
        school: school,
        major: major,
        graduationYear: gradYear,
        bio: bio.trim() || '',
        pronouns: pronouns !== 'Prefer not to say' ? pronouns : '',
        emergencyContacts: emergencyContacts,
        ridePreferences: ridePreferences,
        updatedAt: serverTimestamp(),
      });
      await refreshProfile(user.uid);
      Alert.alert('Profile Updated', 'Your changes have been saved.', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/(tabs)/profile');
          },
        },
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const schools = [
    'Select your school',
    'UCLA', 'USC', 'UC Berkeley', 'Stanford University', 'UC San Diego', 'UC Irvine', 'UC Santa Barbara', 'UC Davis', 'UC Riverside', 'UC Santa Cruz', 'UC Merced', 'Cal State LA', 'Cal State Pomona', 'Other',
  ];
  const majors = [
    'Select Major',
    'Computer Science', 'Business Administration', 'Engineering', 'Biology', 'Psychology', 'Economics', 'English', 'Political Science', 'Communications', 'Mathematics', 'Chemistry', 'Physics', 'Art', 'Music', 'Theater', 'History', 'Sociology', 'Philosophy', 'Environmental Science', 'Business-Economics', 'Biochemistry', 'Nursing', 'Pre-Med', 'Pre-Law', 'Other',
  ];
  const currentYear = new Date().getFullYear();
  const years = ['Select Year'];
  for (let i = 0; i < 6; i++) years.push((currentYear + i).toString());
  const pronounOptions = [
    'Prefer not to say', 'he/him', 'she/her', 'they/them', 'other',
  ];

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FB' }}>
        <ActivityIndicator size="large" color="#2774AE" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F7F9FB' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity onPress={() => router.dismiss()} style={styles.cancelButton} accessibilityLabel="Cancel Edit Profile">
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name<Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Jane Doe"
            placeholderTextColor="#7A8D99"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name"
          />
        </View>
        {/* School/University */}
        <CustomDropdown
          label="School/University"
          value={school}
          options={schools}
          onSelect={setSchool}
          placeholder="Select your school"
          required={true}
        />
        {/* Major */}
        <CustomDropdown
          label="Major"
          value={major}
          options={majors}
          onSelect={setMajor}
          placeholder="Select Major"
          required={true}
        />
        {/* Graduation Year */}
        <CustomDropdown
          label="Graduation Year"
          value={gradYear}
          options={years}
          onSelect={setGradYear}
          placeholder="Select Year"
          required={true}
        />
        {/* Bio */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio (optional)</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell others a bit about yourself..."
            placeholderTextColor="#7A8D99"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </View>
        {/* Pronouns */}
        <CustomDropdown
          label="Pronouns"
          value={pronouns}
          options={pronounOptions}
          onSelect={setPronouns}
          placeholder="Prefer not to say"
          required={false}
        />
        {/* Emergency Contacts */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Emergency Contacts (Optional)</Text>
          <Text style={styles.sectionSubtitle}>Add up to 3 emergency contacts for safety purposes</Text>
          {emergencyContacts.map((contact, index) => (
            <EmergencyContactInput
              key={index}
              contact={contact}
              index={index}
              onUpdate={(idx, field, value) => {
                const updated = [...emergencyContacts];
                updated[idx] = { ...updated[idx], [field]: value };
                setEmergencyContacts(updated);
              }}
              onRemove={() => {
                setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
              }}
            />
          ))}
          {emergencyContacts.length < 3 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setEmergencyContacts([
                  ...emergencyContacts,
                  { name: '', phone: '', relationship: '' },
                ]);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.addButtonText}>+ Add Emergency Contact</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Ride Preferences */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Ride Preferences (Optional)</Text>
          <Text style={styles.sectionSubtitle}>Help us match you with compatible riders</Text>
          <View style={styles.preferenceGroup}>
            <Text style={styles.preferenceLabel}>Music Preference</Text>
            <CustomDropdown
              options={['Any','Pop','Rock','Hip-Hop','Country','Classical','Indie','Electronic','Quiet (No Music)']}
              value={ridePreferences.musicTaste}
              onSelect={value => setRidePreferences({ ...ridePreferences, musicTaste: value })}
              placeholder="Any"
            />
          </View>
          <View style={styles.preferenceGroup}>
            <Text style={styles.preferenceLabel}>Conversation Level</Text>
            <CustomDropdown
              options={['Quiet', 'Moderate', 'Chatty']}
              value={ridePreferences.chattiness}
              onSelect={value => setRidePreferences({ ...ridePreferences, chattiness: value })}
              placeholder="Moderate"
            />
          </View>
          <View style={styles.toggleGroup}>
            <View style={{ marginBottom: 12 }}>
              <PreferenceToggle
                label="Pet-Friendly"
                value={ridePreferences.petFriendly}
                onToggle={() => setRidePreferences({ ...ridePreferences, petFriendly: !ridePreferences.petFriendly })}
              />
            </View>
            <View>
              <PreferenceToggle
                label="Smoking OK"
                value={ridePreferences.smokingOk}
                onToggle={() => setRidePreferences({ ...ridePreferences, smokingOk: !ridePreferences.smokingOk })}
              />
            </View>
          </View>
        </View>
        {/* Save Button (logic to be implemented in next step) */}
        <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} disabled={saving} onPress={handleSave} activeOpacity={0.8}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#F7F9FB',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2774AE',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Montserrat_700Bold',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 16,
    color: '#3C4F5A',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  required: {
    color: '#E9446A',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Lato_400Regular',
    backgroundColor: '#FFF',
    color: '#1A1A1A',
  },
  bioInput: {
    minHeight: 60,
    maxHeight: 120,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#2774AE',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#3C4F5A',
    marginBottom: 8,
    fontFamily: 'Lato_400Regular',
  },
  addButton: {
    marginTop: 8,
    backgroundColor: '#E6F0FA',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#2774AE',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
  preferenceGroup: {
    marginBottom: 12,
  },
  preferenceLabel: {
    fontSize: 15,
    color: '#3C4F5A',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  toggleGroup: {
    marginTop: 8,
  },
  button: {
    backgroundColor: '#2774AE',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E6F0FA',
    borderRadius: 6,
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#2774AE',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
});