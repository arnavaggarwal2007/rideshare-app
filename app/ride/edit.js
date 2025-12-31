import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import DateTimeInput from '../../components/DateTimeInput';
import LocationSearchInput from '../../components/LocationSearchInput';
import { ThemedText } from '../../components/themed-text';
import { useThemeColor } from '../../hooks/use-theme-color';
import { getRideById } from '../../services/firebase/firestore';
import { getDirections } from '../../services/maps/directions';
import { updateRideThunk } from '../../store/slices/ridesSlice';

export default function EditRideScreen() {
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const placeholderColor = useThemeColor({}, 'icon');
  const mapRef = React.useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ride, setRide] = useState(null);

  // Editable fields
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [maxDetourMiles, setMaxDetourMiles] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Map/Route state
  const [routePolyline, setRoutePolyline] = useState([]);
  const [distanceKm, setDistanceKm] = useState(null);
  const [durationMinutes, setDurationMinutes] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        setLoading(true);
        const r = await getRideById(id);
        if (!r) {
          setError('Ride not found.');
        } else {
          setRide(r);
          setStartLocation(r.startLocation);
          setEndLocation(r.endLocation);
          setDepartureDate(r.departureDate || '');
          setDepartureTime(r.departureTime || '');
          setTotalSeats(String(r.totalSeats ?? ''));
          setPricePerSeat(String(r.pricePerSeat ?? ''));
          setMaxDetourMiles(String(r.maxDetourUnit === 'miles' ? (r.maxDetourValue ?? r.maxDetourMiles ?? '') : ''));
          setDescription(r.description || '');
          // Load existing route
          if (r.routePolyline) {
            try {
              const polyArr = JSON.parse(r.routePolyline);
              if (Array.isArray(polyArr)) setRoutePolyline(polyArr);
            } catch {}
          }
          if (r.distanceKm) setDistanceKm(r.distanceKm);
          if (r.durationMinutes) setDurationMinutes(r.durationMinutes);
        }
      } catch (e) {
        setError(e?.message || 'Failed to load ride.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchRide();
  }, [id]);

  const handlePreviewRoute = async () => {
    if (!startLocation || !endLocation) {
      Alert.alert('Missing Location', 'Please set both start and end locations.');
      return;
    }
    await Haptics.selectionAsync();
    setIsLoadingRoute(true);
    try {
      const route = await getDirections(startLocation.coordinates, endLocation.coordinates);
      if (route && route.polyline) {
        setRoutePolyline(route.polyline);
        setDistanceKm(route.distance / 1000);
        setDurationMinutes(Math.round(route.duration / 60));
        // Fit map to show entire route
        if (mapRef.current && route.polyline.length) {
          setTimeout(() => {
            mapRef.current.fitToCoordinates(route.polyline, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            });
          }, 100);
        }
        Alert.alert('Route Loaded', `Distance: ${((route.distance / 1000) * 0.621371).toFixed(1)} mi, Duration: ${Math.floor(route.duration / 3600)}h ${Math.floor((route.duration % 3600) / 60)}m`);
      } else {
        Alert.alert('Route Error', 'Could not calculate route.');
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to load route.');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Form validation
  const validateDateFormat = (dateStr) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const validateTimeFormat = (timeStr) => /^\d{2}:\d{2}$/.test(timeStr);
  const isValidDate = (dateStr) => {
    if (!validateDateFormat(dateStr)) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const date = new Date(`${y}-${m}-${d}`);
    return date instanceof Date && !isNaN(date);
  };
  const isValidTime = (timeStr) => {
    if (!validateTimeFormat(timeStr)) return false;
    const [h, m] = timeStr.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  const handleSave = async () => {
    setError(null);
    if (!startLocation || !endLocation) { setError('Please set both start and end locations.'); return; }
    if (!departureDate || !isValidDate(departureDate)) { setError('Invalid date. Use YYYY-MM-DD.'); return; }
    if (!departureTime || !isValidTime(departureTime)) { setError('Invalid time. Use HH:mm.'); return; }
    if (!totalSeats || isNaN(Number(totalSeats)) || Number(totalSeats) < 1) { setError('Enter a valid number of seats.'); return; }
    if (!pricePerSeat || isNaN(Number(pricePerSeat)) || Number(pricePerSeat) < 0) { setError('Enter a valid price per seat.'); return; }
    if (maxDetourMiles && (isNaN(Number(maxDetourMiles)) || Number(maxDetourMiles) < 0 || Number(maxDetourMiles) > 100)) {
      setError('Max detour must be 0-100 miles.');
      return;
    }
    setIsSubmitting(true);
    try {
      const detourMilesNum = maxDetourMiles ? Number(maxDetourMiles) : null;
      const detourUnit = detourMilesNum !== null && !isNaN(detourMilesNum)
        ? 'miles'
        : (ride?.maxDetourUnit === 'minutes' ? 'minutes' : 'none');
      const detourValue = detourUnit === 'miles'
        ? detourMilesNum
        : detourUnit === 'minutes'
          ? ride?.maxDetourMinutes ?? null
          : null;

      const updates = {
        startLocation,
        endLocation,
        departureDate,
        departureTime,
        departureTimestamp: new Date(`${departureDate}T${departureTime}`),
        totalSeats: Number(totalSeats),
        availableSeats: Number(totalSeats), // Reset available seats when total changes
        pricePerSeat: Number(pricePerSeat),
        maxDetourUnit: detourUnit,
        maxDetourValue: detourValue,
        maxDetourMinutes: detourUnit === 'minutes' ? (ride?.maxDetourMinutes ?? 0) : null,
        maxDetourMiles: detourUnit === 'miles' ? detourMilesNum : (ride?.maxDetourMiles ?? null),
        description,
        routePolyline: routePolyline.length ? JSON.stringify(routePolyline) : '',
        distanceKm: distanceKm || 0,
        durationMinutes: durationMinutes || 0,
      };
      await dispatch(updateRideThunk({ rideId: id, updates })).unwrap();
      Alert.alert('Saved', 'Ride updated successfully.', [{ text: 'OK', onPress: () => router.replace('/(tabs)/my-rides') }]);
    } catch (e) {
      setError(typeof e === 'string' ? e : e?.message || 'Failed to update ride.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mapRegion = (() => {
    if (routePolyline.length) {
      const mid = Math.floor(routePolyline.length / 2);
      return { latitude: routePolyline[mid].latitude, longitude: routePolyline[mid].longitude, latitudeDelta: 0.2, longitudeDelta: 0.2 };
    }
    if (startLocation) return { ...startLocation.coordinates, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    return { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 20, longitudeDelta: 20 };
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 48 : 0}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backButtonText}>← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Edit Ride</ThemedText>
          <ThemedText style={styles.subtitle}>Update your ride details and route</ThemedText>
          {loading ? (
            <ActivityIndicator size="large" color="#2774AE" style={{ marginTop: 40 }} />
          ) : !ride ? (
            <ThemedText style={styles.error}>Ride not found.</ThemedText>
          ) : (
            <View>
              {/* Map Preview */}
              <View style={styles.mapContainer}>
                <MapView ref={mapRef} style={styles.map} region={mapRegion}>
                  {startLocation && <Marker coordinate={startLocation.coordinates} title="Start" />}
                  {endLocation && <Marker coordinate={endLocation.coordinates} title="Destination" pinColor="#D32F2F" />}
                  {routePolyline.length > 0 && <Polyline coordinates={routePolyline} strokeColor="#2774AE" strokeWidth={4} />}
                </MapView>
                {routePolyline.length === 0 && (
                  <View style={styles.mapOverlay}>
                    <Text style={styles.mapOverlayText}>🗺️</Text>
                    <Text style={styles.mapOverlaySubtext}>Preview route below</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.previewButton} onPress={handlePreviewRoute} disabled={isLoadingRoute}>
                  {isLoadingRoute ? <ActivityIndicator color="#2774AE" /> : (
                    <>
                      <Ionicons name="navigate-outline" size={18} color="#2774AE" />
                      <Text style={styles.previewButtonText}>Preview Route</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>
                {/* Location Inputs */}
                <LocationSearchInput
                  label="Start Location"
                  placeholder="Enter start address"
                  location={startLocation}
                  onLocationSelect={setStartLocation}
                  iconColor="#2774AE"
                  required
                  placeholderColor={placeholderColor}
                />

                <LocationSearchInput
                  label="Destination"
                  placeholder="Enter destination"
                  location={endLocation}
                  onLocationSelect={setEndLocation}
                  iconColor="#D32F2F"
                  required
                  placeholderColor={placeholderColor}
                />

                <DateTimeInput
                  type="date"
                  label="Departure Date"
                  value={departureDate}
                  onChange={setDepartureDate}
                  required
                  placeholderColor={placeholderColor}
                />

                <DateTimeInput
                  type="time"
                  label="Departure Time"
                  value={departureTime}
                  onChange={setDepartureTime}
                  required
                  placeholderColor={placeholderColor}
                />

                <View style={styles.labelRow}>
                  <Ionicons name="people-outline" size={16} color="#2774AE" style={{ marginRight: 4 }} />
                  <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Total Seats</ThemedText>
                  <ThemedText style={styles.required}>*</ThemedText>
                </View>
                <TextInput style={styles.input} placeholder="Number of seats" value={totalSeats} onChangeText={setTotalSeats} keyboardType="numeric" placeholderTextColor={placeholderColor} />

                <View style={styles.labelRow}>
                  <Ionicons name="cash-outline" size={16} color="#2774AE" style={{ marginRight: 4 }} />
                  <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Price Per Seat</ThemedText>
                  <ThemedText style={styles.required}>*</ThemedText>
                </View>
                <View style={styles.inputGroup}>
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="0.00" value={pricePerSeat} onChangeText={setPricePerSeat} keyboardType="decimal-pad" placeholderTextColor={placeholderColor} />
                  <View style={styles.addon}><Text style={styles.addonText}>USD</Text></View>
                </View>

                <View style={styles.labelRow}>
                  <Ionicons name="navigate-circle-outline" size={16} color="#2774AE" style={{ marginRight: 4 }} />
                  <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Max Detour (miles)</ThemedText>
                  <ThemedText style={styles.optionalLabel}>(Optional)</ThemedText>
                </View>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="0-100"
                    value={maxDetourMiles}
                    onChangeText={setMaxDetourMiles}
                    keyboardType="number-pad"
                    placeholderTextColor={placeholderColor}
                  />
                  <View style={styles.addon}><Text style={styles.addonText}>mi</Text></View>
                </View>
                {ride?.maxDetourUnit === 'minutes' ? (
                  <ThemedText style={[styles.helper, { marginTop: 4 }]}>
                    Existing minutes-based detour is preserved but editing minutes is deferred until Week 7+.
                  </ThemedText>
                ) : null}

                <View style={styles.labelRow}>
                  <Ionicons name="chatbubble-outline" size={16} color="#2774AE" style={{ marginRight: 4 }} />
                  <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Description</ThemedText>
                  <ThemedText style={styles.optionalLabel}>(Optional)</ThemedText>
                </View>
                <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Add a note about your ride..." value={description} onChangeText={setDescription} multiline placeholderTextColor={placeholderColor} />

                <TouchableOpacity style={[styles.saveButton, isSubmitting && styles.buttonDisabled]} onPress={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                </TouchableOpacity>
                {error && <ThemedText style={styles.errorInline}>{error}</ThemedText>}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 0, marginBottom: 4 },
  backButtonText: { color: '#2774AE', fontWeight: '600', fontSize: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#2774AE', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#687076', marginBottom: 16, textAlign: 'center' },
  mapContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C9DEFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  map: { width: '100%', height: 220, borderRadius: 8 },
  mapOverlay: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 50, backgroundColor: 'rgba(247, 249, 251, 0.9)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  mapOverlayText: { fontSize: 48, marginBottom: 4 },
  mapOverlaySubtext: { fontSize: 14, color: '#687076', fontWeight: '500' },
  previewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', paddingVertical: 10, marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: '#2774AE', gap: 6 },
  previewButtonText: { color: '#2774AE', fontWeight: '700', fontSize: 14 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C9DEFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6 },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  input: { backgroundColor: '#F7F9FB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0', color: '#333', marginBottom: 8 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  addon: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#EAF2FF', borderRadius: 8, borderWidth: 1, borderColor: '#C9DEFF' },
  addonText: { color: '#2774AE', fontSize: 14, fontWeight: '600' },
  required: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16, marginLeft: 6 },
  optionalLabel: { color: '#687076', fontSize: 12, marginLeft: 6 },
  saveButton: { backgroundColor: '#2774AE', borderRadius: 8, paddingVertical: 14, marginTop: 12, marginBottom: 6, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buttonDisabled: { backgroundColor: '#B0B0B0' },
  error: { color: '#D32F2F', fontSize: 14, textAlign: 'center', marginTop: 40 },
  errorInline: { color: '#D32F2F', fontSize: 13, textAlign: 'center', marginTop: 8, fontWeight: '500' },
  helper: { color: '#687076', fontSize: 12, lineHeight: 16 },
});
