import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { router } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import CustomDropdown from '../../components/CustomDropdown';
import EmergencyContactInput from '../../components/EmergencyContactInput';
import PreferenceToggle from '../../components/PreferenceToggle';
import { auth, db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/AuthContext';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { Activity } from 'react';

const ProfileSetupScreen = () => {
    const [fontsLoaded] = useFonts({
        Montserrat_400Regular,
        Montserrat_600SemiBold,
        Montserrat_700Bold,
        Lato_400Regular,
        Lato_700Bold,
    });
    
    const [fullName, setFullName] = useState('');
    const [school, setSchool] = useState('Select your school');
    const [major, setMajor] = useState('Select Major');
    const [gradYear, setGradYear] = useState('Select Year');
    const [bio, setBio] = useState('');
    const [pronouns, setPronouns] = useState('Prefer not to say');
    const [profileImage, setProfileImage] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Emergency contacts (max 3)
    const [emergencyContacts, setEmergencyContacts] = useState([]);

    // Access refreshProfile from useAuth
    const { refreshProfile } = useAuth();
    
    // Ride preferences
    const [ridePreferences, setRidePreferences] = useState({
        musicTaste: 'Any',
        chattiness: 'Moderate',
        petFriendly: false,
        smokingOk: false,
    });

    const schools = [
        'Select your school',
        'UCLA',
        'USC',
        'UC Berkeley',
        'Stanford University',
        'UC San Diego',
        'UC Irvine',
        'UC Santa Barbara',
        'UC Davis',
        'UC Riverside',
        'UC Santa Cruz',
        'UC Merced',
        'Cal State LA',
        'Cal State Pomona',
        'Other',
    ];

    const majors = [
        'Select Major',
        'Computer Science',
        'Business Administration',
        'Engineering',
        'Biology',
        'Psychology',
        'Economics',
        'English',
        'Political Science',
        'Communications',
        'Mathematics',
        'Chemistry',
        'Physics',
        'Art',
        'Music',
        'Theater',
        'History',
        'Sociology',
        'Philosophy',
        'Environmental Science',
        'Business-Economics',
        'Biochemistry',
        'Nursing',
        'Pre-Med',
        'Pre-Law',
        'Other',
    ];

    const currentYear = new Date().getFullYear();
    const years = ['Select Year'];
    for (let i = 0; i < 6; i++) {
        years.push((currentYear + i).toString());
    }

    const pronounOptions = [
        'Prefer not to say',
        'he/him',
        'she/her',
        'they/them',
        'other',
    ];

    const pickImage = async () => {
        // Photo uploads disabled on free Firebase plan
        Alert.alert(
            'Photo Upload Disabled',
            'Profile photos are currently disabled. You can add one later when storage is enabled.'
        );
        return;
    };

    // const uploadImage = async (uri) => {
    //     if (!uri) return null;
    //     try {
    //         const response = await fetch(uri);
    //         const blob = await response.blob();
    //         const filename = `profile_photos/${auth.currentUser.uid}_${Date.now()}.jpg`;
    //         const storageRef = ref(storage, filename);
    //         await uploadBytes(storageRef, blob);
    //         const downloadURL = await getDownloadURL(storageRef);
    //         return downloadURL;
    //     } catch (error) {
    //         console.error('Error uploading image:', error);
    //         throw error;
    //     }
    // };

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

    const handleGetStarted = async () => {
        if (!validateForm()) return;

        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user || !user.uid) {
                Alert.alert('Not signed in', 'Please sign in and try again.');
                setLoading(false);
                return;
            }

            // Check if profile already exists
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            console.log('[ProfileSetup] Firestore userDocSnap.exists:', userDocSnap.exists());
            if (userDocSnap.exists()) {
                console.log('[ProfileSetup] Firestore userDocSnap.data:', userDocSnap.data());
            }
            if (userDocSnap.exists() && userDocSnap.data().profileComplete) {
                Alert.alert(
                    'Profile Already Exists',
                    'You already have a completed profile. Redirecting to home.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.replace('/(tabs)/home'),
                        }
                    ]
                );
                setLoading(false);
                return;
            }

            // Photo uploads are disabled on the current plan; default to empty string
            const photoURL = '';

            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                name: fullName.trim(),
                school: school,
                major: major,
                graduationYear: gradYear,
                bio: bio.trim() || '',
                pronouns: pronouns != 'Prefer not to say' ? pronouns : '',
                photoURL: photoURL,
                emergencyContacts: emergencyContacts,
                ridePreferences: ridePreferences,
                profileComplete: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Refresh profile state so navigation guard sees profileComplete immediately
            await refreshProfile(user.uid);

            Alert.alert(
                'Profile Created! 🎉',
                'Your profile has been set up successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/(tabs)/home'), // Adjust to home screen later when fully made
                    }
                ]
            );
        } catch (error) {
            console.error('Error creating profile:', error);
            Alert.alert(
                'Error',
                'Failed to create profile. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    if (!fontsLoaded) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2774AE" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Create your profile</Text>
                <Text style={styles.subtitle}>
                    Tell us a bit about yourself to get started
                </Text>
                {/* Profile Photo */}
                <TouchableOpacity
                style={styles.photoContainer}
                onPress={pickImage}
                activeOpacity={0.7}
                >
                    {profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.profileImage} />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <View style={styles.dashedCircle} />
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity onPress={pickImage}>
                    <Text style={styles.photoLink}>Add a profile photo</Text>
                </TouchableOpacity>
                {/* Full Name */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name<Text style={styles.required}>*</Text></Text>
                    <TextInput
                    style={[styles.input]}
                    placeholder="Jane Doe"
                    placeholderTextColor="#7A8D99"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize='words'
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
                    <Text style={styles.sectionSubtitle}>
                        Add up to 3 emergency contacts for safety purposes
                    </Text>
                    
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
                    <Text style={styles.sectionSubtitle}>
                        Help us match you with compatible riders
                    </Text>
                    
                    <View style={styles.preferenceGroup}>
                        <Text style={styles.preferenceLabel}>Music Preference</Text>
                        <CustomDropdown
                            options={[
                                'Any',
                                'Pop',
                                'Rock',
                                'Hip-Hop',
                                'Country',
                                'Classical',
                                'Indie',
                                'Electronic',
                                'Quiet (No Music)',
                            ]}
                            value={ridePreferences.musicTaste}
                            onSelect={(value) =>
                                setRidePreferences({ ...ridePreferences, musicTaste: value })
                            }
                            placeholder="Any"
                        />
                    </View>
                    
                    <View style={styles.preferenceGroup}>
                        <Text style={styles.preferenceLabel}>Conversation Level</Text>
                        <CustomDropdown
                            options={['Quiet', 'Moderate', 'Chatty']}
                            value={ridePreferences.chattiness}
                            onSelect={(value) =>
                                setRidePreferences({ ...ridePreferences, chattiness: value })
                            }
                            placeholder="Moderate"
                        />
                    </View>
                    
                    <View style={styles.toggleGroup}>
                        <PreferenceToggle
                            label="Pet-Friendly"
                            value={ridePreferences.petFriendly}
                            onToggle={() =>
                                setRidePreferences({
                                    ...ridePreferences,
                                    petFriendly: !ridePreferences.petFriendly,
                                })
                            }
                        />
                        <PreferenceToggle
                            label="Smoking OK"
                            value={ridePreferences.smokingOk}
                            onToggle={() =>
                                setRidePreferences({
                                    ...ridePreferences,
                                    smokingOk: !ridePreferences.smokingOk,
                                })
                            }
                        />
                    </View>
                </View>
                
                {/* Get Started Button */}
                <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleGetStarted}
                disabled={loading}
                activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>Get Started</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        color: '#2774AE',
        textAlign: 'center',
        marginBottom: 8,
        fontFamily: 'Montserrat_700Bold',
    },
    subtitle: {
        fontSize: 14,
        color: '#3C4F5A',
        textAlign: 'center',
        marginBottom: 32,
        fontFamily: 'Lato_400Regular',
    },
    photoContainer: {
        alignSelf: 'center',
        marginBottom: 12,
    },
    photoPlaceholder: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dashedCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#E0E3E7',
        backgroundColor: '#F7F9FB',
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    photoLink: {
        fontSize: 14,
        color: '#2774AE',
        textAlign: 'center',
        marginBottom: 32,
        fontFamily: 'Lato-400Regular',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
        fontFamily: 'Montserrat_600SemiBold',
    },
    required: {
        color: '#FF0000',
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
    input: {
        backgroundColor: '#F7F9FB',
        borderWidth: 1,
        borderColor: '#E0E3E7',
        borderRadius: 8,
        padding: 14,
        fontSize: 16,
        color: '#1A1A1A',
    },
    bioInput: {
        height: 100,
        paddingTop: 14,
    },
    charCount: {
        fontSize: 12,
        color: '#7A8D99',
        textAlign: 'right',
        marginTop: 4,
        fontFamily: 'Lato_400Regular',
    },
    button: {
        backgroundColor: '#2774AE',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 40,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
    sectionContainer: {
        marginTop: 24,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
        color: '#2774AE',
        marginBottom: 6,
    },
    sectionSubtitle: {
        fontSize: 13,
        fontFamily: 'Lato_400Regular',
        color: '#7A8D99',
        marginBottom: 16,
    },
    addButton: {
        backgroundColor: '#F0F7FF',
        borderWidth: 1.5,
        borderColor: '#2774AE',
        borderStyle: 'dashed',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    addButtonText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 14,
        color: '#2774AE',
    },
    preferenceGroup: {
        marginBottom: 16,
    },
    preferenceLabel: {
        fontSize: 14,
        fontFamily: 'Montserrat_600SemiBold',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    toggleGroup: {
        marginTop: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
});

export default ProfileSetupScreen;