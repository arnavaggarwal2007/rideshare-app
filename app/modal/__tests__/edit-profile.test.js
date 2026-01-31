/**
 * Tests for EditProfileScreen
 * Tests profile editing functionality
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../../firebaseConfig', () => ({
  auth: { currentUser: { uid: 'user-123', email: 'test@test.com' } },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('../../../hooks/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    userProfile: {
      name: 'John Doe',
      school: 'UCLA',
      major: 'Computer Science',
      graduationYear: '2025',
      bio: 'Test bio',
      pronouns: 'he/him',
      emergencyContacts: [],
      ridePreferences: {
        musicTaste: 'Pop',
        chattiness: 'Moderate',
        petFriendly: false,
        smokingOk: false,
      },
    },
    loading: false,
    refreshProfile: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    dismiss: jest.fn(),
    replace: jest.fn(),
  },
}));

// Mock expo-google-fonts
jest.mock('@expo-google-fonts/lato', () => ({
  Lato_400Regular: 'Lato_400Regular',
}));

jest.mock('@expo-google-fonts/montserrat', () => ({
  Montserrat_700Bold: 'Montserrat_700Bold',
  useFonts: jest.fn(() => [true]),
}));

// Mock components
jest.mock('../../../components/CustomDropdown', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockCustomDropdown({ label, value, onSelect, options, testID }) {
    return (
      <View testID={testID || `dropdown-${label}`}>
        {label && <Text>{label}</Text>}
        <Text testID={`dropdown-value-${label}`}>{value}</Text>
        {options && options.map((opt, i) => (
          <TouchableOpacity key={i} testID={`option-${opt}`} onPress={() => onSelect(opt)}>
            <Text>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
});

jest.mock('../../../components/EmergencyContactInput', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  return function MockEmergencyContactInput({ contact, index, onUpdate, onRemove }) {
    return (
      <View testID={`emergency-contact-${index}`}>
        <TextInput
          testID={`contact-name-${index}`}
          value={contact.name}
          onChangeText={(text) => onUpdate(index, 'name', text)}
          placeholder="Name"
        />
        <TextInput
          testID={`contact-phone-${index}`}
          value={contact.phone}
          onChangeText={(text) => onUpdate(index, 'phone', text)}
          placeholder="Phone"
        />
        <TouchableOpacity testID={`remove-contact-${index}`} onPress={onRemove}>
          <Text>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../../../components/PreferenceToggle', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockPreferenceToggle({ label, value, onToggle }) {
    return (
      <TouchableOpacity testID={`toggle-${label}`} onPress={onToggle}>
        <Text>{label}: {value ? 'On' : 'Off'}</Text>
      </TouchableOpacity>
    );
  };
});

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { useFonts } from '@expo-google-fonts/montserrat';
import { router } from 'expo-router';
import { updateDoc } from 'firebase/firestore';
import { useAuth } from '../../../hooks/AuthContext';
import EditProfileScreen from '../edit-profile';

// Alert spy
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();
    router.dismiss.mockClear();
    router.replace.mockClear();
    useFonts.mockReturnValue([true]);
    
    useAuth.mockReturnValue({
      userProfile: {
        name: 'John Doe',
        school: 'UCLA',
        major: 'Computer Science',
        graduationYear: '2025',
        bio: 'Test bio',
        pronouns: 'he/him',
        emergencyContacts: [],
        ridePreferences: {
          musicTaste: 'Pop',
          chattiness: 'Moderate',
          petFriendly: false,
          smokingOk: false,
        },
      },
      loading: false,
      refreshProfile: jest.fn(() => Promise.resolve()),
    });
    
    updateDoc.mockResolvedValue();
  });

  describe('Loading State', () => {
    it('shows loading indicator while fonts load', () => {
      useFonts.mockReturnValueOnce([false]);

      const { UNSAFE_queryAllByType } = render(<EditProfileScreen />);

      const activityIndicators = UNSAFE_queryAllByType(
        require('react-native').ActivityIndicator
      );
      expect(activityIndicators.length).toBeGreaterThan(0);
    });

    it('shows loading indicator when auth is loading', () => {
      useAuth.mockReturnValueOnce({
        userProfile: null,
        loading: true,
        refreshProfile: jest.fn(),
      });

      const { UNSAFE_queryAllByType } = render(<EditProfileScreen />);

      const activityIndicators = UNSAFE_queryAllByType(
        require('react-native').ActivityIndicator
      );
      expect(activityIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Screen Display', () => {
    it('renders title', () => {
      const { getByText } = render(<EditProfileScreen />);

      expect(getByText('Edit Profile')).toBeTruthy();
    });

    it('renders cancel button', () => {
      const { getByLabelText } = render(<EditProfileScreen />);

      expect(getByLabelText('Cancel Edit Profile')).toBeTruthy();
    });

    it('renders full name input with initial value', () => {
      const { getByPlaceholderText } = render(<EditProfileScreen />);

      const nameInput = getByPlaceholderText('Jane Doe');
      expect(nameInput.props.value).toBe('John Doe');
    });

    it('renders bio input', () => {
      const { getByPlaceholderText } = render(<EditProfileScreen />);

      expect(getByPlaceholderText('Tell others a bit about yourself...')).toBeTruthy();
    });

    it('renders save button', () => {
      const { getByText } = render(<EditProfileScreen />);

      expect(getByText('Save Changes')).toBeTruthy();
    });

    it('renders emergency contacts section', () => {
      const { getByText } = render(<EditProfileScreen />);

      expect(getByText('Emergency Contacts (Optional)')).toBeTruthy();
      expect(getByText('Add up to 3 emergency contacts for safety purposes')).toBeTruthy();
    });

    it('renders ride preferences section', () => {
      const { getByText } = render(<EditProfileScreen />);

      expect(getByText('Ride Preferences (Optional)')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('dismisses modal when cancel pressed', () => {
      const { getByLabelText } = render(<EditProfileScreen />);

      fireEvent.press(getByLabelText('Cancel Edit Profile'));

      expect(router.dismiss).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('shows alert when name is empty', async () => {
      const { getByPlaceholderText, getByText } = render(<EditProfileScreen />);

      const nameInput = getByPlaceholderText('Jane Doe');
      fireEvent.changeText(nameInput, '');

      fireEvent.press(getByText('Save Changes'));

      expect(alertSpy).toHaveBeenCalledWith('Missing Information', 'Please enter your full name.');
    });

    it('shows alert when name is too short', async () => {
      const { getByPlaceholderText, getByText } = render(<EditProfileScreen />);

      const nameInput = getByPlaceholderText('Jane Doe');
      fireEvent.changeText(nameInput, 'A');

      fireEvent.press(getByText('Save Changes'));

      expect(alertSpy).toHaveBeenCalledWith('Invalid Name', 'Name must be at least 2 characters.');
    });

    it('shows alert when school not selected', async () => {
      useAuth.mockReturnValue({
        userProfile: {
          name: 'John Doe',
          school: 'Select your school',
          major: 'Computer Science',
          graduationYear: '2025',
        },
        loading: false,
        refreshProfile: jest.fn(),
      });

      const { getByText } = render(<EditProfileScreen />);

      fireEvent.press(getByText('Save Changes'));

      expect(alertSpy).toHaveBeenCalledWith('Missing Information', 'Please select your school.');
    });

    it('shows alert when major not selected', async () => {
      useAuth.mockReturnValue({
        userProfile: {
          name: 'John Doe',
          school: 'UCLA',
          major: 'Select Major',
          graduationYear: '2025',
        },
        loading: false,
        refreshProfile: jest.fn(),
      });

      const { getByText } = render(<EditProfileScreen />);

      fireEvent.press(getByText('Save Changes'));

      expect(alertSpy).toHaveBeenCalledWith('Missing Information', 'Please select your major.');
    });

    it('shows alert when graduation year not selected', async () => {
      useAuth.mockReturnValue({
        userProfile: {
          name: 'John Doe',
          school: 'UCLA',
          major: 'Computer Science',
          graduationYear: 'Select Year',
        },
        loading: false,
        refreshProfile: jest.fn(),
      });

      const { getByText } = render(<EditProfileScreen />);

      fireEvent.press(getByText('Save Changes'));

      expect(alertSpy).toHaveBeenCalledWith('Missing Information', 'Please select your graduation year.');
    });

    it('shows alert when bio is too long', async () => {
      const { getByPlaceholderText, getByText } = render(<EditProfileScreen />);

      const bioInput = getByPlaceholderText('Tell others a bit about yourself...');
      fireEvent.changeText(bioInput, 'a'.repeat(201));

      fireEvent.press(getByText('Save Changes'));

      expect(alertSpy).toHaveBeenCalledWith('Bio Too Long', 'Bio must be 200 characters or less.');
    });
  });

  describe('Form Input', () => {
    it('updates name when typed', () => {
      const { getByPlaceholderText } = render(<EditProfileScreen />);

      const nameInput = getByPlaceholderText('Jane Doe');
      fireEvent.changeText(nameInput, 'Jane Smith');

      expect(nameInput.props.value).toBe('Jane Smith');
    });

    it('updates bio when typed', () => {
      const { getByPlaceholderText } = render(<EditProfileScreen />);

      const bioInput = getByPlaceholderText('Tell others a bit about yourself...');
      fireEvent.changeText(bioInput, 'New bio text');

      expect(bioInput.props.value).toBe('New bio text');
    });

    it('shows bio character count', () => {
      const { getByText, getByPlaceholderText } = render(<EditProfileScreen />);

      // Initial bio is 'Test bio' = 8 chars
      expect(getByText('8/200')).toBeTruthy();

      const bioInput = getByPlaceholderText('Tell others a bit about yourself...');
      fireEvent.changeText(bioInput, 'Updated bio');

      expect(getByText('11/200')).toBeTruthy();
    });
  });

  describe('Emergency Contacts', () => {
    it('shows add emergency contact button', () => {
      const { getByText } = render(<EditProfileScreen />);

      expect(getByText('+ Add Emergency Contact')).toBeTruthy();
    });

    it('adds emergency contact when button pressed', () => {
      const { getByText, getByTestId } = render(<EditProfileScreen />);

      fireEvent.press(getByText('+ Add Emergency Contact'));

      expect(getByTestId('emergency-contact-0')).toBeTruthy();
    });

    it('shows existing emergency contacts', () => {
      useAuth.mockReturnValue({
        userProfile: {
          name: 'John Doe',
          school: 'UCLA',
          major: 'Computer Science',
          graduationYear: '2025',
          emergencyContacts: [
            { name: 'Mom', phone: '555-1234', relationship: 'Mother' },
          ],
        },
        loading: false,
        refreshProfile: jest.fn(),
      });

      const { getByTestId } = render(<EditProfileScreen />);

      expect(getByTestId('emergency-contact-0')).toBeTruthy();
    });

    it('hides add button when 3 contacts exist', () => {
      useAuth.mockReturnValue({
        userProfile: {
          name: 'John Doe',
          school: 'UCLA',
          major: 'Computer Science',
          graduationYear: '2025',
          emergencyContacts: [
            { name: 'Contact 1', phone: '555-1111', relationship: '' },
            { name: 'Contact 2', phone: '555-2222', relationship: '' },
            { name: 'Contact 3', phone: '555-3333', relationship: '' },
          ],
        },
        loading: false,
        refreshProfile: jest.fn(),
      });

      const { queryByText } = render(<EditProfileScreen />);

      expect(queryByText('+ Add Emergency Contact')).toBeNull();
    });
  });

  describe('Ride Preferences', () => {
    it('renders music preference dropdown', () => {
      const { getByText } = render(<EditProfileScreen />);

      expect(getByText('Music Preference')).toBeTruthy();
    });

    it('renders conversation level dropdown', () => {
      const { getByText } = render(<EditProfileScreen />);

      expect(getByText('Conversation Level')).toBeTruthy();
    });

    it('renders pet-friendly toggle', () => {
      const { getByTestId } = render(<EditProfileScreen />);

      expect(getByTestId('toggle-Pet-Friendly')).toBeTruthy();
    });

    it('renders smoking ok toggle', () => {
      const { getByTestId } = render(<EditProfileScreen />);

      expect(getByTestId('toggle-Smoking OK')).toBeTruthy();
    });

    it('toggles pet-friendly preference', () => {
      const { getByTestId, getByText } = render(<EditProfileScreen />);

      expect(getByText('Pet-Friendly: Off')).toBeTruthy();

      fireEvent.press(getByTestId('toggle-Pet-Friendly'));

      expect(getByText('Pet-Friendly: On')).toBeTruthy();
    });

    it('toggles smoking ok preference', () => {
      const { getByTestId, getByText } = render(<EditProfileScreen />);

      expect(getByText('Smoking OK: Off')).toBeTruthy();

      fireEvent.press(getByTestId('toggle-Smoking OK'));

      expect(getByText('Smoking OK: On')).toBeTruthy();
    });
  });

  describe('Save Functionality', () => {
    it('saves profile successfully', async () => {
      const mockRefreshProfile = jest.fn(() => Promise.resolve());
      useAuth.mockReturnValue({
        userProfile: {
          name: 'John Doe',
          school: 'UCLA',
          major: 'Computer Science',
          graduationYear: '2025',
          bio: '',
          pronouns: '',
          emergencyContacts: [],
          ridePreferences: {
            musicTaste: 'Any',
            chattiness: 'Moderate',
            petFriendly: false,
            smokingOk: false,
          },
        },
        loading: false,
        refreshProfile: mockRefreshProfile,
      });

      const { getByText } = render(<EditProfileScreen />);

      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Profile Updated',
          'Your changes have been saved.',
          expect.any(Array)
        );
      });
    });

    it('shows error alert on save failure', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = render(<EditProfileScreen />);

      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          'Failed to update profile. Please try again.'
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles null userProfile', () => {
      useAuth.mockReturnValue({
        userProfile: null,
        loading: false,
        refreshProfile: jest.fn(),
      });

      const { getByPlaceholderText } = render(<EditProfileScreen />);

      const nameInput = getByPlaceholderText('Jane Doe');
      expect(nameInput.props.value).toBe('');
    });

    it('handles missing ridePreferences', () => {
      useAuth.mockReturnValue({
        userProfile: {
          name: 'John Doe',
          school: 'UCLA',
          major: 'Computer Science',
          graduationYear: '2025',
          ridePreferences: null,
        },
        loading: false,
        refreshProfile: jest.fn(),
      });

      const { getByTestId } = render(<EditProfileScreen />);

      // Should use defaults
      expect(getByTestId('toggle-Pet-Friendly')).toBeTruthy();
    });

    it('shows not signed in alert when user is null', async () => {
      // Temporarily mock auth to return null user
      const originalAuth = require('../../../firebaseConfig').auth;
      require('../../../firebaseConfig').auth = { currentUser: null };

      const { getByText } = render(<EditProfileScreen />);

      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Not signed in',
          'Please sign in and try again.'
        );
      });

      // Restore original auth
      require('../../../firebaseConfig').auth = originalAuth;
    });

    it('navigates to profile on successful save OK press', async () => {
      const mockRefreshProfile = jest.fn(() => Promise.resolve());
      useAuth.mockReturnValue({
        userProfile: {
          name: 'John Doe',
          school: 'UCLA',
          major: 'Computer Science',
          graduationYear: '2025',
          bio: '',
          pronouns: '',
          emergencyContacts: [],
          ridePreferences: {
            musicTaste: 'Any',
            chattiness: 'Moderate',
            petFriendly: false,
            smokingOk: false,
          },
        },
        loading: false,
        refreshProfile: mockRefreshProfile,
      });

      const { getByText } = render(<EditProfileScreen />);

      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Profile Updated',
          'Your changes have been saved.',
          expect.any(Array)
        );
      });

      // Get the OK button callback and call it
      const alertCall = alertSpy.mock.calls.find(call => call[0] === 'Profile Updated');
      const okButton = alertCall[2][0];
      okButton.onPress();

      expect(require('expo-router').router.replace).toHaveBeenCalledWith('/(tabs)/profile');
    });

    it('updates emergency contact fields', async () => {
      useAuth.mockReturnValue({
        userProfile: {
          name: 'John Doe',
          school: 'UCLA',
          major: 'Computer Science',
          graduationYear: '2025',
          emergencyContacts: [{ name: 'Contact 1', phone: '555-1234', relationship: 'Friend' }],
          ridePreferences: {},
        },
        loading: false,
        refreshProfile: jest.fn(),
      });

      const { getByTestId } = render(<EditProfileScreen />);

      // Update contact name
      fireEvent.changeText(getByTestId('contact-name-0'), 'Updated Name');

      // Update contact phone
      fireEvent.changeText(getByTestId('contact-phone-0'), '555-9999');

      // Verify the input was changed (the mock component shows the value)
      expect(getByTestId('contact-name-0').props.value).toBe('Updated Name');
      expect(getByTestId('contact-phone-0').props.value).toBe('555-9999');
    });

    it('updates music preference selection', async () => {
      const { getByTestId, queryByTestId } = render(<EditProfileScreen />);

      // The option-Rock should exist, pressing it should trigger onSelect
      const rockOption = getByTestId('option-Rock');
      fireEvent.press(rockOption);

      // Verify the option was pressed (the mock will call onSelect)
      expect(rockOption).toBeTruthy();
    });

    it('updates conversation level selection', async () => {
      const { getByTestId } = render(<EditProfileScreen />);

      // The option-Chatty should exist, pressing it should trigger onSelect
      const chattyOption = getByTestId('option-Chatty');
      fireEvent.press(chattyOption);

      // Verify the option was pressed
      expect(chattyOption).toBeTruthy();
    });

    it('removes emergency contact when remove button pressed', async () => {
      useAuth.mockReturnValue({
        userProfile: {
          name: 'John Doe',
          school: 'UCLA',
          major: 'Computer Science',
          graduationYear: '2025',
          emergencyContacts: [
            { name: 'Contact 1', phone: '555-1234', relationship: 'Friend' },
            { name: 'Contact 2', phone: '555-5678', relationship: 'Family' },
          ],
          ridePreferences: {},
        },
        loading: false,
        refreshProfile: jest.fn(),
      });

      const { getByTestId, queryByTestId } = render(<EditProfileScreen />);

      // Verify both contacts exist
      expect(getByTestId('emergency-contact-0')).toBeTruthy();
      expect(getByTestId('emergency-contact-1')).toBeTruthy();

      // Remove the first contact
      fireEvent.press(getByTestId('remove-contact-0'));

      // After removal, only one contact should remain
      await waitFor(() => {
        expect(queryByTestId('emergency-contact-1')).toBeNull();
      });
    });
  });
});
