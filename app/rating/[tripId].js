/**
 * Rating Screen
 * Allows users to rate their trip experience after completion
 */

import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import StarRating from '../../components/StarRating';
import { useAuth } from '../../hooks/AuthContext';
import { getTripById } from '../../services/firebase/firestore';
import { getUserById } from '../../services/firebase/users';
import { submitRatingThunk } from '../../store/slices/reviewsSlice';

export default function RatingScreen() {
	const { tripId } = useLocalSearchParams();
	const dispatch = useDispatch();

	// Auth state
	const user = useSelector((state) => state.auth.user);
	
	// Get refreshProfile from AuthContext
	const { refreshProfile } = useAuth();

	// Reviews state
	const { submitting } = useSelector((state) => state.reviews);

	// Local state
	const [rating, setRating] = useState(0);
	const [reviewText, setReviewText] = useState('');
	const [trip, setTrip] = useState(null);
	const [loading, setLoading] = useState(true);
	const [otherUser, setOtherUser] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [error, setError] = useState(null);

	// Load fonts
	const [fontsLoaded] = useFonts({
		Montserrat_700Bold,
		Lato_400Regular
	});

	// Fetch trip and user data on mount
	useEffect(() => {
		const fetchData = async () => {
			if (!tripId || !user?.uid) {
				setError('Missing trip or user information');
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setError(null);

				// Fetch trip details
				const tripData = await getTripById(tripId);

				if (!tripData) {
					setError('Trip not found');
					setLoading(false);
					return;
				}

				if (tripData.status !== 'completed') {
					setError('This trip has not been completed yet');
					setLoading(false);
					return;
				}

				setTrip(tripData);

				// Determine user's role in this trip
				const isDriver = tripData.driverId === user.uid;
				const isRider = tripData.riderId === user.uid;

				if (!isDriver && !isRider) {
					setError('You are not part of this trip');
					setLoading(false);
					return;
				}

				const role = isDriver ? 'driver' : 'rider';
				setUserRole(role);

				// Check if user has already rated this trip
				const ratingFlag = isDriver ? 'isRatedByDriver' : 'isRatedByRider';
				if (tripData[ratingFlag] === true) {
					Alert.alert(
						'Already Rated',
						'You have already rated this trip.',
						[{ text: 'OK', onPress: () => router.back() }]
					);
					return;
				}

				// Fetch the other user's profile
				const otherUserId = isDriver ? tripData.riderId : tripData.driverId;
				const otherUserData = await getUserById(otherUserId);

				setOtherUser(otherUserData || {
					name: isDriver ? tripData.riderName : tripData.driverName,
					photoURL: isDriver ? tripData.riderPhotoURL : tripData.driverPhotoURL
				});

			} catch (err) {
				console.error('[RatingScreen] Error fetching data:', err);
				setError(err.message || 'Failed to load trip details');
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [tripId, user?.uid]);

	// Handle rating submission
	const handleSubmit = async () => {
		if (rating === 0) {
			Alert.alert('Rating Required', 'Please select a star rating before submitting.');
			return;
		}

		const trimmedText = reviewText.trim();
		if (trimmedText.length > 500) {
			Alert.alert('Review Too Long', 'Please keep your review under 500 characters.');
			return;
		}

		const otherUserId = userRole === 'driver' ? trip.riderId : trip.driverId;

		try {
			await dispatch(submitRatingThunk({
				tripId,
				reviewerId: user.uid,
				revieweeId: otherUserId,
				rating,
				reviewText: trimmedText,
				reviewerRole: userRole
			})).unwrap();

			// Refresh the current user's profile to get updated rating stats
			// (in case they were rated by the other user)
			if (refreshProfile) {
				await refreshProfile(user.uid);
			}

			Alert.alert(
				'Thank You!',
				'Your rating has been submitted successfully.',
				[{ text: 'OK', onPress: () => router.back() }]
			);
		} catch (err) {
			Alert.alert(
				'Error',
				err || 'Failed to submit rating. Please try again.',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ text: 'Retry', onPress: handleSubmit }
				]
			);
		}
	};

	// Handle skip/later
	const handleSkip = () => {
		Alert.alert(
			'Skip Rating?',
			'You can rate this trip later from your trips list.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Skip', onPress: () => router.back() }
			]
		);
	};

	// Format trip date
	const formatTripDate = () => {
		if (!trip?.departureTimestamp) return '';

		try {
			const date = trip.departureTimestamp.toDate
				? trip.departureTimestamp.toDate()
				: new Date(trip.departureTimestamp);

			return date.toLocaleDateString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch (_e) {
			return '';
		}
	};

	// Get location short name (e.g., "1003, Calboro Drive")
	const getLocationShortName = (location) => {
		if (!location) return 'Unknown';
		const placeName = location.placeName || location.address || location.name || '';
		if (!placeName) return 'Unknown';
		
		// Split by comma and get meaningful parts
		const parts = placeName.split(',').map(p => p.trim()).filter(Boolean);
		if (parts.length >= 2) {
			// Return first two parts (typically address, city or city, state)
			const meaningfulParts = parts.filter(p => 
				!p.toLowerCase().includes('county') && 
				p.toLowerCase() !== 'united states' &&
				p.toLowerCase() !== 'usa'
			);
			if (meaningfulParts.length >= 2) {
				return `${meaningfulParts[0]}, ${meaningfulParts[1]}`;
			} else if (meaningfulParts.length === 1) {
				return meaningfulParts[0];
			}
		}
		return parts[0] || 'Unknown';
	};

	// Get route summary
	const getRouteSummary = () => {
		if (!trip) return '';

		const start = getLocationShortName(trip.startLocation);
		const end = getLocationShortName(trip.endLocation);

		return `${start} → ${end}`;
	};

	// Loading state
	if (loading || !fontsLoaded) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#1B4965" />
					<Text style={styles.loadingText}>Loading trip details...</Text>
				</View>
			</SafeAreaView>
		);
	}

	// Error state
	if (error) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.errorContainer}>
					<Ionicons name="alert-circle-outline" size={64} color="#D32F2F" />
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
						<Text style={styles.backButtonText}>Go Back</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<KeyboardAvoidingView
				style={styles.keyboardView}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
						<Ionicons name="close" size={28} color="#1B4965" />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Rate Your Trip</Text>
					<View style={{ width: 40 }} />
				</View>

				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
				>
					{/* User Card */}
					<View style={styles.userCard}>
						<View style={styles.avatarContainer}>
							{otherUser?.photoURL ? (
								<Image source={{ uri: otherUser.photoURL }} style={styles.avatar} />
							) : (
								<View style={styles.avatarPlaceholder}>
									<Ionicons name="person" size={40} color="#9CA3AF" />
								</View>
							)}
						</View>
						<Text style={styles.userName}>
							{otherUser?.name || (userRole === 'driver' ? 'Rider' : 'Driver')}
						</Text>
						<Text style={styles.userRole}>
							{userRole === 'driver' ? 'Your Passenger' : 'Your Driver'}
						</Text>
					</View>

					{/* Trip Info */}
					<View style={styles.tripInfo}>
						<Text style={styles.tripDate}>{formatTripDate()}</Text>
						<Text style={styles.tripRoute}>{getRouteSummary()}</Text>
					</View>

					{/* Star Rating Section */}
					<View style={styles.ratingSection}>
						<Text style={styles.ratingLabel}>How was your experience?</Text>
						<StarRating
							rating={rating}
							size={44}
							color="#FFD700"
							emptyColor="#D1D5DB"
							onRatingChange={setRating}
							spacing={8}
						/>
						<Text style={styles.ratingHint}>
							{rating === 0 ? 'Tap to rate' : `${rating} star${rating !== 1 ? 's' : ''}`}
						</Text>
					</View>

					{/* Review Text Input */}
					<View style={styles.reviewSection}>
						<Text style={styles.reviewLabel}>Share your experience (optional)</Text>
						<TextInput
							style={styles.reviewInput}
							placeholder="Tell others about your trip..."
							placeholderTextColor="#9CA3AF"
							value={reviewText}
							onChangeText={setReviewText}
							multiline
							maxLength={500}
							textAlignVertical="top"
						/>
						<Text style={styles.charCount}>
							{reviewText.length}/500
						</Text>
					</View>

					{/* Submit Button */}
					<TouchableOpacity
						style={[
							styles.submitButton,
							rating === 0 && styles.submitButtonDisabled
						]}
						onPress={handleSubmit}
						disabled={submitting || rating === 0}
					>
						{submitting ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Text style={styles.submitButtonText}>Submit Rating</Text>
						)}
					</TouchableOpacity>

					{/* Skip Link */}
					<TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
						<Text style={styles.skipButtonText}>Rate Later</Text>
					</TouchableOpacity>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#F7F9FB',
	},
	keyboardView: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
		color: '#687076',
		fontFamily: 'Lato_400Regular',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	errorText: {
		marginTop: 16,
		fontSize: 16,
		color: '#D32F2F',
		textAlign: 'center',
		fontFamily: 'Lato_400Regular',
	},
	backButton: {
		marginTop: 24,
		paddingVertical: 12,
		paddingHorizontal: 24,
		backgroundColor: '#1B4965',
		borderRadius: 8,
	},
	backButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontFamily: 'Montserrat_700Bold',
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
	headerBackButton: {
		padding: 4,
	},
	headerTitle: {
		fontSize: 18,
		fontFamily: 'Montserrat_700Bold',
		color: '#1B4965',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: 20,
		paddingBottom: 40,
	},
	userCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 24,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 3,
		marginBottom: 16,
	},
	avatarContainer: {
		marginBottom: 12,
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#E5E7EB',
	},
	avatarPlaceholder: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#E5E7EB',
		justifyContent: 'center',
		alignItems: 'center',
	},
	userName: {
		fontSize: 20,
		fontFamily: 'Montserrat_700Bold',
		color: '#1A1A1A',
		marginBottom: 4,
	},
	userRole: {
		fontSize: 14,
		fontFamily: 'Lato_400Regular',
		color: '#687076',
	},
	tripInfo: {
		alignItems: 'center',
		marginBottom: 24,
	},
	tripDate: {
		fontSize: 14,
		fontFamily: 'Lato_400Regular',
		color: '#687076',
		marginBottom: 4,
	},
	tripRoute: {
		fontSize: 15,
		fontFamily: 'Lato_400Regular',
		color: '#1B4965',
	},
	ratingSection: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 24,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 3,
		marginBottom: 16,
	},
	ratingLabel: {
		fontSize: 16,
		fontFamily: 'Montserrat_700Bold',
		color: '#1A1A1A',
		marginBottom: 16,
	},
	ratingHint: {
		marginTop: 12,
		fontSize: 14,
		fontFamily: 'Lato_400Regular',
		color: '#687076',
	},
	reviewSection: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 3,
		marginBottom: 24,
	},
	reviewLabel: {
		fontSize: 14,
		fontFamily: 'Montserrat_700Bold',
		color: '#1A1A1A',
		marginBottom: 12,
	},
	reviewInput: {
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 12,
		padding: 12,
		fontSize: 15,
		fontFamily: 'Lato_400Regular',
		color: '#1A1A1A',
		minHeight: 100,
		backgroundColor: '#F9FAFB',
	},
	charCount: {
		marginTop: 8,
		fontSize: 12,
		fontFamily: 'Lato_400Regular',
		color: '#9CA3AF',
		textAlign: 'right',
	},
	submitButton: {
		backgroundColor: '#1B4965',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
		marginBottom: 12,
	},
	submitButtonDisabled: {
		backgroundColor: '#9CA3AF',
	},
	submitButtonText: {
		fontSize: 16,
		fontFamily: 'Montserrat_700Bold',
		color: '#FFFFFF',
	},
	skipButton: {
		paddingVertical: 12,
		alignItems: 'center',
	},
	skipButtonText: {
		fontSize: 14,
		fontFamily: 'Lato_400Regular',
		color: '#687076',
		textDecorationLine: 'underline',
	},
});
