import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ThemedText } from '../../components/themed-text';
import { subscribeToUserTrips } from '../../services/firebase/firestore';
import { setTrips } from '../../store/slices/tripsSlice';

// Status color scheme
function getStatusBadgeStyle(status) {
	switch (status?.toLowerCase()) {
		case 'confirmed':
			return { bgColor: '#E8F5E9', textColor: '#2E7D32', icon: 'checkmark-circle' };
		case 'in-progress':
			return { bgColor: '#E3F2FD', textColor: '#1565C0', icon: 'navigate' };
		case 'completed':
			return { bgColor: '#F3E5F5', textColor: '#6A1B9A', icon: 'checkmark-done' };
		case 'cancelled':
			return { bgColor: '#FFEBEE', textColor: '#D32F2F', icon: 'close-circle' };
		default:
			return { bgColor: '#F5F5F5', textColor: '#687076', icon: 'help-circle' };
	}
}

function getNextAction(trip, userId) {
	if (trip.driverId === userId) {
		// Driver actions
		if (trip.status === 'confirmed') return 'Start Trip';
		if (trip.status === 'in-progress') return 'Complete Trip';
	}
	// Rider just needs to wait/confirm
	if (trip.status === 'completed') return 'Rate Trip';
	return null;
}

export default function MyTripsScreen() {
	const dispatch = useDispatch();
	const user = useSelector(state => state.auth.user);
	const trips = useSelector(state => state.trips.trips);
	const loading = useSelector(state => state.trips.loading);
	const [refreshing, setRefreshing] = useState(false);
	const [fontsLoaded] = useFonts({
		Montserrat_700Bold,
		Lato_400Regular,
	});

	useEffect(() => {
		if (!user?.uid) {
			dispatch(setTrips([]));
			return;
		}

		// Subscribe to real-time updates for user's trips (as driver or rider)
		const unsubscribe = subscribeToUserTrips(user.uid, (updatedTrips) => {
			dispatch(setTrips(updatedTrips));
		});

		return () => unsubscribe();
	}, [dispatch, user?.uid]);

	const grouped = useMemo(() => {
		const confirmed = [];
		const inProgress = [];
		const completed = [];
		const cancelled = [];
		const seen = new Set();

		(trips || []).forEach(t => {
			if (!t?.id || seen.has(t.id)) return;
			seen.add(t.id);

			const status = (t.status || 'confirmed').toLowerCase();
			if (status === 'confirmed') confirmed.push(t);
			else if (status === 'in-progress') inProgress.push(t);
			else if (status === 'completed') completed.push(t);
			else if (status === 'cancelled') cancelled.push(t);
		});

		return { confirmed, inProgress, completed, cancelled };
	}, [trips]);

	const onRefresh = () => {
		setRefreshing(true);
		// Real-time subscription will automatically update
		setTimeout(() => setRefreshing(false), 500);
	};

	const handleTripPress = (tripId) => {
		Haptics.selectionAsync();
		router.push(`/trip/${tripId}`);
	};

	const getCity = (location) => {
		if (!location) return '—';
		const name = location?.placeName || location?.address || '';
		if (!name) return '—';
		const parts = name.split(',');
		// Show first two parts (e.g., '1003, Calboro Drive') for better context
		if (parts.length >= 2) {
			return `${parts[0].trim()}, ${parts[1].trim()}`;
		}
		return parts[0].trim();
	};

	const TripRow = ({ trip }) => {
		const isDriver = trip.driverId === user?.uid;
		const otherName = isDriver ? trip.riderName : trip.driverName;
		const startCity = getCity(trip.startLocation);
		const endCity = getCity(trip.endLocation);
		const statusStyle = getStatusBadgeStyle(trip.status);
		const nextAction = getNextAction(trip, user?.uid);

		return (
			<TouchableOpacity
				style={styles.tripRow}
				onPress={() => handleTripPress(trip.id)}
				activeOpacity={0.7}
			>
				{/* Top row - Route and Status */}
				<View style={styles.tripContent}>
					<View style={styles.topRow}>
						<View style={styles.routeHeader}>
							<ThemedText style={styles.cityText} numberOfLines={1}>{startCity}</ThemedText>
							<ThemedText style={styles.arrow}>→</ThemedText>
							<ThemedText style={styles.cityText} numberOfLines={1}>{endCity}</ThemedText>
						</View>
						<View style={[styles.statusBadge, { backgroundColor: statusStyle.bgColor }]}>
							<Ionicons name={statusStyle.icon} size={14} color={statusStyle.textColor} />
							<ThemedText style={[styles.statusText, { color: statusStyle.textColor }]}>
								{trip.status?.charAt(0).toUpperCase() + (trip.status?.slice(1) || '').replace('-', ' ')}
							</ThemedText>
						</View>
					</View>

					{/* Bottom row - Meta info and action */}
					<View style={styles.bottomRow}>
						<View style={styles.metaInfo}>
							<ThemedText style={styles.tripMeta}>
								{isDriver ? `Rider: ${otherName}` : `Driver: ${otherName}`}
							</ThemedText>
							<ThemedText style={styles.timeText}>
								{trip.departureDate} • {trip.departureTime}
							</ThemedText>
						</View>
						{nextAction && (
							<ThemedText style={styles.actionHint}>{nextAction}</ThemedText>
						)}
					</View>
				</View>
			</TouchableOpacity>
		);
	};

	const Section = ({ title, items, isEmpty }) => (
		<View style={styles.sectionCard}>
			<View style={styles.sectionHeader}>
				<ThemedText style={styles.sectionTitle}>{title}</ThemedText>
				<ThemedText style={styles.sectionCount}>{items.length}</ThemedText>
			</View>
			{items.length === 0 ? (
				<ThemedText style={styles.emptyText}>{isEmpty || 'None'}</ThemedText>
			) : (
				items.map((trip, idx) => (
					<View key={trip.id}>
						<TripRow trip={trip} />
						{idx < items.length - 1 && <View style={styles.divider} />}
					</View>
				))
			)}
		</View>
	);

	if (!fontsLoaded) return null;

	return (
		<SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
			<View style={styles.header}>
				<ThemedText style={styles.title}>My Trips</ThemedText>
				{loading ? <ActivityIndicator size="small" color="#2774AE" /> : null}
			</View>
			<View style={styles.container}>
				<FlatList
					data={[{ key: 'confirmed' }, { key: 'inProgress' }, { key: 'completed' }, { key: 'cancelled' }]}
					renderItem={({ item }) => {
						if (item.key === 'confirmed')
							return <Section title="Upcoming" items={grouped.confirmed} isEmpty="No upcoming trips" />;
						if (item.key === 'inProgress')
							return <Section title="In Progress" items={grouped.inProgress} isEmpty="No active trips" />;
						if (item.key === 'completed')
							return <Section title="Completed" items={grouped.completed} isEmpty="No completed trips" />;
						return <Section title="Cancelled" items={grouped.cancelled} isEmpty="No cancelled trips" />;
					}}
					keyExtractor={(i) => i.key}
					contentContainerStyle={styles.contentContainer}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							colors={['#2774AE']}
							tintColor="#2774AE"
						/>
					}
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
	title: {
		fontSize: 28,
		fontWeight: '800',
		fontFamily: 'Montserrat_700Bold',
		color: '#1A1A1A',
		lineHeight: 34,
	},
	contentContainer: { padding: 16, paddingBottom: 110 },
	sectionCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#DCE6F5',
		marginBottom: 12,
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 4,
		elevation: 1,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1A1A1A',
	},
	sectionCount: {
		fontSize: 13,
		fontWeight: '700',
		color: '#2774AE',
	},
	emptyText: {
		fontSize: 14,
		color: '#666',
		paddingVertical: 8,
	},
	tripRow: {
		paddingVertical: 12,
	},
	tripContent: {
		gap: 8,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	bottomRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'space-between',
	},
	metaInfo: {
		gap: 2,
	},
	routeHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flex: 1,
		flexShrink: 1,
	},
	cityText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
		flexShrink: 1,
	},
	arrow: {
		fontSize: 16,
		fontWeight: '700',
		color: '#2774AE',
	},
	tripMeta: {
		fontSize: 12,
		color: '#687076',
	},
	timeText: {
		fontSize: 12,
		color: '#687076',
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 12,
		flexShrink: 0,
	},
	statusText: {
		fontSize: 12,
		fontWeight: '700',
	},
	actionHint: {
		fontSize: 11,
		color: '#2774AE',
		fontWeight: '600',
	},
	divider: {
		height: 1,
		backgroundColor: '#F0F3F6',
		marginVertical: 0,
	},
});
