// app/(auth)/forgot-password.js
// Password reset screen

import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { auth } from '../../firebaseConfig';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });

  if (!fontsLoaded) return null;

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetEmail = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!email) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent! Check your inbox.');
      setEmail('');

      // Auto-navigate back after 3 seconds
      setTimeout(() => {
        router.back();
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error.code, error.message);
      if (error.code === 'auth/user-not-found') {
        setErrorMessage('No account found with this email address');
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage('Invalid email address');
      } else {
        setErrorMessage(error.message || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Ionicons name="chevron-back" size={28} color="#2774AE" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a link to reset your password
          </Text>
        </View>

        {/* Error Message */}
        {errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Success Message */}
        {successMessage && (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Email Address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading && !successMessage}
            placeholderTextColor="#7A8D99"
          />
        </View>

        {/* Send Reset Link Button */}
        <TouchableOpacity
          style={[styles.button, (loading || successMessage) && styles.buttonDisabled]}
          onPress={handleSendResetEmail}
          disabled={loading || !!successMessage}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={20} color="#3C4F5A" />
          <Text style={styles.infoText}>
            Check your email (including spam folder) for the reset link. The link will expire
            in 1 hour.
          </Text>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#F7F9FB',
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2774AE',
    fontFamily: 'Montserrat_700Bold',
    marginLeft: 4,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#3C4F5A',
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'Lato_400Regular',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
    fontFamily: 'Lato_400Regular',
  },
  successContainer: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
    fontFamily: 'Lato_400Regular',
  },
  inputGroup: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  required: {
    color: '#FF0000',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E3E7',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A1A',
    fontFamily: 'Lato_400Regular',
  },
  button: {
    backgroundColor: '#2774AE',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#E8F4F8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 13,
    color: '#3C4F5A',
    marginLeft: 12,
    flex: 1,
    fontFamily: 'Lato_400Regular',
    lineHeight: 18,
  },
});
