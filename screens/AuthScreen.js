// Authentication screen to handle sign in and sign up
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";

import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

 import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword
} from 'firebase/auth';

 import { auth } from '../firebaseConfig';

 export default function AuthScreen() {
    // Fonts
    const [fontsLoaded] = useFonts({
        Montserrat_400Regular,
        Montserrat_600SemiBold,
        Montserrat_700Bold,
        Lato_400Regular,
        Lato_700Bold,
    });
    // All state variables
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Checking if things are valid
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };
    const isValidPassword = (password) => {
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        return hasMinLength && hasUpperCase && hasNumber;
    };

    // Doing the authentication things
    const handleEmailAuth = async () => {
        setErrorMessage('');
        if (!email || !password) {
            setErrorMessage('Please fill in all fields');
            return;
        }
        if (!isValidEmail(email)) {
            setErrorMessage('Please enter a valid email address');
            return;
        }
        if (isSignUp) {
            if (password !== confirmPassword) {
                setErrorMessage('Passwords do not match');
                return;
            }
            if (!isValidPassword(password)) {
                setErrorMessage('Password must be at least 8 characters, contain one uppercase letter and one number');
                return;
            }
        }

        setLoading(true);

        try {
            if (isSignUp) {
                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );
                Alert.alert(
                    'Success! 🎉',
                    'Your account has been created successfully!',
                    [{ test: 'OK' }]
                );

                console.log('New user created:', userCredential.user.email);
            } else {
                const userCredential = await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                Alert.alert(
                    'Welcome back! 👋',
                    'Signed in as ${userCredential.user.email}',
                    [{ test: 'OK' }]
                );

                console.log('User signed in:', userCredential.user.email);
            }

            setEmail('');
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Authentication error:', error.code, error.message);
            switch (error.code) {
                case 'auth/email-already-in-use':
                    setErrorMessage('This email is already registered. Try signing in instead.');
                    break;
                case 'auth/invalid-email':
                    setErrorMessage('Invalid email address format');
                    break;
                case 'auth/weak-password':
                    setErrorMessage('Choose a stronger password');
                    break;
                case 'auth/user-not-found':
                    setErrorMessage('No account found with this email');
                    break;
                case 'auth/wrong-password':
                    setErrorMessage('Incorrect password');
                    break;
                case 'auth/invalid-credential':
                    setErrorMessage('Invalid email or password');
                    break;
                case 'auth/too-many-requests':
                    setErrorMessage('Too many failed attempts. Please try again later.');
                    break;
                default:
                    setErrorMessage('An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // For forgot password
    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert('Email required', 'Please enter your email address first');
            return;
        }
        if (!isValidEmail(email)) {
            Alert.alert('Invalid email', 'Please enter a valid email address');
            return;
        }

        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert(
                'Email sent!',
                'Password reset instructions have been sent to ${email}',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Password reset error:', error);
            if (error.code === 'auth/user-not-found') {
                Alert.alert('Error', 'No account found with this email address');
            } else {
                Alert.alert('Error', 'Failed to send reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Toggling between Sign up and Sign in
    const toggleAuthMode = () => {
        setErrorMessage('');
        
        setIsSignUp(!isSignUp);
        if (!isSignUp) {
            setConfirmPassword('');
        }
    };

    // Rendering the UI itself
    return (
        <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <Text style={styles.title}>Rideshare App</Text>
                    <Text style={styles.subtitle}>
                        {isSignUp ? 'Get Started' : 'Welcome Back'}
                    </Text>
                    <Text style={styles.description}>
                        Enter your email to {isSignUp ? 'sign up for' : 'sign in to'} this app
                    </Text>
                    {errorMessage ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}
                    <TextInput
                    style={styles.input}
                    placeholder="email@domain.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                    />
                    <View style={styles.passwordContainer}>
                        <TextInput
                        style={styles.passwordInput}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        editable={!loading}
                        />
                        <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                        >
                            <Text style={styles.eyeText}>{showPassword ? '👀' : '🫣'}</Text>
                        </TouchableOpacity>
                    </View>
                    {isSignUp && (
                        <View style={styles.passwordContainer}>
                            <TextInput
                            style={styles.passwordInput}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showConfirmPassword}
                            autoCapitalize="none"
                            editable={!loading}
                            />
                            <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <Text style={styles.eyeIcon}>
                                    {showConfirmPassword ? '👀' : '🫣'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {!isSignUp && (
                        <TouchableOpacity
                        onPress={handleForgotPassword}
                        disabled={loading}
                        style={styles.forgotPasswordContainer}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.buttonDisabled]}
                    onPress={handleEmailAuth}
                    disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {isSignUp ? 'Sign Up!' : 'Sign In!'}
                            </Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                    onPress={toggleAuthMode}
                    disabled={loading}
                    style={styles.toggleContainer}
                    >
                        <Text style={styles.toggleText}>
                            {isSignUp
                            ? "Already have an account? "
                            : "Don't have an account? "}
                            <Text style={styles.toggleLink}>
                                {isSignUp ? 'Sign in' : 'Sign up'}
                            </Text>
                        </Text>
                    </TouchableOpacity>
                    <Text style={styles.divider}>or</Text>
                    <TouchableOpacity
                    style={styles.socialButton}
                    disabled={true}
                    >
                        <Text style={styles.socialButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                    style={styles.socialButton}
                    disabled={true}
                    >
                        <Text style={styles.socialButtonText}>Continue with Apple</Text>
                    </TouchableOpacity>
                    <Text style={styles.terms}>
                        By clicking continue, you agree to out {' '}
                        <Text style={styles.link}>Terms of Service</Text> and {' '}
                        <Text style={styles.link}>Privacy Policy</Text>
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
 }

 // StyleSheet to make optimized style objects
 const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40,
        color: '#2774AE',
        fontFamily: 'Montserrat_700Bold',
    },
    subtitle: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
        color: '#1A1A1A',
        fontFamily: 'Montserrat_600SemiBold',
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        color: '#3C4F5A',
        marginBottom: 24,
        fontFamily: 'Lato_400Regular',
    },
    errorContainer: {
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        textAlign: 'center',
        fontFamily: 'Lato_400Regular',
    },
    input: {
        backgroundColor: '#FAFBFC',
        borderRadius: 8,
        pading: 16,
        fontSize: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E3E7',
        color: '#1A1A1A',
        fontFamily: 'Lato_400Regular',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFBFC',
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E3E7',
        paddingRight: 0,
    },
    passwordInput: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: '#1A1A1A',
        paddingRight: 0,
        fontFamily: 'Lato_400Regular',
    },
    eyeIcon: {
        padding: 12,
        paddingRight: 16,
    },
    eyeText: {
        fontsize: 20,
        color: '#3C4F5A',
    },
    forgotPasswordContainer: {
        alignSelf: 'flex-end',
        marginBottom: 16,
    },
    forgotPasswordText: {
        color: '#2774AE',
        fontSize: 14,
        textDecorationLine: 'underline',
        fontFamily: 'Lato_400Regular',
    },
    primaryButton: {
        backgroundColor: '#2774AE',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
    toggleContainer: {
        marginTop: 16,
        marginBottom: 16,
    },
    toggleText: {
        textAlign: 'center',
        color: '#3C4F5A',
        fontSize: 14,
        fontFamily: 'Lato_400Regular',
    },
    toggleLink: {
        color: '#2774AE',
        fontWeight: '600',
        fontFamily: 'Lato_700Bold',
    },
    divider: {
        textAlign: 'center',
        color: '#7A8D99',
        marginVertical: 20,
        fontSize: 14,
        fontFamily: 'Lato_400Regular',
    },
    socialButton: {
        backgroundColor: '#F7F9FB',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E3E7',
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1A1A',
        fontFamily: 'Lato_400Regular',
    },
    terms: {
        fontSize: 12,
        textAlign: 'center',
        color: '#7A8D99',
        marginTop: 24,
        lineHeight: 18,
        fontFamily: 'Lato_400Regular',
    },
    link: {
        color: '#2774AE',
        textDecorationLine: 'underline',
        fontFamily: 'Lato_400Regular',
    },
 });
