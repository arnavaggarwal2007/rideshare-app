import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import DateTimeInput from '../../components/DateTimeInput';
import { clearFilters, fetchFeedPage, refreshFeed, setFilters } from '../../store/slices/feedSlice';

export default function HomeScreen() {
  const dispatch = useDispatch();
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });

  const { items, loading, refreshing, error, hasMore, filters } = useSelector(state => state.feed);
  const [showFilters, setShowFilters] = useState(false);
  const [searchStartLocation, setSearchStartLocation] = useState('');
  const [searchEndLocation, setSearchEndLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minSeats, setMinSeats] = useState('');
  const searchStartTimeout = useRef(null);
  const searchEndTimeout = useRef(null);

  useEffect(() => {
    // Load initial feed on mount
    dispatch(fetchFeedPage({ isInitial: true }));
  }, [dispatch]);

  // Debounced search for start location
  useEffect(() => {
    if (searchStartTimeout.current) {
      clearTimeout(searchStartTimeout.current);
    }

    searchStartTimeout.current = setTimeout(() => {
      if (searchStartLocation !== filters.startLocationKeyword) {
        dispatch(setFilters({ startLocationKeyword: searchStartLocation }));
        dispatch(fetchFeedPage({ isInitial: true }));
      }
    }, 500);

    return () => {
      if (searchStartTimeout.current) {
        clearTimeout(searchStartTimeout.current);
      }
    };
  }, [searchStartLocation, dispatch, filters.startLocationKeyword]);

  // Debounced search for end location
  useEffect(() => {
    if (searchEndTimeout.current) {
      clearTimeout(searchEndTimeout.current);
    }

    searchEndTimeout.current = setTimeout(() => {
      if (searchEndLocation !== filters.endLocationKeyword) {
        dispatch(setFilters({ endLocationKeyword: searchEndLocation }));
        dispatch(fetchFeedPage({ isInitial: true }));
      }
    }, 500);

    return () => {
      if (searchEndTimeout.current) {
        clearTimeout(searchEndTimeout.current);
      }
    };
  }, [searchEndLocation, dispatch, filters.endLocationKeyword]);

  if (!fontsLoaded) return null;

  const handleRefresh = () => {
    dispatch(refreshFeed());
  };

  const handleApplyFilters = () => {
    const filterUpdates = {};
    
    if (startDate) {
      filterUpdates.startDate = new Date(startDate);
    }
    if (endDate) {
      filterUpdates.endDate = new Date(endDate);
    }
    if (maxPrice) {
      filterUpdates.maxPrice = parseFloat(maxPrice);
    }
    if (minSeats) {
      filterUpdates.minSeats = parseInt(minSeats, 10);
    }

    dispatch(setFilters(filterUpdates));
    dispatch(fetchFeedPage({ isInitial: true }));
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setSearchStartLocation('');
    setSearchEndLocation('');
    setStartDate('');
    setEndDate('');
    setMaxPrice('');
    setMinSeats('');
    dispatch(clearFilters());
    dispatch(fetchFeedPage({ isInitial: true }));
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.startLocationKeyword) count++;
    if (filters.endLocationKeyword) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.maxPrice) count++;
    if (filters.minSeats) count++;
    return count;
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      dispatch(fetchFeedPage({ isInitial: false }));
    }
  };

  const handleRetry = () => {
    dispatch(fetchFeedPage({ isInitial: true }));
  };

  const handleRidePress = (rideId) => {
    router.push(`/ride/${rideId}`);
  };

  const renderSkeletonItem = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.rideHeader}>
        <View style={styles.driverInfo}>
          <View style={[styles.avatarPlaceholder, styles.skeleton]} />
          <View style={{ flex: 1 }}>
            <View style={[styles.skeletonText, { width: '40%', marginBottom: 6 }]} />
            <View style={[styles.skeletonText, { width: '60%' }]} />
          </View>
        </View>
        <View style={styles.priceContainer}>
          <View style={[styles.skeletonText, { width: 50, marginBottom: 4 }]} />
          <View style={[styles.skeletonText, { width: 50 }]} />
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routeRow}>
          <View style={[styles.skeletonIcon]} />
          <View style={[styles.skeletonText, { flex: 1, marginLeft: 8 }]} />
        </View>
        <View style={styles.routeDivider} />
        <View style={styles.routeRow}>
          <View style={[styles.skeletonIcon]} />
          <View style={[styles.skeletonText, { flex: 1, marginLeft: 8 }]} />
        </View>
      </View>

      <View style={styles.rideFooter}>
        <View style={[styles.skeletonText, { width: '35%' }]} />
      </View>
    </View>
  );

  const renderRideItem = ({ item }) => {
    const departureDate = item.departureTimestamp?.toDate ? item.departureTimestamp.toDate() : new Date(item.departureTimestamp);
    const formattedDate = departureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = departureDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Check if ride is departing soon (within 24 hours)
    const now = new Date();
    const hoursUntilDeparture = (departureDate - now) / (1000 * 60 * 60);
    const isDepartingSoon = hoursUntilDeparture > 0 && hoursUntilDeparture <= 24;

    const accessibilityLabel = `Ride from ${item.startLocation?.address || 'start location'} to ${item.endLocation?.address || 'destination'}, departing ${formattedDate} at ${formattedTime}, ${item.availableSeats} seats available, $${item.pricePerSeat} per seat, driver ${item.driverName || 'Unknown'}${isDepartingSoon ? ', departing soon' : ''}`;

    return (
      <TouchableOpacity
        style={styles.rideCard}
        onPress={() => handleRidePress(item.id)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Tap to view ride details"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isDepartingSoon && (
          <View style={styles.departingSoonBadge}>
            <Ionicons name="time-outline" size={14} color="#FFFFFF" />
            <Text style={styles.departingSoonText}>Departing Soon</Text>
          </View>
        )}

        <View style={styles.rideHeader}>
          <View style={styles.driverInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.driverName?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            </View>
            <View>
              <Text style={styles.driverName}>{item.driverName || 'Driver'}</Text>
              <Text style={styles.rideDate}>{formattedDate} • {formattedTime}</Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${item.pricePerSeat}</Text>
            <Text style={styles.perSeat}>per seat</Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.routeRow}>
            <Ionicons name="location" size={18} color="#2774AE" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.startLocation?.address || 'Start location'}
            </Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <Ionicons name="location" size={18} color="#D32F2F" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.endLocation?.address || 'Destination'}
            </Text>
          </View>
        </View>

        <View style={styles.rideFooter}>
          <View style={styles.seatsInfo}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.seatsText}>{item.availableSeats} seats available</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading && items.length === 0) {
      // Show skeleton items during initial load
      return (
        <>
          {[1, 2, 3].map((key) => (
            <View key={key}>{renderSkeletonItem()}</View>
          ))}
        </>
      );
    }

    const hasActiveFilters = getActiveFiltersCount() > 0;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="car-outline" size={64} color="#999" />
        <Text style={styles.emptyTitle}>
          {hasActiveFilters ? 'No Rides Match Your Filters' : 'No Rides Available'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {hasActiveFilters 
            ? 'Try adjusting your filters to see more results' 
            : 'Check back later or create your own ride!'}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity 
            style={styles.clearFiltersButton}
            onPress={handleClearFilters}
          >
            <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderErrorState = () => {
    if (!error) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading || items.length === 0) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#2774AE" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FB" />
      
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Available Rides</Text>
            <Text style={styles.subtitle}>Find your next trip</Text>
          </View>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options-outline" size={24} color="#2774AE" />
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar - Start Location */}
        <View style={styles.searchContainer}>
          <Ionicons name="location-outline" size={20} color="#2774AE" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="From (start location)..."
            placeholderTextColor="#999"
            value={searchStartLocation}
            onChangeText={setSearchStartLocation}
          />
          {searchStartLocation.length > 0 && (
            <TouchableOpacity onPress={() => setSearchStartLocation('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar - End Location */}
        <View style={styles.searchContainer}>
          <Ionicons name="location-outline" size={20} color="#FF6B6B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="To (destination)..."
            placeholderTextColor="#999"
            value={searchEndLocation}
            onChangeText={setSearchEndLocation}
          />
          {searchEndLocation.length > 0 && (
            <TouchableOpacity onPress={() => setSearchEndLocation('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Panel */}
        {showFilters && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterPanelTitle}>Filters</Text>
            
            <View style={styles.filterRow}>
              <View style={styles.filterInputHalf}>
                <DateTimeInput
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  placeholderColor="#999"
                />
              </View>
              <View style={styles.filterInputHalf}>
                <DateTimeInput
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  placeholderColor="#999"
                />
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterInputHalf}>
                <Text style={styles.filterLabel}>Max Price ($)</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Any"
                  placeholderTextColor="#999"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.filterInputHalf}>
                <Text style={styles.filterLabel}>Min Seats</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Any"
                  placeholderTextColor="#999"
                  value={minSeats}
                  onChangeText={setMinSeats}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={handleClearFilters}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={handleApplyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {error && items.length === 0 ? (
        renderErrorState()
      ) : (
        <FlatList
          data={items}
          renderItem={renderRideItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            items.length === 0 && styles.listContainerEmpty
          ]}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2774AE"
              colors={['#2774AE']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E3E7',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  filterButton: {
    padding: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#1A1A1A',
  },
  filterPanel: {
    backgroundColor: '#F7F9FB',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  filterPanelTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterInputHalf: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  filterInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E3E7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#1A1A1A',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E3E7',
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#2774AE',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#666',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  listContainerEmpty: {
    flexGrow: 1,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: 'relative',
  },
  departingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF9500',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  departingSoonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2774AE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
  },
  driverName: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  rideDate: {
    fontSize: 13,
    fontFamily: 'Lato_400Regular',
    color: '#666',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: '#2774AE',
  },
  perSeat: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: '#666',
  },
  routeContainer: {
    backgroundColor: '#F7F9FB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeDivider: {
    height: 20,
    width: 2,
    backgroundColor: '#E0E3E7',
    marginLeft: 8,
    marginVertical: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#1A1A1A',
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seatsText: {
    fontSize: 13,
    fontFamily: 'Lato_400Regular',
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#666',
    textAlign: 'center',
  },
  clearFiltersButton: {
    backgroundColor: '#2774AE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  clearFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2774AE',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  skeleton: {
    backgroundColor: '#E0E3E7',
  },
  skeletonText: {
    height: 14,
    backgroundColor: '#E0E3E7',
    borderRadius: 4,
  },
  skeletonIcon: {
    width: 18,
    height: 18,
    backgroundColor: '#E0E3E7',
    borderRadius: 9,
  },
});
