import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { Ionicons } from '@expo/vector-icons';
import { searchAddress } from '../services/maps/geocoding';
import * as Haptics from 'expo-haptics';

/**
 * LocationSearchInput - Reusable location search component
 * @param {string} label - Display label for the input
 * @param {string} placeholder - Placeholder text
 * @param {object} location - Selected location object
 * @param {function} onLocationSelect - Callback when location is selected
 * @param {string} iconColor - Color for the location icon
 * @param {boolean} required - Whether field is required
 * @param {string} placeholderColor - Color for placeholder text
 */
export default function LocationSearchInput({
  label,
  placeholder,
  location,
  onLocationSelect,
  iconColor = '#2774AE',
  required = false,
  placeholderColor = '#999',
}) {
  const [query, setQuery] = useState(location?.address || '');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    await Haptics.selectionAsync();
    setIsSearching(true);
    setError(null);
    setResults([]);
    try {
      const searchResults = await searchAddress(query);
      setResults(searchResults);
      if (searchResults.length === 0) {
        setError('No results found.');
      }
    } catch (err) {
      setError('Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (result) => {
    setQuery(result.address);
    setResults([]);
    setError(null);
    onLocationSelect(result);
  };

  // Update query when location prop changes externally
  React.useEffect(() => {
    if (location?.address && location.address !== query) {
      setQuery(location.address);
    }
  }, [location]);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={styles.labelIconRow}>
          <Ionicons name="location-outline" size={16} color={iconColor} style={{ marginRight: 6 }} />
          <ThemedText type="defaultSemiBold" style={styles.label}>{label}</ThemedText>
        </View>
        {required && <ThemedText style={styles.required}>*</ThemedText>}
      </View>
      
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder={placeholder}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          placeholderTextColor={placeholderColor}
          multiline
          numberOfLines={2}
        />
        <TouchableOpacity 
          style={styles.searchBtn} 
          onPress={handleSearch} 
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Ionicons name="search" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      {results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((result, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.dropdownItem}
              onPress={() => handleSelect(result)}
            >
              <Ionicons name="location" size={16} color={iconColor} style={{ marginRight: 8 }} />
              <Text style={styles.dropdownText} numberOfLines={2}>
                {result.address}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {location && (
        <ThemedText style={styles.selectedText}>✓ Selected</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  labelIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  required: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7F9FB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
    marginBottom: 8,
  },
  searchBtn: {
    backgroundColor: '#2774AE',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  selectedText: {
    color: '#2774AE',
    fontWeight: '600',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  error: {
    color: '#D32F2F',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
});
