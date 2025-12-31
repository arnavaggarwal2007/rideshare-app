import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/themed-text';
import { getTripById } from '../../services/firebase/firestore';

export default function TripDetailsScreen() {
  const { id: tripId } = useLocalSearchParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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

    if (tripId) {
      fetchTrip();
    }
  }, [tripId]);

  // Parse route polyline
  const rideRoute = React.useMemo(() => {
    if (!trip?.routePolyline) return [];
    try {
      return JSON.parse(trip.routePolyline);
    } catch (e) {
      console.error('Failed to parse route polyline:', e);
      return [];
    }
  }, [trip?.routePolyline]);

  const handleMessagePress = () => {
    Alert.alert(
      'Messaging Coming Soon',
      'In-app messaging will be available in Week 6. For now, coordinate via phone or email.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2774AE" />
          <ThemedText style={styles.loadingText}>Loading trip details...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
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
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </TouchableOpacity>

        <ThemedText style={styles.title}>Trip Details</ThemedText>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
          <ThemedText style={styles.statusText}>Confirmed</ThemedText>
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
              {/* Original ride route */}
              {rideRoute.length > 0 && (
                <Polyline coordinates={rideRoute} strokeColor="#2774AE" strokeWidth={4} />
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
              {trip.departureDate} • {trip.departureTime}
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color="#687076" />
            <ThemedText style={styles.label}>Seats</ThemedText>
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

        {/* Message Button (Week 6 Placeholder) */}
        <TouchableOpacity style={styles.messageButton} onPress={handleMessagePress}>
          <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
          <Text style={styles.messageButtonText}>Message Participants</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FB',
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
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 6,
  },
  backButtonText: {
    color: '#2774AE',
    fontWeight: '600',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 4,
    marginBottom: 8,
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
});
