import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const CustomDropdown = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select an option',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (selectedValue) => {
    onSelect(selectedValue);
    setIsOpen(false);
  };

  const renderOption = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        value === item && styles.optionItemSelected,
      ]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.optionText,
          value === item && styles.optionTextSelected,
        ]}
      >
        {item}
      </Text>
      {value === item && (
        <Ionicons name="checkmark" size={20} color="#2774AE" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {/* Dropdown Button */}
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dropdownButtonText,
            value === placeholder || !value
              ? styles.placeholderText
              : styles.selectedText,
          ]}
        >
          {value || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color="#3C4F5A"
          style={{ marginLeft: 'auto' }}
        />
      </TouchableOpacity>

      {/* Modal for Options */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Select'}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              renderItem={renderOption}
              keyExtractor={(item, index) => `${item}-${index}`}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    fontFamily: 'Montserrat_600SemiBold',
  },
  required: {
    color: '#FF0000',
    fontWeight: '600',
  },
  dropdownButton: {
    backgroundColor: '#F7F9FB',
    borderWidth: 1,
    borderColor: '#E0E3E7',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonText: {
    fontSize: 16,
    flex: 1,
  },
  selectedText: {
    color: '#1A1A1A',
    fontFamily: 'Lato_400Regular',
  },
  placeholderText: {
    color: '#7A8D99',
    fontFamily: 'Lato_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E3E7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'Montserrat_600SemiBold',
  },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F7F9FB',
  },
  optionItemSelected: {
    backgroundColor: '#F7F9FB',
  },
  optionText: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
    fontFamily: 'Lato_400Regular',
  },
  optionTextSelected: {
    color: '#2774AE',
    fontWeight: '600',
  },
});

export default CustomDropdown;
