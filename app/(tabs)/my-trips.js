import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ThemedText } from '../../components/themed-text';
import { subscribeToRiderRequests } from '../../services/firebase/firestore';
import { cancelRequestThunk, setMyRequests } from '../../store/slices/requestsSlice';

export default function MyTripsScreen() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { myRequests, loading } = useSelector(state => state.requests);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      dispatch(setMyRequests([]));
      return;
    }

    // Subscribe to real-time updates for rider's requests
    const unsubscribe = subscribeToRiderRequests(user.uid, (requests) => {
      dispatch(setMyRequests(requests));
    });

    return () => unsubscribe();
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
    const name = location?.placeName || location?.address || '';
    if (!name) return '—';
    const parts = name.split(',');
    return parts[0].trim();
  };

  const onRefresh = () => {
    setRefreshing(true);
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
          const startCity = getCity(req.startLocation);
          const endCity = getCity(req.endLocation);
          return (
            <View key={`${req.id}-${req.status || 'pending'}`} style={styles.reqRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.routeHeader}>
                  <ThemedText style={styles.cityText}>{startCity}</ThemedText>
                  <ThemedText style={styles.arrow}>→</ThemedText>
                  <ThemedText style={styles.cityText}>{endCity}</ThemedText>
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

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: '#F7F9FB' }}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>My Trips</ThemedText>
        {loading ? <ActivityIndicator size="small" color="#2774AE" /> : null}
      </View>
      <View style={styles.container}>

        <FlatList
          data={[{ key: 'pending' }, { key: 'accepted' }, { key: 'declined' }]}
          renderItem={({ item }) => {
            if (item.key === 'pending') return <Section title="Pending Requests" items={grouped.pending} showCancel />;
            if (item.key === 'accepted') return <Section title="Accepted" items={grouped.accepted} showCancel={false} />;
            return <Section title="Declined" items={grouped.declined} showCancel={false} />;
          }}
          keyExtractor={(i) => i.key}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2774AE"]} tintColor="#2774AE" />}
        />
      </View>
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
});
