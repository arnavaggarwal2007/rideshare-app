import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ThemedText } from '../../components/themed-text';
import { subscribeToRideRequests, subscribeToUserRides } from '../../services/firebase/firestore';
import { reverseGeocode } from '../../services/maps/geocoding';
import { acceptRequestThunk, declineRequestThunk } from '../../store/slices/requestsSlice';
import { deleteRideThunk, setMyRides } from '../../store/slices/ridesSlice';

export default function MyRidesScreen() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { myRides, loading: reduxLoading, error: reduxError } = useSelector(state => state.rides);
  const { accepting, declining } = useSelector(state => state.requests);
  
  const [localLoading, setLocalLoading] = useState(true);
  const [nowTick, setNowTick] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [requestsByRide, setRequestsByRide] = useState({});
  const [expandedRides, setExpandedRides] = useState({});
  const [mapPreview, setMapPreview] = useState(null); // { ride, request }
  const mapRef = useRef(null);
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });
  const [requestAddresses, setRequestAddresses] = useState({}); // { [requestId]: { pickup, dropoff, resolved: true } }

  // Use subscription for real-time updates, dispatch to Redux
  useEffect(() => {
    if (!user?.uid) {
      setLocalLoading(false);
      dispatch(setMyRides([]));
      return;
    }
    setLocalLoading(true);
    const unsubscribe = subscribeToUserRides(
      user.uid,
      (rides) => {
        dispatch(setMyRides(rides));
        setLocalLoading(false);
      }
    );
    return () => unsubscribe && unsubscribe();
  }, [user?.uid, dispatch]);


  // Minute tick to refresh time-based status (e.g., completed/in_progress)
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (mapPreview && mapRef.current) {
      const points = [
        mapPreview.ride?.startLocation?.coordinates,
        mapPreview.ride?.endLocation?.coordinates,
        mapPreview.request?.pickupLocation,
        mapPreview.request?.dropoffLocation,
      ].filter(Boolean);
      if (points.length) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(points, {
            edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
            animated: true,
          });
        }, 150);
      }
    }
  }, [mapPreview]);

  // Reverse geocode pickup/dropoff for pending requests (lightweight OSM lookup)
  useEffect(() => {
    const allRequests = Object.values(requestsByRide || {}).flat();
    if (!allRequests.length) return;

    const fetchAddresses = async () => {
      const updates = {};

      for (const req of allRequests) {
        if (!req?.id) continue;
        const cached = requestAddresses[req.id];
        if (cached?.resolved) continue;

        const shortLabel = (res) => res?.placeName?.split(',')[0]?.trim() || res?.address?.split(',')[0]?.trim() || null;

        const pickupRes = req.pickupLocation
          ? await reverseGeocode(req.pickupLocation.latitude, req.pickupLocation.longitude)
          : null;
        const dropoffRes = req.dropoffLocation
          ? await reverseGeocode(req.dropoffLocation.latitude, req.dropoffLocation.longitude)
          : null;

        updates[req.id] = {
          pickup: shortLabel(pickupRes),
          dropoff: shortLabel(dropoffRes),
          resolved: true,
        };
      }

      if (Object.keys(updates).length) {
        setRequestAddresses((prev) => ({ ...prev, ...updates }));
      }
    };

    fetchAddresses();
  }, [requestsByRide, requestAddresses]);

  // Fetch pending requests for each ride with real-time listeners
  useEffect(() => {
    if (!myRides || myRides.length === 0 || !user?.uid) {
      setRequestsByRide({});
      return;
    }

    const unsubscribes = [];

    myRides.forEach((ride) => {
      if (!ride?.id || ride.driverId !== user.uid) return;
      
      const unsubscribe = subscribeToRideRequests(ride.id, user.uid, (requests) => {
        const pendingRequests = requests.filter(r => r.status === 'pending');
        setRequestsByRide(prev => ({
          ...prev,
          [ride.id]: pendingRequests
        }));
      });
      
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub && unsub());
    };
  }, [myRides, user?.uid]);

  // Derive display status and color without mutating Firestore
  const getDisplayStatus = (ride) => {
    const ts = ride?.departureTimestamp;
    const depDate = ts && typeof ts.toDate === 'function' ? ts.toDate() : ts ? new Date(ts) : null;
    const now = new Date(nowTick);
    let display = ride?.status || 'active';
    let color = '#2774AE';

    if (display === 'cancelled') {
      display = 'Cancelled';
      color = '#D32F2F';
    } else if (depDate && now > depDate) {
      display = 'Completed';
      color = '#888';
    } else if (ride?.availableSeats !== undefined && ride?.totalSeats !== undefined && ride.availableSeats <= 0) {
      display = 'Full';
      color = '#D32F2F';
    } else if (display === 'active') {
      display = 'Active';
      color = '#2774AE';
    }

    return { displayStatus: display, statusColor: color };
  };

  const getCity = (location) => {
    const name = location?.placeName || location?.address || '';
    if (!name) return '—';
    const parts = name.split(',');
    return parts[0].trim();
  };

  const getDetourDisplay = (ride) => {
    const unit = ride?.maxDetourUnit || (ride?.maxDetourValue ? 'miles' : 'none');
    const value = ride?.maxDetourValue ?? ride?.maxDetourMinutes ?? null;
    if (unit === 'none' || value === null || value === undefined) return 'No limit';
    return `${value} ${unit}`;
  };

  const toRad = (deg) => deg * (Math.PI / 180);
  const haversineMiles = (a, b) => {
    if (!a || !b) return null;
    const R = 3959; // miles
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  };

  const getRequestDetours = (ride, request) => {
    if (!ride || !request) return { pickup: null, dropoff: null };
    const pickup = haversineMiles(ride.startLocation?.coordinates, request.pickupLocation);
    const dropoff = haversineMiles(request.dropoffLocation, ride.endLocation?.coordinates);
    return { pickup, dropoff };
  };

  const getRouteCoords = (ride) => {
    if (!ride?.routePolyline) return [];
    try {
      const arr = JSON.parse(ride.routePolyline);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  // Handle accept request with confirmation
  const handleAcceptRequest = async (requestId, rideId, riderName) => {
    await Haptics.selectionAsync();
    Alert.alert(
      'Accept Request',
      `Accept seat request from ${riderName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            try {
              await dispatch(acceptRequestThunk({ requestId, rideId })).unwrap();
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', e || 'Failed to accept request');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Handle decline request with confirmation
  const handleDeclineRequest = async (requestId, riderName) => {
    await Haptics.selectionAsync();
    Alert.alert(
      'Decline Request',
      `Decline seat request from ${riderName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(declineRequestThunk(requestId)).unwrap();
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', e || 'Failed to decline request');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Delete handler with native confirm dialog using Redux thunk
  const handleDeleteRide = (rideId) => {
    if (!rideId) return;
    Alert.alert(
      'Delete Ride',
      'Are you sure you want to delete this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteRideThunk(rideId)).unwrap();
            } catch (e) {
              Alert.alert('Error', e || 'Failed to delete ride.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Pull-to-refresh handler (forces a re-render and ensures latest subscription data)
  const handleRefresh = () => {
    setRefreshing(true);
    // Force status recompute and UI refresh; subscription keeps data live
    setNowTick(Date.now());
    // Minimal delay for refresh control UX
    setTimeout(() => setRefreshing(false), 600);
  };

  const loading = localLoading || reduxLoading;
  const error = reduxError;
  const dedupedRides = Array.from(
    new Map((myRides || []).filter(r => r && r.id).map(r => [r.id, r])).values()
  );

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>My Rides</ThemedText>
        <TouchableOpacity onPress={() => router.push('/ride/create')} accessibilityRole="button" accessibilityLabel="Add new ride">
          <ThemedText style={styles.addBtn}>+ Add</ThemedText>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        {loading ? (
          <ActivityIndicator size="large" color="#2774AE" />
        ) : myRides.length === 0 ? (
          <View>
            <ThemedText style={styles.placeholder}>No rides to display yet.</ThemedText>
              <View style={{ alignItems: 'center', marginTop: 16 }}>
              <TouchableOpacity onPress={() => router.push('/ride/create')}>
                <ThemedText style={styles.primaryBtn}>Create your first ride</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={dedupedRides}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const s = getDisplayStatus(item);
              const totalRevenue = (Number(item.totalSeats || 0) * Number(item.pricePerSeat || 0)).toFixed(2);
              const pendingRequests = requestsByRide[item.id] || [];
              const pendingCount = pendingRequests.length;
              const isExpanded = expandedRides[item.id] || false;
              
              return (
                <View style={styles.rideCard}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/ride/${item.id}`)}>
                    <View style={styles.cardHeader}>
                      <View style={styles.headerTopRow}>
                        <ThemedText style={styles.cityText}>{getCity(item.startLocation)}</ThemedText>
                        <ThemedText style={styles.arrow}>→</ThemedText>
                        <ThemedText style={styles.cityText}>{getCity(item.endLocation)}</ThemedText>
                        {pendingCount > 0 && (
                          <View style={styles.requestBadge}>
                            <Text style={styles.requestBadgeText}>{pendingCount}</Text>
                          </View>
                        )}
                      </View>
                      <ThemedText style={styles.dateText}>{item.departureDate} • {item.departureTime}</ThemedText>
                    </View>

                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: '#EAF2FF', borderColor: '#C9DEFF' }]}> 
                        <Text style={styles.badgeText}>{s.displayStatus === 'Active' ? '📅 Upcoming' : s.displayStatus}</Text>
                      </View>
                    </View>

                    <View style={styles.sectionRow}><ThemedText style={styles.sectionLabel}>AVAILABLE SEATS</ThemedText><ThemedText style={styles.sectionValue}>{item.availableSeats}/{item.totalSeats}</ThemedText></View>
                    <View style={styles.sectionRow}><ThemedText style={styles.sectionLabel}>PRICE PER SEAT</ThemedText><ThemedText style={styles.priceValue}>${Number(item.pricePerSeat || 0).toFixed(2)}</ThemedText></View>
                    <View style={styles.sectionRow}><ThemedText style={styles.sectionLabel}>MAX DETOUR</ThemedText><ThemedText style={styles.sectionValue}>{getDetourDisplay(item)}</ThemedText></View>
                    <View style={styles.sectionRow}><ThemedText style={styles.sectionLabel}>TOTAL REVENUE</ThemedText><ThemedText style={styles.sectionValueBlue}>${totalRevenue}</ThemedText></View>

                    {item.description ? (
                      <View style={styles.descriptionBox}>
                        <ThemedText style={styles.descriptionLabel}>DESCRIPTION</ThemedText>
                        <ThemedText style={styles.descriptionText}>{item.description}</ThemedText>
                      </View>
                    ) : null}
                  </TouchableOpacity>

                  {/* Pending Requests Section */}
                  {pendingCount > 0 && (
                    <View style={styles.requestsSection}>
                      <TouchableOpacity 
                        style={styles.requestsHeader}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setExpandedRides(prev => ({ ...prev, [item.id]: !isExpanded }));
                        }}
                      >
                        <ThemedText style={styles.requestsHeaderText}>
                          Pending Requests ({pendingCount})
                        </ThemedText>
                        <ThemedText style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</ThemedText>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.requestsList}>
                          {pendingRequests.map((request) => {
                            const detours = getRequestDetours(item, request);
                            const detourUnit = item.maxDetourUnit || (item.maxDetourValue ? 'miles' : item.maxDetourMinutes ? 'minutes' : 'none');
                            const detourLimit = detourUnit === 'none' ? null : (detourUnit === 'miles' ? item.maxDetourValue : item.maxDetourMinutes);
                            const addr = requestAddresses[request.id] || {};
                            return (
                              <View key={request.id} style={styles.requestItem}>
                                <View style={styles.requestHeader}>
                                  <ThemedText style={styles.riderName}>{request.riderName}</ThemedText>
                                  <ThemedText style={styles.seatsRequested}>+{request.seatsRequested}</ThemedText>
                                </View>
                                {(request.pickupLocation || request.dropoffLocation) && (
                                  <View style={styles.requestLocations}>
                                    {request.pickupLocation && (
                                      <ThemedText style={styles.locationLine}>
                                        Pickup: {addr.pickup || `${request.pickupLocation.latitude?.toFixed(4)}, ${request.pickupLocation.longitude?.toFixed(4)}`}
                                      </ThemedText>
                                    )}
                                    {request.dropoffLocation && (
                                      <ThemedText style={styles.locationLine}>
                                        Dropoff: {addr.dropoff || `${request.dropoffLocation.latitude?.toFixed(4)}, ${request.dropoffLocation.longitude?.toFixed(4)}`}
                                      </ThemedText>
                                    )}
                                  </View>
                                )}
                                <View style={styles.detourRow}>
                                  <ThemedText style={styles.detourLabel}>Detour:</ThemedText>
                                  <ThemedText style={styles.detourValue}>
                                    {(detours.pickup ?? null) !== null ? detours.pickup.toFixed(2) : '—'} mi pickup • {(detours.dropoff ?? null) !== null ? detours.dropoff.toFixed(2) : '—'} mi dropoff
                                    {detourLimit !== null && detourUnit !== 'none' ? ` (limit ${detourLimit} ${detourUnit})` : ' (no limit set)'}
                                  </ThemedText>
                                </View>
                                {request.message && (
                                  <ThemedText style={styles.requestMessage} numberOfLines={2}>
                                    {request.message}
                                  </ThemedText>
                                )}
                                <View style={styles.requestActions}>
                                  <TouchableOpacity 
                                    style={[styles.actionBtn, styles.mapBtn]}
                                    onPress={() => setMapPreview({ ride: item, request })}
                                  >
                                    <Text style={styles.mapBtnText}>View map</Text>
                                  </TouchableOpacity>
                                </View>
                                <View style={styles.requestActions}>
                                  <TouchableOpacity 
                                    style={[styles.actionBtn, styles.acceptBtn]}
                                    onPress={() => handleAcceptRequest(request.id, item.id, request.riderName)}
                                    disabled={accepting || declining}
                                  >
                                    <Text style={styles.acceptBtnText}>
                                      {accepting ? 'Accepting...' : 'Accept'}
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    style={[styles.actionBtn, styles.declineBtn]}
                                    onPress={() => handleDeclineRequest(request.id, request.riderName)}
                                    disabled={accepting || declining}
                                  >
                                    <Text style={styles.declineBtnText}>
                                      {declining ? 'Declining...' : 'Decline'}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.bottomButtons}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/ride/edit', params: { id: item.id } })}>
                      <Text style={styles.bottomBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteRide(item.id)}>
                      <Text style={styles.bottomBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.contentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2774AE"]} tintColor="#2774AE"/>}
        />
        )}
      </View>
      <Modal
        visible={!!mapPreview}
        animationType="slide"
        transparent
        onRequestClose={() => setMapPreview(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>Pickup & Dropoff</ThemedText>
            {(() => {
              const points = mapPreview
                ? [
                    mapPreview.ride?.startLocation?.coordinates,
                    mapPreview.ride?.endLocation?.coordinates,
                    mapPreview.request?.pickupLocation,
                    mapPreview.request?.dropoffLocation,
                  ].filter(Boolean)
                : [];
              const routeCoords = mapPreview ? getRouteCoords(mapPreview.ride) : [];
              const initialRegion = points.length
                ? {
                    latitude: points[0].latitude,
                    longitude: points[0].longitude,
                    latitudeDelta: 0.3,
                    longitudeDelta: 0.3,
                  }
                : { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 10, longitudeDelta: 10 };

              return (
                <MapView
                  ref={mapRef}
                  style={styles.modalMap}
                  initialRegion={initialRegion}
                >
                  {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeColor="#2774AE" strokeWidth={3} />}
                  {mapPreview?.ride?.startLocation?.coordinates && (
                    <Marker coordinate={mapPreview.ride.startLocation.coordinates} title="Start" pinColor="#2774AE" />
                  )}
                  {mapPreview?.ride?.endLocation?.coordinates && (
                    <Marker coordinate={mapPreview.ride.endLocation.coordinates} title="End" pinColor="#D32F2F" />
                  )}
                  {mapPreview?.request?.pickupLocation && (
                    <Marker coordinate={mapPreview.request.pickupLocation} title="Pickup" pinColor="#FFA000" />
                  )}
                  {mapPreview?.request?.dropoffLocation && (
                    <Marker coordinate={mapPreview.request.dropoffLocation} title="Dropoff" pinColor="#4CAF50" />
                  )}
                </MapView>
              );
            })()}
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setMapPreview(null)}>
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E3E7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 28, fontWeight: '800', fontFamily: 'Montserrat_700Bold', color: '#1A1A1A', lineHeight: 34 },
  contentContainer: { padding: 16, paddingBottom: 110 },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    backgroundColor: '#EAF2FF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityText: { color: '#1A1A1A', fontWeight: '700', fontSize: 15 },
  arrow: { color: '#2774AE', fontWeight: '700', fontSize: 16 },
  dateText: { color: '#687076', fontSize: 13, marginTop: 4 },
  badgeRow: { flexDirection: 'row', marginBottom: 8 },
  badge: { borderRadius: 999, borderWidth: 1, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { color: '#2774AE', fontWeight: '600', fontSize: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { color: '#687076', fontSize: 12, letterSpacing: 0.5, fontWeight: '700' },
  sectionValue: { color: '#1A1A1A', fontSize: 15, fontWeight: '600' },
  sectionValueBlue: { color: '#2774AE', fontSize: 15, fontWeight: '700' },
  priceValue: { color: '#2774AE', fontSize: 18, fontWeight: '800' },
  descriptionBox: { backgroundColor: '#F4F6F8', borderRadius: 8, padding: 10, marginTop: 4 },
  descriptionLabel: { color: '#8A949B', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  descriptionText: { color: '#333', fontSize: 14 },
  bottomButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  editBtn: { flex: 1, backgroundColor: '#2774AE', borderRadius: 8, alignItems: 'center', paddingVertical: 12 },
  deleteBtn: { flex: 1, backgroundColor: '#D32F2F', borderRadius: 8, alignItems: 'center', paddingVertical: 12 },
  bottomBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 2,
  },
  rideLabel: {
    width: 70,
    color: '#2774AE',
    fontWeight: '700',
    fontSize: 12,
  },
  rideValue: {
    flex: 1,
    color: '#333',
    fontWeight: '500',
    fontSize: 14,
  },
  placeholder: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  addBtn: {
    color: '#2774AE',
    fontWeight: '700',
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  primaryBtn: {
    color: '#FFFFFF',
    backgroundColor: '#2774AE',
    fontWeight: 'bold',
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    overflow: 'hidden',
  },
  requestBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  requestBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  requestsSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E3E7',
    paddingTop: 12,
  },
  requestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  requestsHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  expandIcon: {
    fontSize: 12,
    color: '#2774AE',
  },
  requestsList: {
    marginTop: 8,
  },
  requestItem: {
    backgroundColor: '#F7F9FB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  riderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  seatsRequested: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2774AE',
  },
  requestMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  requestLocations: {
    marginBottom: 6,
    gap: 2,
  },
  locationLine: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  detourRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 4 },
  detourLabel: { fontSize: 12, fontWeight: '700', color: '#687076' },
  detourValue: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', flex: 1, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  mapBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2774AE',
  },
  mapBtnText: {
    color: '#2774AE',
    fontSize: 13,
    fontWeight: '700',
  },
  acceptBtn: {
    backgroundColor: '#2774AE',
  },
  declineBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  declineBtnText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  modalMap: {
    width: '100%',
    height: 260,
    borderRadius: 10,
  },
  closeModalBtn: {
    marginTop: 10,
    backgroundColor: '#2774AE',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
