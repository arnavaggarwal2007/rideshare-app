import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PreferenceToggle = ({ label, value, onToggle }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[styles.toggle, value && styles.toggleActive]}
                onPress={onToggle}
                activeOpacity={0.7}
            >
                <View style={[styles.toggleCircle, value && styles.toggleCircleActive]} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
    },
    label: {
        fontFamily: 'Lato_400Regular',
        fontSize: 15,
        color: '#333',
        flex: 1,
    },
    toggle: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#DDD',
        padding: 2,
        justifyContent: 'center',
    },
    toggleActive: {
        backgroundColor: '#2774AE',
    },
    toggleCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    toggleCircleActive: {
        alignSelf: 'flex-end',
    },
});

export default PreferenceToggle;
