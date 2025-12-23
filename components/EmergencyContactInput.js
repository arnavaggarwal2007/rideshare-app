import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CustomDropdown from './CustomDropdown';

const EmergencyContactInput = ({ contact, index, onUpdate, onRemove }) => {
    const relationshipOptions = [
        'Parent',
        'Sibling',
        'Spouse',
        'Partner',
        'Friend',
        'Roommate',
        'Other Family',
        'Other',
    ];

    return (
        <View style={styles.contactContainer}>
            <View style={styles.headerRow}>
                <Text style={styles.contactTitle}>Contact {index + 1}</Text>
                <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Contact name"
                    placeholderTextColor="#7A8D99"
                    value={contact.name}
                    onChangeText={(text) => onUpdate(index, 'name', text)}
                    autoCapitalize="words"
                    autoCorrect={false}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    placeholder="(123) 456-7890"
                    placeholderTextColor="#7A8D99"
                    value={contact.phone}
                    onChangeText={(text) => onUpdate(index, 'phone', text)}
                    keyboardType="phone-pad"
                    autoCorrect={false}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Relationship</Text>
                <CustomDropdown
                    options={relationshipOptions}
                    value={contact.relationship}
                    onSelect={(value) => onUpdate(index, 'relationship', value)}
                    placeholder="Select relationship"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    contactContainer: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    contactTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
        color: '#2774AE',
    },
    removeButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    removeButtonText: {
        fontFamily: 'Lato_400Regular',
        fontSize: 14,
        color: '#FF6B6B',
    },
    inputGroup: {
        marginBottom: 12,
    },
    label: {
        fontFamily: 'Lato_700Bold',
        fontSize: 14,
        color: '#333',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontFamily: 'Lato_400Regular',
        fontSize: 15,
        color: '#333',
    },
});

export default EmergencyContactInput;
