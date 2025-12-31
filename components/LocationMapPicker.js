import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { ThemedText } from './themed-text';

// Haversine formula for distance calculation
const getDistanceInMiles = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * LocationMapPicker Component
 * 
 * Displays the original ride route and allows rider to select custom pickup/dropoff locations.
 * Validates that the detour doesn't exceed driver's maxDetour preference.
 * 
 * Props:
 * - rideRoute: array of {latitude, longitude} - original ride polyline
 * - startLocation: {coordinates: {latitude, longitude}, placeName} - ride start
 * - endLocation: {coordinates: {latitude, longitude}, placeName} - ride end
 * - maxDetourUnit: 'miles' | 'minutes' | 'none' - driver's detour unit preference
 * - maxDetourValue: number | null - driver's max detour value
 * - onLocationsSelected: (pickup, dropoff, isValid) => void - callback with selected locations
 */
export default function LocationMapPicker({
  rideRoute = [],
  startLocation,
  endLocation,
  maxDetourUnit = 'none',
  maxDetourValue = null,
  onLocationsSelected,
}) {
  const mapRef = useRef(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [detourDistance, setDetourDistance] = useState({ pickup: null, dropoff: null });
  const [detourExceeded, setDetourExceeded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectionMode, setSelectionMode] = useState('pickup');

  const effectiveDetourUnit = useMemo(() => {
    if (maxDetourUnit && maxDetourUnit !== 'none') return maxDetourUnit;
    return maxDetourValue ? 'miles' : 'none';
  }, [maxDetourUnit, maxDetourValue]);

  // Initial region - center of ride route
  const initialRegion = React.useMemo(() => {
    if (rideRoute.length > 0) {
      const midpoint = rideRoute[Math.floor(rideRoute.length / 2)];
      return {
        latitude: midpoint.latitude,
        longitude: midpoint.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }
    if (startLocation?.coordinates) {
      return {
        ...startLocation.coordinates,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      };
    }
    return {
      latitude: 39.8283,
      longitude: -98.5795,
      latitudeDelta: 20,
      longitudeDelta: 20,
    };
  }, [rideRoute, startLocation]);

  // Fit map to show entire route when ready
  useEffect(() => {
    if (mapReady && mapRef.current && rideRoute.length > 1) {
      setTimeout(() => {
        mapRef.current.fitToCoordinates(rideRoute, {
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          animated: true,
        });
      }, 300);
    }
  }, [mapReady, rideRoute]);

  // Calculate detour when both locations are selected
  useEffect(() => {
    const calculateDetour = async () => {
      if (!pickupLocation || !dropoffLocation || !startLocation?.coordinates || !endLocation?.coordinates) return;

      setCalculating(true);
      setDetourDistance({ pickup: null, dropoff: null });
      setDetourExceeded(false);

      try {
        const pickupDetour = getDistanceInMiles(
          startLocation.coordinates.latitude,
          startLocation.coordinates.longitude,
          pickupLocation.latitude,
          pickupLocation.longitude
        );

        const dropoffDetour = getDistanceInMiles(
          dropoffLocation.latitude,
          dropoffLocation.longitude,
          endLocation.coordinates.latitude,
          endLocation.coordinates.longitude
        );

        setDetourDistance({ pickup: pickupDetour, dropoff: dropoffDetour });

        let exceeded = false;
        if ((effectiveDetourUnit === 'miles' || effectiveDetourUnit === 'minutes') && maxDetourValue !== null) {
          exceeded = pickupDetour > maxDetourValue || dropoffDetour > maxDetourValue;
        }

        setDetourExceeded(exceeded);

        if (onLocationsSelected) {
          onLocationsSelected(pickupLocation, dropoffLocation, !exceeded);
        }
      } catch (error) {
        console.error('Detour calculation error:', error);
        setDetourExceeded(true);
        if (onLocationsSelected) {
          onLocationsSelected(pickupLocation, dropoffLocation, false);
        }
      } finally {
        setCalculating(false);
      }
    };

    if (pickupLocation && dropoffLocation && effectiveDetourUnit !== 'none') {
      calculateDetour();
    } else if (pickupLocation && dropoffLocation) {
      setDetourExceeded(false);
      setDetourDistance({ pickup: null, dropoff: null });
      if (onLocationsSelected) {
        onLocationsSelected(pickupLocation, dropoffLocation, true);
      }
    }
  }, [pickupLocation, dropoffLocation, effectiveDetourUnit, maxDetourValue, startLocation, endLocation, onLocationsSelected]);

  const handleMapPress = (event) => {
    const coordinate = event?.nativeEvent?.coordinate;
    if (!coordinate?.latitude || !coordinate?.longitude) return;

    const { latitude, longitude } = coordinate;

    if (selectionMode === 'pickup') {
      setPickupLocation({ latitude, longitude });
      setDetourDistance((prev) => ({ pickup: null, dropoff: prev.dropoff }));
      setDetourExceeded(false);
      if (!dropoffLocation) {
        setSelectionMode('dropoff');
      }
    } else {
      setDropoffLocation({ latitude, longitude });
      setDetourDistance((prev) => ({ pickup: prev.pickup, dropoff: null }));
      setDetourExceeded(false);
    }
  };

  const resetLocations = () => {
    setPickupLocation(null);
    setDropoffLocation(null);
    setDetourDistance({ pickup: null, dropoff: null });
    setDetourExceeded(false);
    setSelectionMode('pickup');
  };

  const renderValidationMessage = () => {
    if (calculating) {
      return (
        <View style={[styles.validationBox, styles.validationCalculating]}>
          <ActivityIndicator size="small" color="#2774AE" />
          <ThemedText style={styles.validationText}>Calculating detour...</ThemedText>
        </View>
      );
    }

    if (!pickupLocation || !dropoffLocation) {
      return (
        <View style={[styles.validationBox, styles.validationInfo]}>
          <Ionicons name="information-circle-outline" size={20} color="#2774AE" />
          <ThemedText style={styles.validationText}>
            {!pickupLocation ? 'Tap to select pickup location' : 'Tap to select dropoff location'}
          </ThemedText>
        </View>
      );
    }

    if (detourExceeded) {
      return (
        <View style={[styles.validationBox, styles.validationError]}>
          <Ionicons name="close-circle-outline" size={20} color="#D32F2F" />
          <ThemedText style={[styles.validationText, { color: '#D32F2F' }]}>
            Detour exceeds driver&apos;s max ({maxDetourValue} {maxDetourUnit}) — pickup {detourDistance.pickup?.toFixed(2)} mi, dropoff {detourDistance.dropoff?.toFixed(2)} mi
          </ThemedText>
        </View>
      );
    }

    if (detourDistance.pickup !== null && detourDistance.dropoff !== null) {
      return (
        <View style={[styles.validationBox, styles.validationSuccess]}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#2E7D32" />
          <ThemedText style={[styles.validationText, { color: '#2E7D32' }]}>
            Valid! Pickup {detourDistance.pickup?.toFixed(2)} mi • Dropoff {detourDistance.dropoff?.toFixed(2)} mi
            {maxDetourUnit !== 'none' && ` (≤ ${maxDetourValue} ${maxDetourUnit} each)`}
          </ThemedText>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.selectionRow}>
        <TouchableOpacity
          style={[styles.selectionPill, selectionMode === 'pickup' && styles.selectionPillActive]}
          onPress={() => setSelectionMode('pickup')}
        >
          <Ionicons name="locate" size={16} color={selectionMode === 'pickup' ? '#FFFFFF' : '#2774AE'} />
          <ThemedText style={[styles.selectionText, selectionMode === 'pickup' && styles.selectionTextActive]}>Set Pickup</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectionPill, selectionMode === 'dropoff' && styles.selectionPillActive]}
          onPress={() => setSelectionMode('dropoff')}
        >
          <Ionicons name="flag" size={16} color={selectionMode === 'dropoff' ? '#FFFFFF' : '#2774AE'} />
          <ThemedText style={[styles.selectionText, selectionMode === 'dropoff' && styles.selectionTextActive]}>Set Dropoff</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetLink} onPress={resetLocations}>
          <ThemedText style={styles.resetText}>Reset</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          onPress={handleMapPress}
          onMapReady={() => setMapReady(true)}
        >
          {/* Original ride route */}
          {rideRoute.length > 0 && (
            <Polyline
              coordinates={rideRoute}
              strokeColor="#2774AE"
              strokeWidth={3}
              lineDashPattern={[1, 4]}
            />
          )}

          {/* Original start marker */}
          {startLocation?.coordinates && (
            <Marker
              coordinate={startLocation.coordinates}
              title="Ride Start"
              description={startLocation.placeName}
              pinColor="#2774AE"
            />
          )}

          {/* Original end marker */}
          {endLocation?.coordinates && (
            <Marker
              coordinate={endLocation.coordinates}
              title="Ride End"
              description={endLocation.placeName}
              pinColor="#D32F2F"
            />
          )}

          {/* Pickup location marker */}
          {pickupLocation && (
            <Marker
              coordinate={pickupLocation}
              title="Your Pickup"
              pinColor="#4CAF50"
            >
              <View style={styles.customMarker}>
                <Ionicons name="locate" size={24} color="#4CAF50" />
              </View>
            </Marker>
          )}

          {/* Dropoff location marker */}
          {dropoffLocation && (
            <Marker
              coordinate={dropoffLocation}
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

      {/* Validation message */}
      {renderValidationMessage()}

      {/* Instructions */}
      <View style={styles.instructionsBox}>
        <ThemedText style={styles.instructionsTitle}>How to use:</ThemedText>
        <ThemedText style={styles.instructionsText}>
          1. Choose “Set Pickup” or “Set Dropoff” then tap on the map
        </ThemedText>
        <ThemedText style={styles.instructionsText}>
          2. Switch buttons anytime to adjust either marker
        </ThemedText>
        <ThemedText style={styles.instructionsText}>
          3. Use Reset to clear both selections
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  selectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2774AE',
    backgroundColor: '#FFFFFF',
  },
  selectionPillActive: {
    backgroundColor: '#2774AE',
  },
  selectionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2774AE',
  },
  selectionTextActive: {
    color: '#FFFFFF',
  },
  resetLink: {
    marginLeft: 'auto',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  resetText: {
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 13,
  },
  mapContainer: {
    height: 350,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#C9DEFF',
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
  validationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  validationInfo: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2774AE',
  },
  validationCalculating: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  validationSuccess: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  validationError: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  validationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2774AE',
    flex: 1,
  },
  instructionsBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FBFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE6F5',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 13,
    color: '#687076',
    marginBottom: 3,
  },
});
