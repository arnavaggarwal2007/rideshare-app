import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, TextInput, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { logout } from '../../store/slices/authSlice';
import { searchAddress, reverseGeocode } from '../../services/maps/geocoding';
import { calculateRegionFromCoordinates, formatCoordinates } from '../../services/maps/utils';
import { getDirections } from '../../services/maps/directions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Lato_400Regular } from '@expo-google-fonts/lato';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

export default function HomeScreen() {
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });

  // State for address search and map
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(
    calculateRegionFromCoordinates(39.8283, -98.5795, 20, 20) // Default: center of US
  );
  const mapRef = useRef(null);

  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationResults, setDestinationResults] = useState([]);
  const [destinationResult, setDestinationResult] = useState(null);
  const [isDestinationSearching, setIsDestinationSearching] = useState(false);
  const [destinationError, setDestinationError] = useState(null);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [isRouting, setIsRouting] = useState(false);
  const [routingError, setRoutingError] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  if (!fontsLoaded) return null;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      dispatch(logout());
      router.replace('/(auth)/signin');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const results = await searchAddress(searchQuery);
      setSearchResults(results);
      if (results.length === 0) setSearchError('No results found.');
    } catch (err) {
      setSearchError('Geocoding failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result) => {
    setSelectedLocation(result);
    setMapRegion(
      calculateRegionFromCoordinates(
        result.coordinates.latitude,
        result.coordinates.longitude,
        0.05,
        0.05
      )
    );
    setSearchResults([]);
    setSearchQuery(result.address);
  };

  const handleDestinationSearch = async () => {
    setIsDestinationSearching(true);
    setDestinationError(null);
    setDestinationResults([]);
    try {
      const results = await searchAddress(destinationQuery);
      setDestinationResults(results);
      if (results.length === 0) setDestinationError('No results found.');
    } catch (err) {
      setDestinationError('Geocoding failed.');
    } finally {
      setIsDestinationSearching(false);
    }
  };

  const handleSelectDestination = (result) => {
    setDestinationResult(result);
    setDestinationResults([]);
    setDestinationQuery(result.address);
  };

  const handleRoutePreview = async () => {
    setRoutingError(null);
    setRouteInfo(null);
    setRoutePolyline([]);
    setIsRouting(true);
    try {
      const start = selectedLocation?.coordinates || { latitude: mapRegion.latitude, longitude: mapRegion.longitude };
      const dest = destinationResult;
      if (!dest) {
        setRoutingError('Select a destination first (search and tap a result).');
        return;
      }
      const directions = await getDirections(start, dest.coordinates);
      console.log('[HomeScreen] Directions result:', {
        polylineLength: directions.polyline?.length,
        firstCoord: directions.polyline?.[0],
        lastCoord: directions.polyline?.[directions.polyline?.length - 1],
        distance: directions.distance,
        duration: directions.duration
      });
      setRoutePolyline(directions.polyline || []);
      setRouteInfo({ distance: directions.distance, duration: directions.duration });
      if (mapRef.current && (directions.polyline || []).length) {
        mapRef.current.fitToCoordinates(directions.polyline, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } catch (e) {
      setRoutingError(e?.message || 'Routing failed.');
    } finally {
      setIsRouting(false);
    }
  };

  // Handle marker drag end - reverse geocode to update address
  const handleStartMarkerDrag = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await reverseGeocode(latitude, longitude);
      if (result) {
        setSelectedLocation(result);
        setSearchQuery(result.address);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  const handleDestMarkerDrag = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await reverseGeocode(latitude, longitude);
      if (result) {
        setDestinationResult(result);
        setDestinationQuery(result.address);
        // Clear route when destination changes
        setRoutePolyline([]);
        setRouteInfo(null);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  // Use current location
  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }
      // Get current position
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      
      // Reverse geocode to get address
      const result = await reverseGeocode(latitude, longitude);
      if (result) {
        setSelectedLocation(result);
        setSearchQuery(result.address);
        setMapRegion(
          calculateRegionFromCoordinates(latitude, longitude, 0.05, 0.05)
        );
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to get current location.');
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FB" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.title}>Find Your Ride</Text>
        <Text style={styles.subtitle}>Search for your start and destination</Text>

        {/* Map Preview (React Native Maps) */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={mapRegion}
            onRegionChangeComplete={setMapRegion}
          >
            {selectedLocation && (
              <Marker
                coordinate={selectedLocation.coordinates}
                title={selectedLocation.placeName || 'Selected Location'}
                description="Drag to adjust"
                draggable
                onDragEnd={handleStartMarkerDrag}
              />
            )}
            {destinationResult && (
              <Marker
                coordinate={destinationResult.coordinates}
                title={destinationResult.placeName || 'Destination'}
                description="Drag to adjust"
                pinColor="#D32F2F"
                draggable
                onDragEnd={handleDestMarkerDrag}
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
        </View>

        {/* Selected Location Display */}
        <View style={styles.selectedAddressContainer}>
          {selectedLocation ? (
            <>
              <View style={styles.addressRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedLabel}>Start Address:</Text>
                  <Text style={styles.selectedAddress}>{selectedLocation.address}</Text>
                </View>
                <TouchableOpacity
                  style={styles.clearIconButton}
                  onPress={() => {
                    setSelectedLocation(null);
                    setSearchQuery('');
                    setRoutePolyline([]);
                    setRouteInfo(null);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.noSelection}>No start location selected.</Text>
          )}
          {destinationResult && (
            <>
              <View style={[styles.addressRow, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedLabel}>Destination Address:</Text>
                  <Text style={styles.selectedAddress}>{destinationResult.address}</Text>
                </View>
                <TouchableOpacity
                  style={styles.clearIconButton}
                  onPress={() => {
                    setDestinationResult(null);
                    setDestinationQuery('');
                    setRoutePolyline([]);
                    setRouteInfo(null);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </>
          )}
          {routeInfo && (
            <View style={[styles.addressRow, { marginTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedLabel}>Route Preview:</Text>
                <Text style={styles.routeInfoText}>
                  {(routeInfo.distance / 1000 * 0.621371).toFixed(2)} mi • {Math.floor(routeInfo.duration / 3600)}h {Math.floor((routeInfo.duration % 3600) / 60)}m
                </Text>
              </View>
              <TouchableOpacity
                style={styles.clearIconButton}
                onPress={() => {
                  setRoutePolyline([]);
                  setRouteInfo(null);
                }}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Start Location Search */}
        <View style={styles.geocodeBox}>
          <Text style={styles.geocodeLabel}>Start Location</Text>
          <TextInput
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Enter a start address"
            placeholderTextColor="#999"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.geocodeButton, { flex: 1, marginRight: 8, marginBottom: 0 }]} 
              onPress={handleSearch} 
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.geocodeButtonText}>Search</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.locationButton]} 
              onPress={handleUseCurrentLocation} 
              disabled={loadingLocation}
            >
              {loadingLocation ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="location" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          {searchError && <Text style={styles.error}>{searchError}</Text>}
          {searchResults.length > 0 && (
            <View style={[styles.resultsBox, styles.resultsScrollable]}>
              <ScrollView nestedScrollEnabled>
                <Text style={styles.resultsTitle}>Results</Text>
                {searchResults.map((r) => (
                  <TouchableOpacity
                    key={`${r.coordinates.latitude},${r.coordinates.longitude}`}
                    style={styles.resultItem}
                    onPress={() => handleSelectResult(r)}
                  >
                    <Text style={styles.resultName}>{r.address}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Destination Search */}
        <View style={styles.geocodeBox}>
          <Text style={styles.geocodeLabel}>Destination</Text>
          <TextInput
            style={styles.input}
            value={destinationQuery}
            onChangeText={setDestinationQuery}
            placeholder="Enter destination address"
            placeholderTextColor="#999"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.geocodeButton} onPress={handleDestinationSearch} disabled={isDestinationSearching}>
            {isDestinationSearching ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.geocodeButtonText}>Search Destination</Text>
            )}
          </TouchableOpacity>
          {destinationError && <Text style={styles.error}>{destinationError}</Text>}
          {destinationResults.length > 0 && (
            <View style={[styles.resultsBox, styles.resultsScrollable]}>
              <ScrollView nestedScrollEnabled>
                <Text style={styles.resultsTitle}>Results</Text>
                {destinationResults.map((r) => (
                  <TouchableOpacity
                    key={`${r.coordinates.latitude},${r.coordinates.longitude}`}
                    style={styles.resultItem}
                    onPress={() => handleSelectDestination(r)}
                  >
                    <Text style={styles.resultName}>{r.address}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {destinationResult ? (
            <Text style={styles.selectedText}>Selected: {destinationResult.address}</Text>
          ) : (
            <Text style={styles.helperText}>Search and tap a destination result to select it.</Text>
          )}
          <TouchableOpacity
            style={[styles.routeButton, !destinationResult && styles.buttonDisabled]}
            onPress={handleRoutePreview}
            disabled={isRouting || !destinationResult}
          >
            {isRouting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.geocodeButtonText}>Preview Route</Text>
            )}
          </TouchableOpacity>
          {routingError && <Text style={styles.error}>{routingError}</Text>}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.geocodeButtonText}>Sign Out</Text>
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
    flexGrow: 1,
    alignItems: 'stretch',
    backgroundColor: '#F7F9FB',
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#3C4F5A',
    marginBottom: 24,
    textAlign: 'center',
  },
  mapContainer: {
    width: '100%',
    height: 300,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  selectedAddressContainer: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  selectedLabel: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  selectedAddress: {
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#3C4F5A',
  },
  noSelection: {
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#999',
    fontStyle: 'italic',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  clearIconButton: {
    padding: 4,
  },
  routeInfoText: {
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#2774AE',
    fontWeight: '600',
    marginTop: 4,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  locationButton: {
    backgroundColor: '#2774AE',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  geocodeBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  geocodeLabel: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7F9FB',
    borderColor: '#E0E3E7',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  geocodeButton: {
    backgroundColor: '#2774AE',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    height: 48,
  },
  routeButton: {
    backgroundColor: '#2774AE',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  geocodeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  error: {
    color: '#FF3B30',
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    textAlign: 'center',
  },
  selectedText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#3C4F5A',
  },
  helperText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#999',
  },
  routeInfo: {
    marginTop: 8,
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  resultsBox: {
    marginTop: 8,
  },
  resultsScrollable: {
    maxHeight: 180,
  },
  resultsTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  resultItem: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#F7F9FB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E3E7',
  },
  resultName: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#333',
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
});
