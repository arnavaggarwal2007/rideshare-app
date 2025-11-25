import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
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
import { auth, db } from '../firebaseConfig';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { Activity } from 'react';

const ProfileSetupScreen = () => {
    const [fullName, setFullName] = useState('');
    const [school, setSchool] = useState('');
    const [major, setMajor] = useState('');
    const [gradYear, setGradYear] = useState('');
    const [bio, setBio] = useState('');
    const [pronouns, setPronouns] = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [loading, setLoading] = useState(false);

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
        const { status } = await
        ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status != 'granted') {
            Alert.alert(
                'Permission Required',
                'Sorry, we need camera roll permissions to upload a profile photo.'
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
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
            let photoURL = null;
            if (profileImage) {
                photoURL = await uploadImage(profileImage);
            }

            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                name: fullName.trim(),
                school: school,
                major: major,
                graduationYear: gradYear,
                bio: bio.trim() || '',
                pronouns: pronouns != 'Prefer not to say' ? pronouns : '',
                photoURL: photoURL || '',
                profileComplete: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

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
                    <Text style={styles.label}>
                        Full Name<Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                    style={styles.input}
                    placeholder="Jane Doe"
                    placeholderTextColor="#7A8D99"
                    value={fullName}
                    onchangeText={(text) => setFullName(text)}
                    autocapitalize="words"
                    autoCorrect={false}
                    autoComplete="name"
                    />
                </View>
                {/* School/University */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        School/University<Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                        selectedValue={school}
                        onValueChange={(itemValue) => setSchool(itemValue)}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                        >
                            {schools.map((schoolOption, index) => (
                                <Picker.Item
                                key={index}
                                label={schoolOption}
                                value={schoolOption}
                                // color={schoolOption === 'Select your school' ? "#7A8D99" : "#1A1A1A"}
                                />
                            ))}
                        </Picker>
                    </View>
                </View>
                {/* Major */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Major<Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                        selectedValue={major}
                        onValueChange={(itemValue) => setMajor(itemValue)}
                        style={styles.picker}
                        itemStyle={styles.pickerItems}
                        >
                            {majors.map((majorOption, index) => (
                                <Picker.Item
                                key={index}
                                label={majorOption}
                                value={majorOption}
                                // color={majorOption === 'Select Major' ? "#7A8D99" : "#1A1A1A"}
                                />
                            ))}
                        </Picker>
                    </View>
                </View>
                {/* Graduation Year */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Graduation Year<Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                        selectedValue={gradYear}
                        onValueChange={(itemValue) => setGradYear(itemValue)}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                        >
                            {years.map((year, index) => (
                                <Picker.Item
                                key={index}
                                label={year}
                                value={year}
                                // color={year === 'Select Year' ? "#7A8D99" : "#1A1A1A"}
                                />
                            ))}
                        </Picker>
                    </View>
                </View>
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
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Pronouns (optional)</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                        selectedValue={pronouns || 'Prefer not to say'}
                        onValueChange={(itemValue) => setPronouns(itemValue)}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                        >
                            {pronounOptions.map((pronounOption, index) => (
                                <Picker.Item
                                key={index}
                                label={pronounOption}
                                value={pronounOption}
                                // color="#1A1A1A"
                                />
                            ))}
                        </Picker>
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
    },
    subtitle: {
        fontSize: 14,
        color: '#3C4F5A',
        textAlign: 'center',
        marginBottom: 32,
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
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    required: {
        color: '#FF0000',
        fontWeight: '600',
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
    },
    pickerContainer: {
        backgroundColor: '#F7F9FB',
        borderWidth: 1,
        borderColor: '#E0E3E7',
        borderRadius: 8,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        color: '#1A1A1A',
    },
    pickerItem: {
        height: 50,
        fontSize: 16,
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
        fontWeigth: '600',
    },
});

export default ProfileSetupScreen;