import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ThemedText } from '../../components/themed-text';
import { getTripById, subscribeToTrip } from '../../services/firebase/firestore';
import { createChatThunk } from '../../store/slices/chatsSlice';
import { confirmTripCompletionThunk, updateTripStatusThunk } from '../../store/slices/tripsSlice';

// Helper function to get status color and icon
function getStatusStyle(status) {
  const statusLower = (status || 'confirmed').toLowerCase();
  switch (statusLower) {
    case 'confirmed':
      return { color: '#2E7D32', bgColor: '#E8F5E9', icon: 'checkmark-circle' };
    case 'in-progress':
      return { color: '#1565C0', bgColor: '#E3F2FD', icon: 'navigate' };
    case 'completed':
      return { color: '#6A1B9A', bgColor: '#F3E5F5', icon: 'checkmark-done' };
    case 'cancelled':
      return { color: '#D32F2F', bgColor: '#FFEBEE', icon: 'close-circle' };
    default:
      return { color: '#687076', bgColor: '#F5F5F5', icon: 'help-circle' };
  }
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp.toDate ? timestamp.toDate() : timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month} ${hours}:${mins}`;
  } catch (_e) {
    return '';
  }
}

export default function TripDetailsScreen() {
  const { id: tripId } = useLocalSearchParams();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const userProfile = useSelector((state) => state.auth.userProfile);
  
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!tripId) return;

    // Initial load
    const fetchTrip = async () => {
      try {
        setLoading(true);
        setError(null);
        const tripData = await getTripById(tripId);
        if (!tripData) {
          setError('Trip not found.');
        } else {
          setTrip(tripData);
        }
      } catch (e) {
        console.error('Error fetching trip:', e);
        setError(e?.message || 'Failed to load trip details.');
      } finally {
        setLoading(false);
      }
    };

    // Fetch initial trip data
    fetchTrip();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToTrip(tripId, (updatedTrip) => {
      if (updatedTrip) {
        setTrip(updatedTrip);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tripId]);

  // Parse route polyline
  const rideRoute = React.useMemo(() => {
    if (!trip?.routePolyline) {
      console.log('[TripDetails] No routePolyline found');
      return [];
    }
    try {
      const parsed = JSON.parse(trip.routePolyline);
      console.log('[TripDetails] Parsed route polyline:', parsed.length, 'coordinates');
      return parsed;
    } catch (_e) {
      console.error('[TripDetails] Failed to parse route polyline:', _e);
      return [];
    }
  }, [trip?.routePolyline]);

  const handleMessagePress = async () => {
    if (!trip || !user || !userProfile) return;

    try {
      setMessagingLoading(true);

      // Determine who the other participant is
      const isDriver = trip.driverId === user.uid;
      const otherParticipantId = isDriver ? trip.riderId : trip.driverId;
      
      if (!otherParticipantId) {
        Alert.alert('Error', 'Could not determine chat participant');
        return;
      }

      // Check if chat already exists for this trip
      if (trip.chatId) {
        // Chat was created when trip was confirmed, navigate directly
        router.push(`/chat/${trip.chatId}`);
        return;
      }

      // Fallback: Create chat if it doesn't exist (for trips created before auto-chat feature)
      const driverProfile = isDriver ? userProfile : { name: trip.driverName };
      const riderProfile = isDriver ? { name: trip.riderName } : userProfile;

      const action = await dispatch(createChatThunk({
        driverId: trip.driverId,
        riderId: trip.riderId,
        tripId,
        rideId: trip.rideId,
        driverProfile,
        riderProfile,
      }));

      if (action.payload && action.payload.id) {
        // Navigate to chat
        router.push(`/chat/${action.payload.id}`);
      } else {
        Alert.alert('Error', 'Failed to create chat');
      }
    } catch (err) {
      console.error('Error starting chat:', err);
      Alert.alert('Error', err?.message || 'Failed to start chat');
    } finally {
      setMessagingLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!trip || !user) return;

    // Verify user is the driver
    if (trip.driverId !== user.uid) {
      Alert.alert('Error', 'Only the driver can start the trip');
      return;
    }

    Alert.alert(
      'Start Trip?',
      'I\'ve picked up the passenger. Start the trip now?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Start Trip',
          onPress: async () => {
            try {
              setLoading(true);
              const action = await dispatch(updateTripStatusThunk({
                tripId: trip.id,
                driverId: user.uid,
                newStatus: 'in-progress',
              }));

              if (action.payload && !action.error) {
                setTrip(action.payload);
                Alert.alert('Success', 'Trip started!');
              } else {
                Alert.alert('Error', action.error?.message || 'Failed to start trip');
              }
            } catch (err) {
              console.error('Error starting trip:', err);
              Alert.alert('Error', err?.message || 'Failed to start trip');
            } finally {
              setLoading(false);
            }
          },
          style: 'default',
        },
      ]
    );
  };

  const handleCompleteTrip = async () => {
    if (!trip || !user) return;

    // Verify user is the driver
    if (trip.driverId !== user.uid) {
      Alert.alert('Error', 'Only the driver can complete the trip');
      return;
    }

    Alert.alert(
      'Complete Trip?',
      'Trip complete? Passenger dropped off?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Complete Trip',
          onPress: async () => {
            try {
              setLoading(true);
              const action = await dispatch(updateTripStatusThunk({
                tripId: trip.id,
                driverId: user.uid,
                newStatus: 'completed',
              }));

              if (action.payload && !action.error) {
                setTrip(action.payload);
                Alert.alert('Success', 'Trip completed!');
              } else {
                Alert.alert('Error', action.error?.message || 'Failed to complete trip');
              }
            } catch (err) {
              console.error('Error completing trip:', err);
              Alert.alert('Error', err?.message || 'Failed to complete trip');
            } finally {
              setLoading(false);
            }
          },
          style: 'default',
        },
      ]
    );
  };

  const handleCancelTrip = async () => {
    if (!trip || !user) return;

    // Only driver can cancel from confirmed status
    const isDriver = trip.driverId === user.uid;
    const isRider = trip.riderId === user.uid;

    if (!isDriver && !isRider) {
      Alert.alert('Error', 'You are not part of this trip');
      return;
    }

    if (trip.status !== 'confirmed') {
      Alert.alert('Error', 'Can only cancel confirmed trips');
      return;
    }

    // Check if trip starts in more than 1 hour
    const departureTimestamp = trip.departureTimestamp?.toDate?.() || trip.departureTimestamp;
    if (!departureTimestamp) {
      Alert.alert('Error', 'Trip departure time not set');
      return;
    }
    const departureTime = new Date(departureTimestamp);
    if (isNaN(departureTime.getTime())) {
      Alert.alert('Error', 'Invalid trip departure time');
      return;
    }
    const now = new Date();
    const timeDiffMinutes = (departureTime - now) / (1000 * 60);

    if (timeDiffMinutes <= 60) {
      Alert.alert('Error', 'Can only cancel trips that start in more than 1 hour');
      return;
    }

    // Show cancel modal for cross-platform support (Alert.prompt is iOS-only)
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const confirmCancelTrip = async () => {
    setCancelModalVisible(false);
    
    try {
      setLoading(true);
      const action = await dispatch(updateTripStatusThunk({
        tripId: trip.id,
        driverId: user.uid,
        newStatus: 'cancelled',
        cancellationReason: cancelReason || '',
      }));

      if (action.payload) {
        setTrip(action.payload);
        Alert.alert('Success', 'Trip cancelled!');
      } else {
        Alert.alert('Error', 'Failed to cancel trip');
      }
    } catch (err) {
      console.error('Error cancelling trip:', err);
      Alert.alert('Error', err?.message || 'Failed to cancel trip');
    } finally {
      setLoading(false);
    }
  };

  const handleRiderConfirmCompletion = async () => {
    if (!trip || !user) return;

    // Verify user is the rider
    if (trip.riderId !== user.uid) {
      Alert.alert('Error', 'Only the rider can confirm trip completion');
      return;
    }

    // Check trip status is completed
    if (trip.status !== 'completed') {
      Alert.alert('Error', 'Trip must be completed by driver before you can confirm');
      return;
    }

    Alert.alert(
      'Confirm Trip Completion?',
      'Has the driver dropped you off and completed the trip as expected?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Confirm Completion',
          onPress: async () => {
            try {
              setLoading(true);
              const action = await dispatch(confirmTripCompletionThunk({
                tripId: trip.id,
                riderId: user.uid,
              }));

              if (action.payload && !action.error) {
                setTrip(action.payload);
                Alert.alert('Success', 'Trip confirmed! Thank you for riding with us.');
              } else {
                Alert.alert('Error', action.error?.message || 'Failed to confirm trip');
              }
            } catch (err) {
              console.error('Error confirming trip:', err);
              Alert.alert('Error', err?.message || 'Failed to confirm trip');
            } finally {
              setLoading(false);
            }
          },
          style: 'default',
        },
      ]
    );
  };

  const handleShareTrip = async () => {
    if (!trip) return;

    try {
      // Format departure date and time for display
      const departureDate = trip.departureTimestamp?.toDate 
        ? trip.departureTimestamp.toDate() 
        : new Date(trip.departureTimestamp);
      const formattedDate = departureDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const formattedTime = departureDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });

      // Get location names
      const startLocation = trip.startLocation?.placeName || trip.startLocation?.address || 'Start';
      const endLocation = trip.endLocation?.placeName || trip.endLocation?.address || 'Destination';

      // Generate deep link URL
      const deepLink = Linking.createURL(`/trip/${tripId}`);

      // Create share message
      const shareMessage = `🚗 Trip Details\n\n` +
        `📍 From: ${startLocation}\n` +
        `📍 To: ${endLocation}\n` +
        `📅 ${formattedDate}\n` +
        `⏰ ${formattedTime}\n` +
        `👤 Driver: ${trip.driverName || 'Driver'}\n` +
        `💺 Seats: ${trip.seatsBooked || 1}\n\n` +
        `Track my trip in the RideShare app:\n${deepLink}`;

      const result = await Share.share({
        message: shareMessage,
        title: `Trip to ${endLocation}`,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('[handleShareTrip] Shared via:', result.activityType);
        } else {
          console.log('[handleShareTrip] Share completed');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('[handleShareTrip] Share dismissed');
      }
    } catch (err) {
      console.error('[handleShareTrip] Error:', err);
      Alert.alert('Error', 'Failed to share trip details');
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2774AE" />
          <ThemedText style={styles.loadingText}>Loading trip details...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backButtonText}>← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.error}>{error || 'Trip not found.'}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Trip Details</ThemedText>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Status Timeline Section */}
        <View style={styles.statusTimelineCard}>
          <ThemedText style={styles.sectionTitle}>Trip Status</ThemedText>
          <View style={styles.statusTimelineContainer}>
            {/* Current Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(trip.status).bgColor }]}>
              <Ionicons 
                name={getStatusStyle(trip.status).icon} 
                size={18} 
                color={getStatusStyle(trip.status).color} 
              />
              <ThemedText style={[styles.statusText, { color: getStatusStyle(trip.status).color }]}>
                {(trip.status || 'Confirmed').charAt(0).toUpperCase() + (trip.status || 'Confirmed').slice(1).replace('-', ' ')}
              </ThemedText>
            </View>

            {/* Status History Timeline */}
            {trip.statusHistory && trip.statusHistory.length > 0 && (
              <View style={styles.statusHistoryContainer}>
                <ThemedText style={styles.statusHistoryTitle}>Status History</ThemedText>
                {trip.statusHistory.map((item, idx) => (
                  <View key={idx} style={styles.historyItem}>
                    <View style={styles.historyDot} />
                    <View style={styles.historyContent}>
                      <ThemedText style={styles.historyStatus}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('-', ' ')}
                      </ThemedText>
                      <ThemedText style={styles.historyTime}>
                        {formatTimestamp(item.timestamp)}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Map with Route and Locations */}
        <View style={styles.mapCard}>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={
                rideRoute.length > 0
                  ? {
                      latitude: rideRoute[Math.floor(rideRoute.length / 2)]?.latitude || 0,
                      longitude: rideRoute[Math.floor(rideRoute.length / 2)]?.longitude || 0,
                      latitudeDelta: 2,
                      longitudeDelta: 2,
                    }
                  : {
                      latitude: 39.8283,
                      longitude: -98.5795,
                      latitudeDelta: 20,
                      longitudeDelta: 20,
                    }
              }
            >
              {/* Original ride route polyline */}
              {rideRoute.length > 0 && (
                <Polyline 
                  coordinates={rideRoute} 
                  strokeColor="#2774AE" 
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
              
              {/* Fallback: draw straight line between start and end if no polyline */}
              {rideRoute.length === 0 && trip.startLocation?.coordinates && trip.endLocation?.coordinates && (
                <Polyline 
                  coordinates={[
                    trip.startLocation.coordinates,
                    trip.endLocation.coordinates
                  ]} 
                  strokeColor="#2774AE" 
                  strokeWidth={4}
                  strokeStyle="dashed"
                />
              )}

              {/* Start location */}
              {trip.startLocation?.coordinates && (
                <Marker
                  coordinate={trip.startLocation.coordinates}
                  title="Ride Start"
                  description={trip.startLocation.placeName}
                  pinColor="#2774AE"
                />
              )}

              {/* End location */}
              {trip.endLocation?.coordinates && (
                <Marker
                  coordinate={trip.endLocation.coordinates}
                  title="Ride End"
                  description={trip.endLocation.placeName}
                  pinColor="#D32F2F"
                />
              )}

              {/* Pickup location (if custom) */}
              {trip.pickupLocation && (
                <Marker
                  coordinate={trip.pickupLocation}
                  title="Your Pickup"
                  pinColor="#4CAF50"
                >
                  <View style={styles.customMarker}>
                    <Ionicons name="locate" size={24} color="#4CAF50" />
                  </View>
                </Marker>
              )}

              {/* Dropoff location (if custom) */}
              {trip.dropoffLocation && (
                <Marker
                  coordinate={trip.dropoffLocation}
                  title="Your Dropoff"
                  pinColor="#FF9800"
                >
                  <View style={styles.customMarker}>
                    <Ionicons name="flag" size={24} color="#FF9800" />
                  </View>
                </Marker>
              )}
            </MapView>
          </View>
        </View>

        {/* Trip Information */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Trip Information</ThemedText>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#687076" />
            <ThemedText style={styles.label}>Date & Time</ThemedText>
            <ThemedText style={styles.value}>
              {trip.departureTimestamp ? new Date(trip.departureTimestamp.toDate ? trip.departureTimestamp.toDate() : trip.departureTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Invalid Date'} • {trip.departureTimestamp ? new Date(trip.departureTimestamp.toDate ? trip.departureTimestamp.toDate() : trip.departureTimestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Invalid Date'}
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color="#687076" />
            <ThemedText style={styles.label}>Seats Booked</ThemedText>
            <ThemedText style={styles.value}>{trip.seatsBooked || 1}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#687076" />
            <ThemedText style={styles.label}>Total Cost</ThemedText>
            <ThemedText style={styles.value}>
              ${((trip.pricePerSeat || 0) * (trip.seatsBooked || 1)).toFixed(2)}
            </ThemedText>
          </View>
        </View>

        {/* Participants */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Participants</ThemedText>
          
          {/* Driver */}
          <View style={styles.participantRow}>
            <Ionicons name="car-outline" size={20} color="#2774AE" />
            <View style={styles.participantInfo}>
              <ThemedText style={styles.participantName}>{trip.driverName || 'Driver'}</ThemedText>
              <ThemedText style={styles.participantRole}>Driver</ThemedText>
            </View>
            {trip.driverRating > 0 && (
              <View style={styles.ratingBox}>
                <Ionicons name="star" size={14} color="#FFB300" />
                <ThemedText style={styles.ratingText}>{trip.driverRating.toFixed(1)}</ThemedText>
              </View>
            )}
          </View>

          {/* Rider */}
          <View style={styles.participantRow}>
            <Ionicons name="person-outline" size={20} color="#4CAF50" />
            <View style={styles.participantInfo}>
              <ThemedText style={styles.participantName}>{trip.riderName || 'Rider'}</ThemedText>
              <ThemedText style={styles.participantRole}>Rider (You)</ThemedText>
            </View>
            {trip.riderRating > 0 && (
              <View style={styles.ratingBox}>
                <Ionicons name="star" size={14} color="#FFB300" />
                <ThemedText style={styles.ratingText}>{trip.riderRating.toFixed(1)}</ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Locations */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Locations</ThemedText>
          <View style={styles.locationRow}>
            <View style={styles.locationDot} />
            <View style={styles.locationInfo}>
              <ThemedText style={styles.locationLabel}>Start</ThemedText>
              <ThemedText style={styles.locationText}>
                {trip.startLocation?.placeName || trip.startLocation?.address || 'Unknown'}
              </ThemedText>
            </View>
          </View>
          {trip.pickupLocation && (
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, { backgroundColor: '#4CAF50' }]} />
              <View style={styles.locationInfo}>
                <ThemedText style={styles.locationLabel}>Your Pickup</ThemedText>
                <ThemedText style={styles.locationText}>
                  Custom location ({trip.pickupLocation.latitude.toFixed(4)}, {trip.pickupLocation.longitude.toFixed(4)})
                </ThemedText>
              </View>
            </View>
          )}
          {trip.dropoffLocation && (
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, { backgroundColor: '#FF9800' }]} />
              <View style={styles.locationInfo}>
                <ThemedText style={styles.locationLabel}>Your Dropoff</ThemedText>
                <ThemedText style={styles.locationText}>
                  Custom location ({trip.dropoffLocation.latitude.toFixed(4)}, {trip.dropoffLocation.longitude.toFixed(4)})
                </ThemedText>
              </View>
            </View>
          )}
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: '#D32F2F' }]} />
            <View style={styles.locationInfo}>
              <ThemedText style={styles.locationLabel}>End</ThemedText>
              <ThemedText style={styles.locationText}>
                {trip.endLocation?.placeName || trip.endLocation?.address || 'Unknown'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Message Button (Week 6) */}
        <TouchableOpacity 
          style={styles.messageButton} 
          onPress={handleMessagePress}
          disabled={messagingLoading}
        >
          {messagingLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
              <Text style={styles.messageButtonText}>Message</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Share Trip Button (Week 6) */}
        <TouchableOpacity 
          style={[styles.actionButton, styles.shareButton]} 
          onPress={handleShareTrip}
        >
          <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Share Trip</Text>
        </TouchableOpacity>

        {/* Start Trip Button - Only show for driver when status is confirmed */}
        {trip.driverId === user?.uid && trip.status === 'confirmed' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.startTripButton]} 
            onPress={handleStartTrip}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Start Trip</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Complete Trip Button - Only show for driver when status is in-progress */}
        {trip.driverId === user?.uid && trip.status === 'in-progress' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.completeTripButton]} 
            onPress={handleCompleteTrip}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Complete Trip</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Cancel Trip Button - Show for confirmed trips with >1 hour until departure */}
        {trip.status === 'confirmed' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.cancelTripButton]} 
            onPress={handleCancelTrip}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Cancel Trip</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Rider Confirm Completion Button - Show for riders when trip is completed */}
        {trip.riderId === user?.uid && trip.status === 'completed' && !trip.riderConfirmedCompletion && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.confirmTripButton]} 
            onPress={handleRiderConfirmCompletion}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Confirm Completion</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Cancel Trip Modal - Cross-platform alternative to Alert.prompt */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Cancel Trip?</ThemedText>
            <ThemedText style={styles.modalSubtitle}>
              Are you sure? Please provide a reason (optional):
            </ThemedText>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for cancellation..."
              placeholderTextColor="#999"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              maxLength={200}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Keep Trip</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmCancelTrip}
              >
                <Text style={styles.modalButtonConfirmText}>Cancel Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  backButtonText: {
    color: '#2774AE',
    fontWeight: '600',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  statusTimelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCE6F5',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  statusTimelineContainer: {
    gap: 12,
  },
  statusHistoryContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F6',
  },
  statusHistoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#687076',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2774AE',
    marginTop: 6,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  historyTime: {
    fontSize: 12,
    color: '#687076',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#687076',
  },
  error: {
    color: '#D32F2F',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCE6F5',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C9DEFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  mapContainer: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  customMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#2774AE',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#687076',
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F6',
    marginBottom: 8,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  participantRole: {
    fontSize: 12,
    color: '#687076',
    marginTop: 2,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F57C00',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2774AE',
    marginTop: 4,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#687076',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  messageButton: {
    backgroundColor: '#2774AE',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  startTripButton: {
    backgroundColor: '#1565C0',
  },
  completeTripButton: {
    backgroundColor: '#6A1B9A',
  },
  confirmTripButton: {
    backgroundColor: '#2E7D32',
  },
  cancelTripButton: {
    backgroundColor: '#D32F2F',
  },
  shareButton: {
    backgroundColor: '#00897B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#687076',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#F7F9FB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E3E7',
    padding: 12,
    fontSize: 14,
    color: '#1A1A1A',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F0F3F6',
  },
  modalButtonCancelText: {
    color: '#687076',
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    backgroundColor: '#D32F2F',
  },
  modalButtonConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
