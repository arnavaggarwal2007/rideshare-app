import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import DateTimeInput from '../../components/DateTimeInput';
import LocationSearchInput from '../../components/LocationSearchInput';
import { ThemedText } from '../../components/themed-text';
import { useThemeColor } from '../../hooks/use-theme-color';
import { getDirections } from '../../services/maps/directions';
import { createRideThunk } from '../../store/slices/ridesSlice';

export default function CreateRideScreen() {
  // Redux user/profile and dispatch
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const userProfile = useSelector(state => state.auth.userProfile || {});
  const mapRef = React.useRef(null);
  const placeholderColor = useThemeColor({}, 'icon');
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Route preview state
  const [isRouting, setIsRouting] = useState(false);
  const [routingError, setRoutingError] = useState(null);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null); // { distance, duration }

  // Map region for preview
  const [mapRegion, setMapRegion] = useState({
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 20,
    longitudeDelta: 20,
  });
  // Form state
  const [startLocation, setStartLocation] = useState(null); // { address, coordinates, placeName }
  const [endLocation, setEndLocation] = useState(null);
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [totalSeats, setTotalSeats] = useState('1');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [maxDetourUnit, setMaxDetourUnit] = useState('none'); // 'miles', 'minutes', 'none'
  const [maxDetourValue, setMaxDetourValue] = useState('');
  const [description, setDescription] = useState('');

  // Form validation
  const validateDateFormat = (dateStr) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const validateTimeFormat = (timeStr) => /^\d{2}:\d{2}$/.test(timeStr);
  
  const isValidDate = (dateStr) => {
    if (!validateDateFormat(dateStr)) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    const date = new Date(`${year}-${month}-${day}`);
    return date instanceof Date && !isNaN(date) && date >= new Date(new Date().setHours(0, 0, 0, 0));
  };
  
  const isValidTime = (timeStr) => {
    if (!validateTimeFormat(timeStr)) return false;
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  };

  const validateForm = () => {
    if (!startLocation || !endLocation) return 'Select start and destination.';
    if (!departureDate) return 'Enter departure date.';
    if (!isValidDate(departureDate)) return 'Invalid date. Use YYYY-MM-DD and enter a future date.';
    if (!departureTime) return 'Enter departure time.';
    if (!isValidTime(departureTime)) return 'Invalid time. Use HH:mm (00:00-23:59).';
    if (!totalSeats || isNaN(Number(totalSeats)) || Number(totalSeats) < 1) return 'Enter a valid number of seats.';
    if (!pricePerSeat || isNaN(Number(pricePerSeat)) || Number(pricePerSeat) < 0) return 'Enter a valid price per seat.';
    if (!routePolyline.length || !routeInfo) return 'Preview the route before posting.';
    // Validate max detour if selected
    if (maxDetourUnit !== 'none') {
      if (!maxDetourValue || isNaN(Number(maxDetourValue))) return 'Enter a valid detour value.';
      const val = Number(maxDetourValue);
      if (val < 0 || val > 100) return 'Max detour must be 0-100 miles.';
    }
    return null;
  };

  // Submit handler using Redux thunk
  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitSuccess(false);
    const error = validateForm();
    if (error) {
      setSubmitError(error);
      return;
    }
    setIsSubmitting(true);
    try {
      const detourUnit = maxDetourUnit || 'none';
      const detourValue = detourUnit === 'none' ? null : Number(maxDetourValue);
      const detourMinutes = null; // minutes deferred
      const detourMiles = detourUnit === 'miles' ? detourValue : null;
      const rideData = {
        startLocation,
        endLocation,
        routePolyline: JSON.stringify(routePolyline), // Store as string for Firestore
        distanceKm: routeInfo.distance / 1000,
        durationMinutes: Math.round(routeInfo.duration / 60),
        departureDate,
        departureTime,
        totalSeats: Number(totalSeats),
        pricePerSeat: Number(pricePerSeat),
        maxDetourUnit: detourUnit,
        maxDetourValue: detourValue,
        maxDetourMinutes: detourMinutes,
        maxDetourMiles: detourMiles,
        description,
      };
      await dispatch(createRideThunk({ rideData, userId: user?.uid, userProfile })).unwrap();
      setSubmitSuccess(true);
      setTimeout(() => {
        router.replace('/(tabs)/my-rides');
      }, 1200);
    } catch (e) {
      setSubmitError(e || 'Failed to create ride.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Route preview handler
  const handleRoutePreview = async () => {
    setRoutingError(null);
    setRouteInfo(null);
    setRoutePolyline([]);
    setIsRouting(true);
    try {
      if (!startLocation || !endLocation) {
        setRoutingError('Select both start and destination.');
        return;
      }
      const directions = await getDirections(startLocation.coordinates, endLocation.coordinates);
      setRoutePolyline(directions.polyline || []);
      setRouteInfo({ distance: directions.distance, duration: directions.duration });
      // Fit map to show entire route
      if (mapRef.current && directions.polyline && directions.polyline.length) {
        setTimeout(() => {
          mapRef.current.fitToCoordinates(directions.polyline, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }, 100);
      }
    } catch (e) {
      setRoutingError(e?.message || 'Routing failed.');
    } finally {
      setIsRouting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : 'height'}
        style={{ flex: 1, backgroundColor: '#F7F9FB' }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 48 : 0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Create a New Ride</ThemedText>
        <ThemedText style={styles.subtitle}>Share your journey and earn money by offering rides</ThemedText>
        
        {/* Map Preview Container */}
        <View style={styles.mapContainer}>
          <View style={{ width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: '#EAF2FF' }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
            >
            {startLocation && (
              <Marker
                coordinate={startLocation.coordinates}
                title={startLocation.placeName || 'Start'}
              />
            )}
            {endLocation && (
              <Marker
                coordinate={endLocation.coordinates}
                title={endLocation.placeName || 'Destination'}
                pinColor="#D32F2F"
              />
            )}
            {routePolyline.length > 0 && (
              <Polyline
                coordinates={routePolyline}
                strokeColor="#2774AE"
                strokeWidth={4}
              />
            )}
          </MapView>
          {routePolyline.length === 0 && (
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>🗺️</Text>
              <Text style={styles.mapOverlayText}>Map will display route here</Text>
            </View>
          )}
        </View>
        
        {/* Route Preview Button */}
        <TouchableOpacity
          style={[styles.previewButton, (!startLocation || !endLocation) && styles.buttonDisabled]}
          onPress={async () => { await Haptics.selectionAsync(); handleRoutePreview(); }}
          disabled={isRouting || !startLocation || !endLocation}
        >
          {isRouting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.geocodeButtonText}>Preview Route</Text>
          )}
        </TouchableOpacity>
        {routingError && <ThemedText style={styles.error}>{routingError}</ThemedText>}
        {routeInfo && (
          <ThemedText style={styles.routeInfo}>
            Distance: {(routeInfo.distance / 1000 * 0.621371).toFixed(2)} mi • Duration: {Math.floor(routeInfo.duration / 3600)}h {Math.floor((routeInfo.duration % 3600) / 60)}m
          </ThemedText>
        )}
      </View>

      {/* Form Card Wrapper */}
      <View style={styles.formCard}>
      {/* Start Location */}
      <LocationSearchInput
        label="Start Location"
        placeholder="e.g., San Francisco"
        location={startLocation}
        onLocationSelect={setStartLocation}
        iconColor="#2774AE"
        required
        placeholderColor={placeholderColor}
      />

      {/* End Location */}
      <LocationSearchInput
        label="Destination"
        placeholder="e.g., Los Angeles"
        location={endLocation}
        onLocationSelect={setEndLocation}
        iconColor="#D32F2F"
        required
        placeholderColor={placeholderColor}
      />

      {/* Departure Date */}
      <DateTimeInput
        type="date"
        label="Departure Date"
        value={departureDate}
        onChange={setDepartureDate}
        required
        placeholderColor={placeholderColor}
      />

      {/* Departure Time */}
      <DateTimeInput
        type="time"
        label="Departure Time"
        value={departureTime}
        onChange={setDepartureTime}
        required
        placeholderColor={placeholderColor}
      />

      {/* Total Seats */}
      <View style={styles.labelRow}>
        <View style={styles.labelIconRow}><Ionicons name="people-outline" size={16} color="#2774AE" style={{ marginRight: 6 }} /><ThemedText type="defaultSemiBold" style={styles.label}>Total Seats</ThemedText></View>
        <ThemedText style={styles.required}>*</ThemedText>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Number of seats"
        value={totalSeats}
        onChangeText={setTotalSeats}
        keyboardType="numeric"
        placeholderTextColor={placeholderColor}
      />

      {/* Price Per Seat */}
      <View style={styles.labelRow}>
        <View style={styles.labelIconRow}><Ionicons name="cash-outline" size={16} color="#2774AE" style={{ marginRight: 6 }} /><ThemedText type="defaultSemiBold" style={styles.label}>Price Per Seat</ThemedText></View>
        <ThemedText style={styles.required}>*</ThemedText>
      </View>
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="0.00"
          value={pricePerSeat}
          onChangeText={setPricePerSeat}
          keyboardType="decimal-pad"
          placeholderTextColor={placeholderColor}
        />
        <View style={styles.addon}><Text style={styles.addonText}>USD</Text></View>
      </View>

      {/* Max Detour Selection */}
      <View style={styles.labelRow}>
        <View style={styles.labelIconRow}><Ionicons name="navigate-outline" size={16} color="#2774AE" style={{ marginRight: 6 }} /><ThemedText type="defaultSemiBold" style={styles.label}>Max Detour Allowance</ThemedText></View>
        <ThemedText style={styles.optionalLabel}>(Optional)</ThemedText>
      </View>
      <View style={styles.detourOptionsContainer}>
        {/* No Limit Option */}
        <TouchableOpacity
          style={[styles.detourOption, maxDetourUnit === 'none' && styles.detourOptionSelected]}
          onPress={() => { setMaxDetourUnit('none'); setMaxDetourValue(''); }}
        >
          <View style={[styles.radioButton, maxDetourUnit === 'none' && styles.radioButtonSelected]} />
          <ThemedText style={styles.detourOptionText}>No Limit</ThemedText>
        </TouchableOpacity>

        {/* Miles Option */}
        <TouchableOpacity
          style={[styles.detourOption, maxDetourUnit === 'miles' && styles.detourOptionSelected]}
          onPress={() => setMaxDetourUnit('miles')}
        >
          <View style={[styles.radioButton, maxDetourUnit === 'miles' && styles.radioButtonSelected]} />
          <ThemedText style={styles.detourOptionText}>Max Miles</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Conditional Input for Miles or Minutes */}
      {maxDetourUnit === 'miles' && (
        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={'0-100'}
            value={maxDetourValue}
            onChangeText={setMaxDetourValue}
            keyboardType="number-pad"
            placeholderTextColor={placeholderColor}
          />
          <View style={styles.addon}>
            <Text style={styles.addonText}>mi</Text>
          </View>
        </View>
      )}

      {/* Description */}
      <View style={styles.labelRow}>
        <View style={styles.labelIconRow}><Ionicons name="chatbubble-outline" size={16} color="#2774AE" style={{ marginRight: 6 }} /><ThemedText type="defaultSemiBold" style={styles.label}>Description</ThemedText></View>
        <ThemedText style={styles.optionalLabel}>(Optional)</ThemedText>
      </View>
      <TextInput
        style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
        placeholder="Add a note about your ride..."
        value={description}
        onChangeText={setDescription}
        multiline
        placeholderTextColor={placeholderColor}
      />

      {/* Submit & Clear Buttons */}
      <View style={styles.bottomButtonsRow}>
        <TouchableOpacity
          style={[styles.routeButton, isSubmitting && styles.buttonDisabled, { flex: 1 }]}
          onPress={async () => { await Haptics.selectionAsync(); handleSubmit(); }}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.geocodeButtonText}>Post Ride</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={async () => { await Haptics.selectionAsync();
          setStartLocation(null);
          setEndLocation(null);
          setDepartureDate(''); setDepartureTime(''); setTotalSeats('1');
          setPricePerSeat(''); setMaxDetourUnit('none'); setMaxDetourValue(''); setDescription('');
          setRoutePolyline([]); setRouteInfo(null);
        }}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
      {submitError && <ThemedText style={styles.error}>{submitError}</ThemedText>}
      {submitSuccess && <ThemedText style={styles.routeInfo}>Ride posted!</ThemedText>}
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F7F9FB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
    color: '#2774AE',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
    color: '#1A1A1A',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  addon: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F0F3F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  addonText: {
    color: '#687076',
    fontSize: 14,
    fontWeight: '500',
  },
  geocodeButton: {
    backgroundColor: '#2774AE',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonInnerRow: { flexDirection: 'row', alignItems: 'center' },
  geocodeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  routeButton: {
    backgroundColor: '#2774AE',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 12,
    marginBottom: 6,
    alignItems: 'center',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    backgroundColor: '#ECEEF0',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 12,
    marginBottom: 6,
  },
  clearButtonText: {
    color: '#1A1A1A',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  error: {
    color: '#D32F2F',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  routeInfo: {
    color: '#2774AE',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  resultsBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#C9DEFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  resultsScrollable: {
    maxHeight: 120,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultName: {
    flex: 1,
    fontWeight: '500',
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  selectedText: {
    color: '#2774AE',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
    gap: 4,
  },
  labelIconRow: { flexDirection: 'row', alignItems: 'center' },
  required: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 16,
  },
  optionalLabel: {
    color: '#687076',
    fontSize: 12,
    marginLeft: 4,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 4,
  },
  backButtonText: {
    color: '#2774AE',
    fontWeight: '600',
    fontSize: 16,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOverlayText: {
    color: '#687076',
    fontSize: 14,
  },
  mapContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C9DEFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  previewButton: {
    backgroundColor: '#2774AE',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  detourOptionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  detourOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 44,
  },
  detourOptionSelected: {
    backgroundColor: '#E8F4FD',
    borderWidth: 2,
    borderColor: '#2774AE',
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#B0B0B0',
    marginRight: 6,
  },
  radioButtonSelected: {
    borderColor: '#2774AE',
    backgroundColor: '#2774AE',
  },
  detourOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    flexShrink: 1,
  },
});
