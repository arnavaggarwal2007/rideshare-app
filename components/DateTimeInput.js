import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { Ionicons } from '@expo/vector-icons';

/**
 * DateTimeInput - Reusable date and time input with auto-formatting
 * @param {string} type - 'date' or 'time'
 * @param {string} label - Display label
 * @param {string} value - Current value
 * @param {function} onChange - Callback when value changes
 * @param {boolean} required - Whether field is required
 * @param {string} placeholderColor - Color for placeholder text
 */
export default function DateTimeInput({
  type = 'date',
  label,
  value,
  onChange,
  required = false,
  placeholderColor = '#999',
}) {
  const handleChange = (text) => {
    if (type === 'date') {
      // Auto-format date: YYYY-MM-DD with validation
      let cleaned = text.replace(/[^0-9]/g, '');
      if (cleaned.length >= 4) cleaned = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
      if (cleaned.length >= 7) cleaned = cleaned.slice(0, 7) + '-' + cleaned.slice(7, 9);
      
      // Validate month and day if complete
      if (cleaned.length === 10) {
        const [year, month, day] = cleaned.split('-').map(Number);
        if (month > 12) cleaned = cleaned.slice(0, 5) + '12' + cleaned.slice(7);
        if (day > 31) cleaned = cleaned.slice(0, 8) + '31';
      }
      onChange(cleaned);
    } else if (type === 'time') {
      // Auto-format time: HH:mm with validation
      let cleaned = text.replace(/[^0-9]/g, '');
      if (cleaned.length >= 2) cleaned = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
      
      // Validate hour and minute if complete
      if (cleaned.length === 5) {
        const [hour, minute] = cleaned.split(':').map(Number);
        if (hour > 23) cleaned = '23' + cleaned.slice(2);
        if (minute > 59) cleaned = cleaned.slice(0, 3) + '59';
      }
      onChange(cleaned);
    }
  };

  const iconName = type === 'date' ? 'calendar-outline' : 'time-outline';
  const placeholder = type === 'date' ? 'YYYY-MM-DD' : 'HH:mm';
  const maxLength = type === 'date' ? 10 : 5;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons name={iconName} size={16} color="#2774AE" style={{ marginRight: 4 }} />
        <ThemedText type="defaultSemiBold" style={styles.label}>{label}</ThemedText>
        {required && <ThemedText style={styles.required}>*</ThemedText>}
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={handleChange}
        placeholderTextColor={placeholderColor}
        maxLength={maxLength}
        keyboardType="numeric"
      />
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
});
