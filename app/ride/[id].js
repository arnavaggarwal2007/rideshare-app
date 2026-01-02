import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ThemedText } from '../../components/themed-text';
import { getRideById } from '../../services/firebase/firestore';
import { fetchMyRequestsThunk } from '../../store/slices/requestsSlice';
import { deleteRideThunk } from '../../store/slices/ridesSlice';

export default function RideDetailsScreen() {
  const dispatch = useDispatch();
  const { id } = useLocalSearchParams();
  const user = useSelector(state => state.auth.user);
  const { myRequests } = useSelector(state => state.requests);
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        setLoading(true);
        const r = await getRideById(id);
        if (!r) {
          setError('Ride not found.');
        } else {
          setRide(r);
        }
      } catch (e) {
        setError(e?.message || 'Failed to load ride.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchRide();
  }, [id]);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchMyRequestsThunk(user.uid));
    }
  }, [dispatch, user?.uid]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Ride',
      'Are you sure you want to delete this ride? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteRideThunk(id)).unwrap();
              Alert.alert('Deleted', 'Ride deleted successfully.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/my-rides') }
              ]);
            } catch (e) {
              Alert.alert('Error', e || 'Failed to delete ride.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleRequestSeat = async () => {
    await Haptics.selectionAsync();
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Please sign in to request a seat.');
      return;
    }

    if (hasPendingRequest) {
      Alert.alert('Request already pending', 'You already have a pending request for this ride.');
      return;
    }

    router.push({ pathname: '/ride/request', params: { rideId: id } });
  };

  const getCity = (location) => {
    const name = location?.placeName || location?.address || '';
    if (!name) return '—';
    const parts = name.split(',');
    return parts[0].trim();
  };

  const getDisplayStatus = () => {
    if (!ride) return { text: '', color: '#2774AE' };
    const ts = ride?.departureTimestamp;
    const depDate = ts && typeof ts.toDate === 'function' ? ts.toDate() : ts ? new Date(ts) : null;
    const now = new Date();
    let display = ride?.status || 'active';
    let color = '#2774AE';
    if (display === 'cancelled') { display = 'Cancelled'; color = '#D32F2F'; }
    else if (depDate && now > depDate) { display = 'Completed'; color = '#888'; }
    else if (ride?.availableSeats !== undefined && ride?.totalSeats !== undefined && ride.availableSeats <= 0) { display = 'Full'; color = '#D32F2F'; }
    else if (display === 'active') { display = 'Active'; color = '#2774AE'; }
    return { text: display, color };
  };

  const isDriver = ride?.driverId === user?.uid;
  const hasPendingRequest = !isDriver && myRequests?.some((req) => req.rideId === id && req.status === 'pending');

  const getDetourDisplay = (r) => {
    if (!r) return '—';
    const unit = r.maxDetourUnit || (r.maxDetourValue ? 'miles' : 'none');
    const value = r.maxDetourValue ?? r.maxDetourMinutes ?? null;
    if (unit === 'none' || value === null || value === undefined) return 'No limit';
    return `${value} ${unit}`;
  };

  const polyline = (() => {
    if (!ride?.routePolyline) return [];
    try {
      const arr = JSON.parse(ride.routePolyline);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  })();

  const mapRegion = (() => {
    if (polyline.length) {
      const mid = Math.floor(polyline.length / 2);
      return { latitude: polyline[mid].latitude, longitude: polyline[mid].longitude, latitudeDelta: 0.2, longitudeDelta: 0.2 };
    }
    return { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 20, longitudeDelta: 20 };
  })();

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator size="large" color="#2774AE" style={{ marginTop: 40 }} />
        ) : error ? (
          <ThemedText style={styles.error}>{error}</ThemedText>
        ) : !ride ? (
          <ThemedText style={styles.error}>Ride not found.</ThemedText>
        ) : (
          <>
            {/* Header Card */}
            <View style={styles.headerCard}>
              <View style={styles.headerTopRow}>
                <ThemedText style={styles.cityText}>{getCity(ride.startLocation)}</ThemedText>
                <ThemedText style={styles.arrow}>→</ThemedText>
                <ThemedText style={styles.cityText}>{getCity(ride.endLocation)}</ThemedText>
              </View>
              <ThemedText style={styles.dateText}>{ride.departureDate} • {ride.departureTime}</ThemedText>
              <View style={styles.headerPlacesRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="location-outline" size={14} color="#3C4F5A" />
                  <ThemedText style={styles.placeText}>
                    {ride?.startLocation?.placeName || ride?.startLocation?.address || 'Start location'}
                  </ThemedText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="flag-outline" size={14} color="#3C4F5A" />
                  <ThemedText style={styles.placeText}>
                    {ride?.endLocation?.placeName || ride?.endLocation?.address || 'Destination'}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Status Badge */}
            <View style={styles.badgeRow}>
              {(() => {
                const s = getDisplayStatus();
                return (
                  <View style={[styles.badge, { backgroundColor: '#EAF2FF', borderColor: '#C9DEFF' }]}>
                    <Text style={styles.badgeText}>{s.text === 'Active' ? '📅 Upcoming' : s.text}</Text>
                  </View>
                );
              })()}
            </View>

            {/* Map */}
            <View style={styles.mapContainer}>
              <MapView style={styles.map} region={mapRegion}>
                {ride.startLocation && (
                  <Marker
                    coordinate={ride.startLocation.coordinates}
                    title={ride.startLocation.placeName || 'Start'}
                    accessibilityLabel="Start location"
                  />
                )}
                {ride.endLocation && (
                  <Marker
                    coordinate={ride.endLocation.coordinates}
                    title={ride.endLocation.placeName || 'Destination'}
                    pinColor="#D32F2F"
                    accessibilityLabel="Destination"
                  />
                )}
                {polyline.length > 0 && <Polyline coordinates={polyline} strokeColor="#2774AE" strokeWidth={4} />}
              </MapView>
            </View>

            {/* Trip Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.sectionRow}>
                <ThemedText style={styles.sectionLabel}>DISTANCE</ThemedText>
                <ThemedText style={styles.sectionValue}>{ride.distanceKm ? `${(ride.distanceKm * 0.621371).toFixed(1)} mi` : '—'}</ThemedText>
              </View>
              <View style={styles.sectionRow}>
                <ThemedText style={styles.sectionLabel}>DURATION</ThemedText>
                <ThemedText style={styles.sectionValue}>{ride.durationMinutes ? `${Math.floor(ride.durationMinutes / 60)}h ${ride.durationMinutes % 60}m` : '—'}</ThemedText>
              </View>
              <View style={styles.sectionRow}>
                <ThemedText style={styles.sectionLabel}>AVAILABLE SEATS</ThemedText>
                <ThemedText style={styles.sectionValue}>{ride.availableSeats}/{ride.totalSeats}</ThemedText>
              </View>
              <View style={styles.sectionRow}>
                <ThemedText style={styles.sectionLabel}>PRICE PER SEAT</ThemedText>
                <ThemedText style={styles.priceValue}>${Number(ride.pricePerSeat || 0).toFixed(2)}</ThemedText>
              </View>
              <View style={styles.sectionRow}>
                <ThemedText style={styles.sectionLabel}>MAX DETOUR</ThemedText>
                <ThemedText style={styles.sectionValue}>{getDetourDisplay(ride)}</ThemedText>
              </View>
            </View>

            {/* Driver Info Card */}
            <View style={styles.driverCard}>
              <View style={styles.driverHeader}>
                <Ionicons name="person-circle-outline" size={24} color="#2774AE" />
                <ThemedText style={styles.driverTitle}>Driver Information</ThemedText>
              </View>
              <View style={styles.sectionRow}>
                <ThemedText style={styles.sectionLabel}>NAME</ThemedText>
                <TouchableOpacity
                  onPress={async () => { await Haptics.selectionAsync(); if (ride?.driverId) router.push({ pathname: '/user/[id]', params: { id: ride.driverId } }); }}
                  accessibilityRole="link"
                  accessibilityLabel="View driver profile"
                >
                  <ThemedText style={[styles.sectionValue, { color: '#2774AE' }]}>
                    {ride.driverName || 'Driver'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.sectionRow}>
                <ThemedText style={styles.sectionLabel}>RATING</ThemedText>
                <ThemedText style={styles.sectionValue}>{ride.driverRating ? `⭐ ${ride.driverRating.toFixed(1)}` : 'Not rated'}</ThemedText>
              </View>
            </View>

            {/* Description */}
            {ride.description ? (
              <View style={styles.descriptionBox}>
                <ThemedText style={styles.descriptionLabel}>DESCRIPTION</ThemedText>
                <ThemedText style={styles.descriptionText}>{ride.description}</ThemedText>
              </View>
            ) : null}

            {/* Action Buttons */}
            {isDriver ? (
              <View style={styles.bottomButtons}>
                <TouchableOpacity style={styles.editBtn} onPress={async () => { await Haptics.selectionAsync(); router.push({ pathname: '/ride/edit', params: { id: ride.id } }); }} accessibilityRole="button" accessibilityLabel="Edit ride">
                  <Text style={styles.bottomBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={async () => { await Haptics.selectionAsync(); handleDelete(); }} accessibilityRole="button" accessibilityLabel="Delete ride">
                  <Text style={styles.bottomBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.requestBtn, hasPendingRequest && { backgroundColor: '#A0A9B0' }]}
                onPress={handleRequestSeat}
                accessibilityRole="button"
                accessibilityLabel="Request a seat"
                disabled={hasPendingRequest}
              >
                <Text style={styles.bottomBtnText}>{hasPendingRequest ? 'Request Pending' : 'Request Seat'}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 0, marginBottom: 8 },
  backButtonText: { color: '#2774AE', fontWeight: '600', fontSize: 16 },
  headerCard: {
    backgroundColor: '#EAF2FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cityText: { color: '#1A1A1A', fontWeight: '700', fontSize: 16 },
  arrow: { color: '#2774AE', fontWeight: '700', fontSize: 18 },
  dateText: { color: '#687076', fontSize: 13, marginTop: 4 },
  headerPlacesRow: { marginTop: 8, gap: 6 },
  placeText: { color: '#3C4F5A', fontSize: 12 },
  badgeRow: { flexDirection: 'row', marginBottom: 12 },
  badge: { borderRadius: 999, borderWidth: 1, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { color: '#2774AE', fontWeight: '600', fontSize: 12 },
  mapContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C9DEFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  map: { width: '100%', height: 220, borderRadius: 8 },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C9DEFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C9DEFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  driverHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  driverTitle: { fontSize: 15, fontWeight: '700', color: '#2774AE' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { color: '#687076', fontSize: 12, letterSpacing: 0.5, fontWeight: '700' },
  sectionValue: { color: '#1A1A1A', fontSize: 15, fontWeight: '600' },
  priceValue: { color: '#2774AE', fontSize: 18, fontWeight: '800' },
  descriptionBox: { backgroundColor: '#F4F6F8', borderRadius: 8, padding: 12, marginBottom: 12 },
  descriptionLabel: { color: '#8A949B', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  descriptionText: { color: '#333', fontSize: 14, lineHeight: 20 },
  bottomButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editBtn: { flex: 1, backgroundColor: '#2774AE', borderRadius: 8, alignItems: 'center', paddingVertical: 14 },
  deleteBtn: { flex: 1, backgroundColor: '#D32F2F', borderRadius: 8, alignItems: 'center', paddingVertical: 14 },
  requestBtn: { backgroundColor: '#2774AE', borderRadius: 8, alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  bottomBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  error: { color: '#D32F2F', fontSize: 14, textAlign: 'center', marginTop: 40 },
});
