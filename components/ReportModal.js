/**
 * ReportModal Component
 * Modal for reporting users with reason selection and description
 */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { REPORT_REASON_LABELS, REPORT_REASONS } from '../services/firebase/reports';

/**
 * ReportModal - Modal for reporting a user
 * @param {Object} props
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} props.onSubmit - Callback when report is submitted (reason, description) => void
 * @param {string} props.reportedUserName - Name of the user being reported
 * @param {boolean} props.submitting - Whether submission is in progress
 * @param {string} props.error - Error message to display
 */
export default function ReportModal({
	visible,
	onClose,
	onSubmit,
	reportedUserName = 'this user',
	submitting = false,
	error = null,
}) {
	const [selectedReason, setSelectedReason] = useState(null);
	const [description, setDescription] = useState('');

	const handleSubmit = () => {
		if (!selectedReason) return;
		onSubmit(selectedReason, description);
	};

	const handleClose = () => {
		// Reset state when closing
		setSelectedReason(null);
		setDescription('');
		onClose();
	};

	const isSubmitDisabled = !selectedReason || submitting;

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={handleClose}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.container}
			>
				{/* Header */}
				<View style={styles.header}>
					<Pressable
						onPress={handleClose}
						style={styles.closeButton}
						accessibilityLabel="Close"
						accessibilityRole="button"
					>
						<Ionicons name="close" size={28} color="#333" />
					</Pressable>
					<Text style={styles.headerTitle}>Report User</Text>
					<View style={styles.headerSpacer} />
				</View>

				<ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
					{/* Info Text */}
					<Text style={styles.infoText}>
						You are reporting <Text style={styles.userName}>{reportedUserName}</Text>.
						Please select a reason and provide any additional details.
					</Text>

					{/* Error Message */}
					{error && (
						<View style={styles.errorContainer}>
							<Ionicons name="alert-circle" size={20} color="#D32F2F" />
							<Text style={styles.errorText}>{error}</Text>
						</View>
					)}

					{/* Reason Selection */}
					<Text style={styles.sectionTitle}>Reason for Report</Text>
					<View style={styles.reasonsContainer}>
						{REPORT_REASONS.map((reason) => (
							<Pressable
								key={reason}
								style={[
									styles.reasonOption,
									selectedReason === reason && styles.reasonOptionSelected,
								]}
								onPress={() => setSelectedReason(reason)}
								accessibilityRole="radio"
								accessibilityState={{ checked: selectedReason === reason }}
								accessibilityLabel={REPORT_REASON_LABELS[reason]}
							>
								<View style={styles.radioOuter}>
									{selectedReason === reason && <View style={styles.radioInner} />}
								</View>
								<Text
									style={[
										styles.reasonText,
										selectedReason === reason && styles.reasonTextSelected,
									]}
								>
									{REPORT_REASON_LABELS[reason]}
								</Text>
							</Pressable>
						))}
					</View>

					{/* Description Input */}
					<Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
					<TextInput
						style={styles.descriptionInput}
						value={description}
						onChangeText={setDescription}
						placeholder="Please provide any additional information that may help us review this report..."
						placeholderTextColor="#999"
						multiline
						numberOfLines={4}
						textAlignVertical="top"
						maxLength={500}
						accessibilityLabel="Additional details"
					/>
					<Text style={styles.characterCount}>{description.length}/500</Text>
				</ScrollView>

				{/* Footer with Buttons */}
				<View style={styles.footer}>
					<Pressable
						style={styles.cancelButton}
						onPress={handleClose}
						accessibilityRole="button"
						accessibilityLabel="Cancel"
					>
						<Text style={styles.cancelButtonText}>Cancel</Text>
					</Pressable>
					<Pressable
						style={[
							styles.submitButton,
							isSubmitDisabled && styles.submitButtonDisabled,
						]}
						onPress={handleSubmit}
						disabled={isSubmitDisabled}
						accessibilityRole="button"
						accessibilityLabel="Submit report"
						accessibilityState={{ disabled: isSubmitDisabled }}
					>
						{submitting ? (
							<ActivityIndicator color="#fff" size="small" />
						) : (
							<Text style={styles.submitButtonText}>Submit Report</Text>
						)}
					</Pressable>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
	},
	closeButton: {
		padding: 4,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	headerSpacer: {
		width: 36,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: 20,
	},
	infoText: {
		fontSize: 15,
		color: '#666',
		lineHeight: 22,
		marginBottom: 20,
	},
	userName: {
		fontWeight: '600',
		color: '#333',
	},
	errorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFEBEE',
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
	},
	errorText: {
		color: '#D32F2F',
		fontSize: 14,
		marginLeft: 8,
		flex: 1,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 12,
	},
	reasonsContainer: {
		marginBottom: 24,
	},
	reasonOption: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderRadius: 8,
		marginBottom: 8,
		backgroundColor: '#F5F5F5',
	},
	reasonOptionSelected: {
		backgroundColor: '#E3F2FD',
		borderWidth: 1,
		borderColor: '#1976D2',
	},
	radioOuter: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#757575',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	radioInner: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#1976D2',
	},
	reasonText: {
		fontSize: 15,
		color: '#333',
	},
	reasonTextSelected: {
		fontWeight: '500',
		color: '#1976D2',
	},
	descriptionInput: {
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 8,
		padding: 12,
		fontSize: 15,
		color: '#333',
		minHeight: 100,
		backgroundColor: '#FAFAFA',
	},
	characterCount: {
		fontSize: 12,
		color: '#999',
		textAlign: 'right',
		marginTop: 4,
	},
	footer: {
		flexDirection: 'row',
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: '#E0E0E0',
		gap: 12,
	},
	cancelButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 8,
		backgroundColor: '#F5F5F5',
		alignItems: 'center',
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#666',
	},
	submitButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 8,
		backgroundColor: '#D32F2F',
		alignItems: 'center',
	},
	submitButtonDisabled: {
		backgroundColor: '#BDBDBD',
	},
	submitButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#fff',
	},
});
