import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { subscribeToUserRides } from '../../services/firebase/firestore';
import { deleteRideThunk, setMyRides } from '../../store/slices/ridesSlice';
import { router } from 'expo-router';
import { ThemedText } from '../../components/themed-text';
import { useThemeColor } from '../../hooks/use-theme-color';

export default function MyRidesScreen() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { myRides, loading: reduxLoading, error: reduxError } = useSelector(state => state.rides);
  
  const [localLoading, setLocalLoading] = useState(true);
  const [nowTick, setNowTick] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
      <View style={styles.container}>
        <ThemedText type="title" style={styles.title}>My Rides</ThemedText>
        <View style={styles.topActionsRow}>
          <TouchableOpacity onPress={() => router.push('/ride/create')}>
            <ThemedText style={styles.addBtn}>+ Add Ride</ThemedText>
          </TouchableOpacity>
        </View>
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
            data={myRides.filter(r => r && r.id)}
            keyExtractor={(item, index) => item.id || `ride-${index}`}
            renderItem={({ item }) => {
              const s = getDisplayStatus(item);
              const totalRevenue = (Number(item.totalSeats || 0) * Number(item.pricePerSeat || 0)).toFixed(2);
              return (
                <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/ride/${item.id}`)}>
                  <View style={styles.rideCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.headerTopRow}>
                        <ThemedText style={styles.cityText}>{getCity(item.startLocation)}</ThemedText>
                        <ThemedText style={styles.arrow}>→</ThemedText>
                        <ThemedText style={styles.cityText}>{getCity(item.endLocation)}</ThemedText>
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
                    <View style={styles.sectionRow}><ThemedText style={styles.sectionLabel}>MAX DETOUR</ThemedText><ThemedText style={styles.sectionValue}>{Number(item.maxDetourMinutes || 0)} min</ThemedText></View>
                    <View style={styles.sectionRow}><ThemedText style={styles.sectionLabel}>TOTAL REVENUE</ThemedText><ThemedText style={styles.sectionValueBlue}>${totalRevenue}</ThemedText></View>

                    {item.description ? (
                      <View style={styles.descriptionBox}>
                        <ThemedText style={styles.descriptionLabel}>DESCRIPTION</ThemedText>
                        <ThemedText style={styles.descriptionText}>{item.description}</ThemedText>
                      </View>
                    ) : null}

                    <View style={styles.bottomButtons}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/ride/edit', params: { id: item.id } })}>
                        <Text style={styles.bottomBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteRide(item.id)}>
                        <Text style={styles.bottomBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2774AE"]} tintColor="#2774AE"/>}
        />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FB',
    padding: 20,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#C9DEFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    backgroundColor: '#EAF2FF',
    borderRadius: 10,
    paddingVertical: 10,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2774AE',
    marginBottom: 20,
    textAlign: 'center',
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
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
    fontWeight: 'bold',
    fontSize: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
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
});
