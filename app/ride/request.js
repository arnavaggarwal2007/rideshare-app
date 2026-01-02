import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import LocationMapPicker from '../../components/LocationMapPicker';
import { ThemedText } from '../../components/themed-text';
import { getRideById } from '../../services/firebase/firestore';
import { createRequestThunk, fetchMyRequestsThunk } from '../../store/slices/requestsSlice';

export default function RequestSeatScreen() {
  const dispatch = useDispatch();
  const { rideId } = useLocalSearchParams();
  const user = useSelector((state) => state.auth.user);
  const userProfile = useSelector((state) => state.auth.userProfile);
  const { myRequests, submitting } = useSelector((state) => state.requests);

  const [ride, setRide] = useState(null);
  const [loadingRide, setLoadingRide] = useState(true);
  const [error, setError] = useState(null);
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [message, setMessage] = useState('');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [locationsValid, setLocationsValid] = useState(false);

  const getDistanceInMiles = (lat1, lon1, lat2, lon2) => {
    const R = 3959;
    const toRad = (deg) => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchMyRequestsThunk(user.uid));
    }
  }, [dispatch, user?.uid]);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        setLoadingRide(true);
        const rideData = await getRideById(rideId);
        if (!rideData) {
          setError('Ride not found.');
        } else {
          setRide(rideData);
        }
      } catch (e) {
        setError(e?.message || 'Failed to load ride.');
      } finally {
        setLoadingRide(false);
      }
    };
    if (rideId) fetchRide();
  }, [rideId]);

  const availableSeats = Math.max(ride?.availableSeats || 0, 0);
  const maxSeatSelectable = availableSeats ? Math.min(availableSeats, 7) : 7;
  const detourUnit = ride?.maxDetourUnit || (ride?.maxDetourValue ? 'miles' : ride?.maxDetourMinutes ? 'minutes' : 'none');
  const detourValue = detourUnit === 'miles'
    ? ride?.maxDetourValue
    : detourUnit === 'minutes'
      ? ride?.maxDetourMinutes
      : null;

  // Parse ride route polyline
  const rideRoute = useMemo(() => {
    if (!ride?.routePolyline) return [];
    try {
      return JSON.parse(ride.routePolyline);
    } catch (e) {
      console.error('Failed to parse route polyline:', e);
      return [];
    }
  }, [ride?.routePolyline]);

  const hasPendingRequest = useMemo(() => {
    if (!rideId || !myRequests?.length) return false;
    return myRequests.some((req) => req.rideId === rideId && req.status === 'pending');
  }, [myRequests, rideId]);

  const incrementSeats = async () => {
    await Haptics.selectionAsync();
    setSeatsRequested((prev) => Math.min(prev + 1, maxSeatSelectable));
  };

  const decrementSeats = async () => {
    await Haptics.selectionAsync();
    setSeatsRequested((prev) => Math.max(prev - 1, 1));
  };

  const handleLocationsSelected = (pickup, dropoff, isValid) => {
    setPickupLocation(pickup);
    setDropoffLocation(dropoff);
    setLocationsValid(isValid);
  };

  const handleSubmit = async () => {
    if (!user?.uid) {
      Alert.alert('Sign in required', 'You must be signed in to request a seat.');
      return;
    }
    if (!ride) {
      Alert.alert('Ride unavailable', 'Unable to submit request for this ride.');
      return;
    }
    if (!pickupLocation || !dropoffLocation) {
      Alert.alert('Select locations', 'Please select both pickup and dropoff locations on the map.');
      return;
    }

    // Defensive detour check on submit
    if (detourUnit !== 'none' && detourValue !== null && ride?.startLocation?.coordinates && ride?.endLocation?.coordinates) {
      const pickupDetour = getDistanceInMiles(
        ride.startLocation.coordinates.latitude,
        ride.startLocation.coordinates.longitude,
        pickupLocation.latitude,
        pickupLocation.longitude
      );
      const dropoffDetour = getDistanceInMiles(
        dropoffLocation.latitude,
        dropoffLocation.longitude,
        ride.endLocation.coordinates.latitude,
        ride.endLocation.coordinates.longitude
      );
      if (pickupDetour > detourValue || dropoffDetour > detourValue) {
        Alert.alert('Detour exceeded', 'Your selected pickup or dropoff exceeds the driver\'s maximum detour allowance.');
        return;
      }
    }
    if (hasPendingRequest) {
      Alert.alert('Already requested', 'You already have a pending request for this ride.');
      return;
    }
    if (seatsRequested < 1) {
      Alert.alert('Invalid seats', 'Please request at least one seat.');
      return;
    }
    if (availableSeats <= 0) {
      Alert.alert('No seats available', 'This ride currently has no seats available.');
      return;
    }
    if (seatsRequested > availableSeats) {
      Alert.alert('Not enough seats', 'Requested seats exceed available seats.');
      return;
    }
    if (message.trim().length > 300) {
      Alert.alert('Message too long', 'Please keep the message under 300 characters.');
      return;
    }

    try {
      await Haptics.selectionAsync();
      await dispatch(
        createRequestThunk({
          rideId,
          riderId: user.uid,
          riderProfile: userProfile || {},
          rideData: {
            driverId: ride.driverId,
            driverName: ride.driverName,
            startLocation: ride.startLocation,
            endLocation: ride.endLocation,
          },
          seatsRequested,
          message: message.trim() || null,
          pickupLocation,
          dropoffLocation,
        })
      ).unwrap();

      Alert.alert('Request sent', 'Your seat request has been sent to the driver.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e || 'Failed to send request.');
    }
  };

  const renderRideSummary = () => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <ThemedText style={styles.label}>From</ThemedText>
        <ThemedText style={[styles.value, styles.valueWrap]}>{ride?.startLocation?.placeName || ride?.startLocation?.address || '—'}</ThemedText>
      </View>
      <View style={styles.rowBetween}>
        <ThemedText style={styles.label}>To</ThemedText>
        <ThemedText style={[styles.value, styles.valueWrap]}>{ride?.endLocation?.placeName || ride?.endLocation?.address || '—'}</ThemedText>
      </View>
      <View style={styles.rowBetween}>
        <ThemedText style={styles.label}>Departure</ThemedText>
        <ThemedText style={styles.value}>{ride?.departureDate} • {ride?.departureTime}</ThemedText>
      </View>
      <View style={styles.rowBetween}>
        <ThemedText style={styles.label}>Price</ThemedText>
        <ThemedText style={styles.value}>${Number(ride?.pricePerSeat || 0).toFixed(2)} / seat</ThemedText>
      </View>
      <View style={styles.rowBetween}>
        <ThemedText style={styles.label}>Seats left</ThemedText>
        <ThemedText style={styles.value}>{availableSeats}</ThemedText>
      </View>
    </View>
  );

  const renderDriver = () => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="person-circle-outline" size={28} color="#2774AE" />
        <View>
          <ThemedText style={styles.driverName}>{ride?.driverName || 'Driver'}</ThemedText>
          <ThemedText style={styles.driverMeta}>Rating: {ride?.driverRating ? ride.driverRating.toFixed(1) : 'N/A'}</ThemedText>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </TouchableOpacity>

        <ThemedText style={styles.title}>Request a Seat</ThemedText>
        <ThemedText style={styles.subtitle}>Send a seat request to the driver with optional notes.</ThemedText>

        {loadingRide ? (
          <ActivityIndicator size="large" color="#2774AE" style={{ marginTop: 24 }} />
        ) : error ? (
          <ThemedText style={styles.error}>{error}</ThemedText>
        ) : !ride ? (
          <ThemedText style={styles.error}>Ride not found.</ThemedText>
        ) : (
          <View style={{ gap: 12 }}>
            {renderRideSummary()}
            {renderDriver()}

            <View style={styles.card}>
              <ThemedText style={styles.sectionTitle}>Select Pickup & Dropoff</ThemedText>
              <ThemedText style={styles.helperText}>
                Choose your pickup and dropoff locations on the map
              </ThemedText>
              <LocationMapPicker
                rideRoute={rideRoute}
                startLocation={ride.startLocation}
                endLocation={ride.endLocation}
                maxDetourUnit={detourUnit}
                maxDetourValue={detourUnit === 'none' ? null : detourValue}
                onLocationsSelected={handleLocationsSelected}
              />
            </View>

            <View style={styles.card}>
              <ThemedText style={styles.sectionTitle}>Seats Requested</ThemedText>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[styles.stepperBtn, seatsRequested <= 1 && styles.stepperBtnDisabled]}
                  onPress={decrementSeats}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease seats"
                  disabled={seatsRequested <= 1}
                >
                  <Text style={[styles.stepperText, seatsRequested <= 1 && styles.stepperTextDisabled]}>−</Text>
                </TouchableOpacity>
                <ThemedText style={styles.seatCount}>{seatsRequested}</ThemedText>
                <TouchableOpacity
                  style={[styles.stepperBtn, seatsRequested >= maxSeatSelectable && styles.stepperBtnDisabled]}
                  onPress={incrementSeats}
                  accessibilityRole="button"
                  accessibilityLabel="Increase seats"
                  disabled={seatsRequested >= maxSeatSelectable}
                >
                  <Text style={[styles.stepperText, seatsRequested >= maxSeatSelectable && styles.stepperTextDisabled]}>+</Text>
                </TouchableOpacity>
              </View>
              <ThemedText style={styles.helperText}>Max {maxSeatSelectable} seats • {availableSeats} left</ThemedText>
            </View>

            <View style={styles.card}>
              <ThemedText style={styles.sectionTitle}>Message to Driver (optional)</ThemedText>
              <TextInput
                style={styles.textArea}
                multiline
                maxLength={300}
                value={message}
                onChangeText={setMessage}
                placeholder="Share pickup details or preferences"
                placeholderTextColor="#A0A9B0"
              />
              <ThemedText style={styles.helperText}>{message.length}/300</ThemedText>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (hasPendingRequest || submitting || !locationsValid) && { backgroundColor: '#A0A9B0' }]}
              onPress={handleSubmit}
              disabled={hasPendingRequest || submitting || !locationsValid}
              accessibilityRole="button"
              accessibilityLabel="Send seat request"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>
                  {hasPendingRequest ? 'Request Pending' : !locationsValid ? 'Select Valid Locations' : 'Send Request'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 0, marginBottom: 6 },
  backButtonText: { color: '#2774AE', fontWeight: '600', fontSize: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginTop: 4 },
  subtitle: { color: '#58626A', fontSize: 14, marginBottom: 12 },
  error: { color: '#D32F2F', fontSize: 14, marginTop: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCE6F5',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12, flexWrap: 'wrap' },
  label: { color: '#687076', fontSize: 12, fontWeight: '700', marginTop: 2 },
  value: { color: '#0F172A', fontSize: 15, fontWeight: '600', textAlign: 'right', marginLeft: 12 },
  valueWrap: { flex: 1, flexWrap: 'wrap' },
  driverName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  driverMeta: { fontSize: 12, color: '#687076', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 2 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9DEFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2FF',
  },
  stepperBtnDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  stepperText: { fontSize: 22, fontWeight: '800', color: '#2774AE' },
  stepperTextDisabled: { color: '#9CA3AF' },
  seatCount: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', minWidth: 28, textAlign: 'center' },
  helperText: { color: '#6B7280', fontSize: 12, marginTop: 8, textAlign: 'center' },
  textArea: {
    marginTop: 4,
    minHeight: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE6F5',
    padding: 12,
    textAlignVertical: 'top',
    color: '#1A1A1A',
    backgroundColor: '#F9FBFF',
  },
  submitBtn: {
    backgroundColor: '#2774AE',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
