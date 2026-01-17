import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ThemedText } from '../../components/themed-text';
import { subscribeToRiderRequests, subscribeToRiderTrips } from '../../services/firebase/firestore';
import { cancelRequestThunk, setMyRequests } from '../../store/slices/requestsSlice';
import { fetchUnratedTripsThunk } from '../../store/slices/reviewsSlice';

export default function MyTripsScreen() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { myRequests, loading } = useSelector(state => state.requests);
  const { unratedTrips } = useSelector(state => state.reviews);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    if (!user?.uid) {
      dispatch(setMyRequests([]));
      setTrips([]);
      return;
    }

    // Subscribe to real-time updates for rider's requests
    const unsubscribeRequests = subscribeToRiderRequests(user.uid, (requests) => {
      dispatch(setMyRequests(requests));
    });

    // Subscribe to real-time updates for rider's trips
    const unsubscribeTrips = subscribeToRiderTrips(user.uid, (tripsData) => {
      setTrips(tripsData);
    });
    
    // Fetch unrated trips
    dispatch(fetchUnratedTripsThunk({ userId: user.uid }));

    return () => {
      unsubscribeRequests();
      unsubscribeTrips();
    };
  }, [dispatch, user?.uid]);

  const grouped = useMemo(() => {
    const pending = [];
    const accepted = [];
    const declined = [];
    const seen = new Set();

    (myRequests || []).forEach(r => {
      if (!r?.id || seen.has(r.id)) return;
      seen.add(r.id);
      if (r.status === 'accepted') accepted.push(r);
      else if (r.status === 'declined') declined.push(r);
      else pending.push(r);
    });
    return { pending, accepted, declined };
  }, [myRequests]);

  const groupedTrips = useMemo(() => {
    const confirmed = [];
    const inProgress = [];
    const completed = [];

    (trips || []).forEach(trip => {
      if (!trip?.id) return;
      if (trip.status === 'in-progress') inProgress.push(trip);
      else if (trip.status === 'completed') completed.push(trip);
      else if (trip.status === 'confirmed') confirmed.push(trip);
    });
    return { confirmed, inProgress, completed };
  }, [trips]);

  // Pending ratings (unrated trips)
  const pendingRatings = Array.isArray(unratedTrips) ? unratedTrips : [];

  const handleCancel = async (requestId) => {
    await Haptics.selectionAsync();
    try {
      await dispatch(cancelRequestThunk(requestId)).unwrap();
    } catch (e) {
      console.warn('Cancel request failed:', e);
    }
  };

  const getCity = (location) => {
    if (!location) return '—';
    const placeName = location?.placeName || location?.address || '';
    if (!placeName) return '—';
    
    // Extract meaningful parts from address (e.g., "1003, Calboro Drive")
    const parts = placeName.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
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
    return parts[0] || '—';
  };

  const formatTripDate = (trip) => {
    if (trip.departureTimestamp) {
      const date = trip.departureTimestamp.toDate ? trip.departureTimestamp.toDate() : new Date(trip.departureTimestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    return 'TBD';
  };

  const formatTripTime = (trip) => {
    if (trip.departureTimestamp) {
      const date = trip.departureTimestamp.toDate ? trip.departureTimestamp.toDate() : new Date(trip.departureTimestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      }
    }
    return 'TBD';
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'confirmed': return { bg: '#EAF2FF', text: '#2774AE' };
      case 'in-progress': return { bg: '#FFF4E5', text: '#FF8C00' };
      case 'completed': return { bg: '#D4EDDA', text: '#155724' };
      default: return { bg: '#F0F0F0', text: '#666' };
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Refresh unrated trips
    if (user?.uid) {
      dispatch(fetchUnratedTripsThunk({ userId: user.uid }));
    }
    // Real-time subscription will automatically update
    setTimeout(() => setRefreshing(false), 500);
  };

  const Section = ({ title, items, showCancel }) => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        <ThemedText style={styles.sectionCount}>{items.length}</ThemedText>
      </View>
      {items.length === 0 ? (
        <ThemedText style={styles.emptyText}>None</ThemedText>
      ) : (
        items.map((req) => {
          const startAddress = req.startLocation?.address || req.startLocation || 'Unknown';
          const endAddress = req.endLocation?.address || req.endLocation || 'Unknown';
          return (
            <View key={`${req.id}-${req.status || 'pending'}`} style={styles.reqRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.routeHeader}>
                  <ThemedText style={styles.cityText} numberOfLines={1}>{startAddress}</ThemedText>
                  <ThemedText style={styles.arrow}>→</ThemedText>
                  <ThemedText style={styles.cityText} numberOfLines={1}>{endAddress}</ThemedText>
                </View>
                <ThemedText style={styles.driverMeta}>Driver: {req.driverName || 'Driver'}</ThemedText>
                {req.message ? (
                  <ThemedText style={styles.reqMsg} numberOfLines={2}>{req.message}</ThemedText>
                ) : null}
              </View>
              <View style={styles.reqRight}>
                <ThemedText style={styles.reqSeats}>+{req.seatsRequested}</ThemedText>
                {showCancel ? (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(req.id)} accessibilityRole="button" accessibilityLabel="Cancel request">
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const TripSection = ({ title, items }) => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        <ThemedText style={styles.sectionCount}>{items.length}</ThemedText>
      </View>
      {items.length === 0 ? (
        <ThemedText style={styles.emptyText}>None</ThemedText>
      ) : (
        items.map((trip) => {
          const startCity = getCity(trip.startLocation);
          const endCity = getCity(trip.endLocation);
          const colors = getStatusBadgeColor(trip.status);
          
          return (
            <TouchableOpacity 
              key={trip.id} 
              style={styles.tripRow}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/trip/${trip.id}`);
              }}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.routeHeader}>
                  <ThemedText style={styles.cityText} numberOfLines={1}>{startCity}</ThemedText>
                  <ThemedText style={styles.arrow}>→</ThemedText>
                  <ThemedText style={styles.cityText} numberOfLines={1}>{endCity}</ThemedText>
                </View>
                <View style={styles.tripMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={14} color="#687076" />
                    <ThemedText style={styles.metaText}>{trip.driverName || 'Driver'}</ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#687076" />
                    <ThemedText style={styles.metaText}>{formatTripDate(trip)}</ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color="#687076" />
                    <ThemedText style={styles.metaText}>{formatTripTime(trip)}</ThemedText>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                  <ThemedText style={[styles.statusText, { color: colors.text }]}>
                    {trip.status === 'in-progress' ? 'In Progress' : trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.tripActions}>
                {trip.chatId && (
                  <TouchableOpacity 
                    style={styles.chatBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      Haptics.selectionAsync();
                      router.push(`/chat/${trip.chatId}`);
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color="#2774AE" />
                  </TouchableOpacity>
                )}
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  // Pending Ratings Section - shows trips that need to be rated
  const PendingRatingsSection = () => {
    if (pendingRatings.length === 0) return null;
    
    return (
      <View style={styles.pendingRatingsCard}>
        <View style={styles.pendingRatingsHeader}>
          <View style={styles.pendingRatingsTitleRow}>
            <Ionicons name="star" size={18} color="#FFB300" />
            <ThemedText style={styles.pendingRatingsTitle}>Rate Your Trips</ThemedText>
          </View>
          <View style={styles.pendingRatingsBadge}>
            <Text style={styles.pendingRatingsBadgeText}>{pendingRatings.length}</Text>
          </View>
        </View>
        <ThemedText style={styles.pendingRatingsSubtitle}>
          You have {pendingRatings.length} trip{pendingRatings.length !== 1 ? 's' : ''} waiting for your review
        </ThemedText>
        {pendingRatings.slice(0, 3).map((trip) => {
          const startCity = getCity(trip.startLocation);
          const endCity = getCity(trip.endLocation);
          const isDriver = trip.userRole === 'driver';
          const otherPersonName = isDriver ? (trip.riderName || 'Rider') : (trip.driverName || 'Driver');
          
          return (
            <TouchableOpacity 
              key={trip.id} 
              style={styles.pendingRatingRow}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/rating/${trip.id}`);
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.routeHeader}>
                  <ThemedText style={styles.cityText} numberOfLines={1}>{startCity}</ThemedText>
                  <ThemedText style={styles.arrow}>→</ThemedText>
                  <ThemedText style={styles.cityText} numberOfLines={1}>{endCity}</ThemedText>
                </View>
                <ThemedText style={styles.pendingRatingMeta}>
                  Rate {otherPersonName} ({isDriver ? 'your rider' : 'your driver'})
                </ThemedText>
              </View>
              <TouchableOpacity 
                style={styles.rateBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push(`/rating/${trip.id}`);
                }}
              >
                <Ionicons name="star" size={16} color="#FFF" />
                <Text style={styles.rateBtnText}>Rate</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
        {pendingRatings.length > 3 && (
          <ThemedText style={styles.moreRatingsText}>
            +{pendingRatings.length - 3} more trips to rate
          </ThemedText>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>My Trips</ThemedText>
        {loading ? <ActivityIndicator size="small" color="#2774AE" /> : null}
      </View>
      <View style={styles.container}>

        <FlatList
          data={[
            { key: 'pendingRatings' },
            { key: 'inProgress' },
            { key: 'confirmed' },
            { key: 'completed' },
            { key: 'pending' },
            { key: 'accepted' },
            { key: 'declined' }
          ]}
          renderItem={({ item }) => {
            if (item.key === 'pendingRatings') return <PendingRatingsSection />;
            if (item.key === 'inProgress') return <TripSection title="In Progress" items={groupedTrips.inProgress} />;
            if (item.key === 'confirmed') return <TripSection title="Confirmed Trips" items={groupedTrips.confirmed} />;
            if (item.key === 'completed') return <TripSection title="Completed" items={groupedTrips.completed} />;
            if (item.key === 'pending') return <Section title="Pending Requests" items={grouped.pending} showCancel />;
            if (item.key === 'accepted') return <Section title="Accepted Requests" items={grouped.accepted} showCancel={false} />;
            return <Section title="Declined Requests" items={grouped.declined} showCancel={false} />;
          }}
          keyExtractor={(i) => i.key}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2774AE"]} tintColor="#2774AE" />}
        />
      </View>
    </SafeAreaView>
    </View>
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
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#DCE6F5', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  sectionCount: { fontSize: 13, fontWeight: '700', color: '#2774AE' },
  emptyText: { fontSize: 14, color: '#666' },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EDF2FA', gap: 12 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cityText: { fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1 },
  arrow: { fontSize: 16, fontWeight: '700', color: '#2774AE', flexShrink: 0 },
  driverMeta: { fontSize: 12, color: '#687076' },
  reqMsg: { fontSize: 12, color: '#687076', lineHeight: 16 },
  reqRight: { alignItems: 'flex-end', flexShrink: 0 },
  reqSeats: { fontSize: 14, fontWeight: '800', color: '#2774AE' },
  cancelBtn: { marginTop: 8, backgroundColor: '#EAF2FF', borderWidth: 1, borderColor: '#C9DEFF', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  cancelText: { color: '#2774AE', fontSize: 12, fontWeight: '700' },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDF2FA',
    gap: 12,
  },
  tripMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#687076',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tripActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatBtn: {
    padding: 8,
    backgroundColor: '#EAF2FF',
    borderRadius: 8,
  },
  // Pending Ratings styles
  pendingRatingsCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  pendingRatingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pendingRatingsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingRatingsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F57C00',
  },
  pendingRatingsBadge: {
    backgroundColor: '#FFB300',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  pendingRatingsBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pendingRatingsSubtitle: {
    fontSize: 13,
    color: '#F57C00',
    marginBottom: 12,
  },
  pendingRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#FFE082',
    gap: 12,
  },
  pendingRatingMeta: {
    fontSize: 12,
    color: '#F57C00',
    fontStyle: 'italic',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFB300',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rateBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  moreRatingsText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#F57C00',
    marginTop: 8,
    fontWeight: '600',
  },
});
