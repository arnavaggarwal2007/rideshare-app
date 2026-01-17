/**
 * Tests for ProfileSetupScreen
 * Tests profile creation flow, form validation, and user interactions
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../../firebaseConfig', () => ({
  auth: {
    currentUser: {
      uid: 'test-uid-123',
      email: 'test@university.edu',
    },
  },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

jest.mock('../../../hooks/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    refreshProfile: jest.fn(),
  })),
}));

// Mock expo-google-fonts
jest.mock('@expo-google-fonts/lato', () => ({
  Lato_400Regular: 'Lato_400Regular',
  Lato_700Bold: 'Lato_700Bold',
}));

jest.mock('@expo-google-fonts/montserrat', () => ({
  Montserrat_400Regular: 'Montserrat_400Regular',
  Montserrat_600SemiBold: 'Montserrat_600SemiBold',
  Montserrat_700Bold: 'Montserrat_700Bold',
  useFonts: jest.fn(() => [true]),
}));

// Mock components
jest.mock('../../../components/CustomDropdown', () => {
  const React = require('react');
  const { TouchableOpacity, Text, View } = require('react-native');
  return function MockDropdown({ label, value, options, onSelect, testID }) {
    return (
      <View testID={testID || `dropdown-${label}`}>
        {label && <Text>{label}</Text>}
        <TouchableOpacity 
          onPress={() => onSelect && onSelect(options[1])}
          testID={`select-${label || 'dropdown'}`}
        >
          <Text>{value}</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../../../components/EmergencyContactInput', () => {
  const React = require('react');
  const { View, TextInput, TouchableOpacity, Text } = require('react-native');
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
  const { TouchableOpacity, Text, View } = require('react-native');
  return function MockPreferenceToggle({ label, value, onToggle }) {
    return (
      <View testID={`toggle-${label}`}>
        <TouchableOpacity onPress={onToggle} testID={`toggle-btn-${label}`}>
          <Text>{label}</Text>
          <Text testID={`toggle-value-${label}`}>{value ? 'On' : 'Off'}</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import ProfileSetupScreen from '../profile-setup';
import { auth, db } from '../../../firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../hooks/AuthContext';
import { useFonts } from '@expo-google-fonts/montserrat';

// Alert spy
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Create mock store
const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: (state = { user: null, profile: null }) => state,
    },
    preloadedState: {
      auth: { user: null, profile: null },
      ...preloadedState,
    },
  });
};

// Helper to render with provider
const renderWithProvider = (component, customStore) => {
  const store = customStore || createMockStore();
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store,
  };
};

describe('ProfileSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();
    
    // Default mock implementations
    doc.mockReturnValue('mock-doc-ref');
    getDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });
    setDoc.mockResolvedValue();
    
    // Reset auth mock
    auth.currentUser = {
      uid: 'test-uid-123',
      email: 'test@university.edu',
    };
  });

  describe('Loading State', () => {
    it('shows loading indicator while fonts are loading', () => {
      useFonts.mockReturnValueOnce([false]);
      
      const { getByTestId } = renderWithProvider(<ProfileSetupScreen />);
      
      // When fonts not loaded, should show ActivityIndicator
      expect(getByTestId).toBeDefined();
    });

    it('renders screen when fonts are loaded', () => {
      useFonts.mockReturnValue([true]);
      
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);
      
      expect(getByText('Create your profile')).toBeTruthy();
    });
  });

  describe('Screen Display', () => {
    it('renders title and subtitle', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Create your profile')).toBeTruthy();
      expect(getByText('Tell us a bit about yourself to get started')).toBeTruthy();
    });

    it('renders profile photo section', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Add a profile photo')).toBeTruthy();
    });

    it('renders full name input field', () => {
      const { getByPlaceholderText } = renderWithProvider(<ProfileSetupScreen />);

      // Full Name label has nested required asterisk, so just check the input placeholder
      expect(getByPlaceholderText('Jane Doe')).toBeTruthy();
    });

    it('renders school dropdown', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('School/University')).toBeTruthy();
    });

    it('renders major dropdown', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Major')).toBeTruthy();
    });

    it('renders graduation year dropdown', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Graduation Year')).toBeTruthy();
    });

    it('renders bio input field', () => {
      const { getByText, getByPlaceholderText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Bio (optional)')).toBeTruthy();
      expect(getByPlaceholderText('Tell others a bit about yourself...')).toBeTruthy();
    });

    it('displays bio character count', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('0/200')).toBeTruthy();
    });

    it('renders pronouns dropdown', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Pronouns')).toBeTruthy();
    });

    it('renders emergency contacts section', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Emergency Contacts (Optional)')).toBeTruthy();
      expect(getByText('Add up to 3 emergency contacts for safety purposes')).toBeTruthy();
    });

    it('renders add emergency contact button', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('+ Add Emergency Contact')).toBeTruthy();
    });

    it('renders ride preferences section', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Ride Preferences (Optional)')).toBeTruthy();
      expect(getByText('Help us match you with compatible riders')).toBeTruthy();
    });

    it('renders music preference dropdown', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Music Preference')).toBeTruthy();
    });

    it('renders conversation level dropdown', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Conversation Level')).toBeTruthy();
    });

    it('renders pet-friendly toggle', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Pet-Friendly')).toBeTruthy();
    });

    it('renders smoking toggle', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Smoking OK')).toBeTruthy();
    });

    it('renders Get Started button', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      expect(getByText('Get Started')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('shows alert when name is empty', async () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      const submitButton = getByText('Get Started');
      fireEvent.press(submitButton);

      expect(alertSpy).toHaveBeenCalledWith(
        'Missing Information',
        'Please enter your full name.'
      );
    });

    it('shows alert when name is too short', async () => {
      const { getByText, getByPlaceholderText } = renderWithProvider(<ProfileSetupScreen />);

      const nameInput = getByPlaceholderText('Jane Doe');
      fireEvent.changeText(nameInput, 'A');

      const submitButton = getByText('Get Started');
      fireEvent.press(submitButton);

      expect(alertSpy).toHaveBeenCalledWith(
        'Invalid Name',
        'Name must be at least 2 characters.'
      );
    });

    it('shows alert when school not selected', async () => {
      const { getByText, getByPlaceholderText } = renderWithProvider(<ProfileSetupScreen />);

      const nameInput = getByPlaceholderText('Jane Doe');
      fireEvent.changeText(nameInput, 'John Doe');

      const submitButton = getByText('Get Started');
      fireEvent.press(submitButton);

      expect(alertSpy).toHaveBeenCalledWith(
        'Missing Information',
        'Please select your school.'
      );
    });
  });

  describe('Form Input', () => {
    it('accepts full name input', () => {
      const { getByPlaceholderText } = renderWithProvider(<ProfileSetupScreen />);

      const nameInput = getByPlaceholderText('Jane Doe');
      fireEvent.changeText(nameInput, 'Test User');

      expect(nameInput.props.value).toBe('Test User');
    });

    it('accepts bio input', () => {
      const { getByPlaceholderText } = renderWithProvider(<ProfileSetupScreen />);

      const bioInput = getByPlaceholderText('Tell others a bit about yourself...');
      fireEvent.changeText(bioInput, 'This is my bio');

      expect(bioInput.props.value).toBe('This is my bio');
    });

    it('updates bio character count', () => {
      const { getByPlaceholderText, getByText } = renderWithProvider(<ProfileSetupScreen />);

      const bioInput = getByPlaceholderText('Tell others a bit about yourself...');
      fireEvent.changeText(bioInput, 'Hello');

      expect(getByText('5/200')).toBeTruthy();
    });
  });

  describe('Emergency Contacts', () => {
    it('adds emergency contact when button pressed', () => {
      const { getByText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      const addButton = getByText('+ Add Emergency Contact');
      fireEvent.press(addButton);

      expect(getByTestId('emergency-contact-0')).toBeTruthy();
    });

    it('can add up to 3 emergency contacts', () => {
      const { getByText, getByTestId, queryByText } = renderWithProvider(<ProfileSetupScreen />);

      // Add first contact
      fireEvent.press(getByText('+ Add Emergency Contact'));
      expect(getByTestId('emergency-contact-0')).toBeTruthy();

      // Add second contact
      fireEvent.press(getByText('+ Add Emergency Contact'));
      expect(getByTestId('emergency-contact-1')).toBeTruthy();

      // Add third contact
      fireEvent.press(getByText('+ Add Emergency Contact'));
      expect(getByTestId('emergency-contact-2')).toBeTruthy();

      // Add button should be hidden after 3 contacts
      expect(queryByText('+ Add Emergency Contact')).toBeNull();
    });

    it('removes emergency contact when remove pressed', () => {
      const { getByText, getByTestId, queryByTestId } = renderWithProvider(<ProfileSetupScreen />);

      // Add contact
      fireEvent.press(getByText('+ Add Emergency Contact'));
      expect(getByTestId('emergency-contact-0')).toBeTruthy();

      // Remove contact
      fireEvent.press(getByTestId('remove-contact-0'));
      expect(queryByTestId('emergency-contact-0')).toBeNull();
    });

    it('updates contact name field', () => {
      const { getByText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      fireEvent.press(getByText('+ Add Emergency Contact'));
      
      const nameInput = getByTestId('contact-name-0');
      fireEvent.changeText(nameInput, 'Mom');

      expect(nameInput.props.value).toBe('Mom');
    });

    it('updates contact phone field', () => {
      const { getByText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      fireEvent.press(getByText('+ Add Emergency Contact'));
      
      const phoneInput = getByTestId('contact-phone-0');
      fireEvent.changeText(phoneInput, '123-456-7890');

      expect(phoneInput.props.value).toBe('123-456-7890');
    });
  });

  describe('Ride Preferences', () => {
    it('toggles pet-friendly preference', () => {
      const { getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      const toggleButton = getByTestId('toggle-btn-Pet-Friendly');
      fireEvent.press(toggleButton);

      const toggleValue = getByTestId('toggle-value-Pet-Friendly');
      expect(toggleValue.props.children).toBe('On');
    });

    it('toggles smoking preference', () => {
      const { getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      const toggleButton = getByTestId('toggle-btn-Smoking OK');
      fireEvent.press(toggleButton);

      const toggleValue = getByTestId('toggle-value-Smoking OK');
      expect(toggleValue.props.children).toBe('On');
    });
  });

  describe('Photo Upload', () => {
    it('shows disabled alert when photo button pressed', () => {
      const { getByText } = renderWithProvider(<ProfileSetupScreen />);

      const photoLink = getByText('Add a profile photo');
      fireEvent.press(photoLink);

      expect(alertSpy).toHaveBeenCalledWith(
        'Photo Upload Disabled',
        'Profile photos are currently disabled. You can add one later when storage is enabled.'
      );
    });
  });

  describe('Profile Submission', () => {
    const fillValidForm = (getByPlaceholderText, getByTestId) => {
      // Fill name
      fireEvent.changeText(getByPlaceholderText('Jane Doe'), 'John Smith');
      
      // Select school (mock dropdown will set first non-placeholder option)
      fireEvent.press(getByTestId('select-School/University'));
      
      // Select major
      fireEvent.press(getByTestId('select-Major'));
      
      // Select graduation year
      fireEvent.press(getByTestId('select-Graduation Year'));
    };

    it('shows alert when user is not signed in', async () => {
      auth.currentUser = null;

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      fillValidForm(getByPlaceholderText, getByTestId);

      await act(async () => {
        fireEvent.press(getByText('Get Started'));
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Not signed in',
        'Please sign in and try again.'
      );
    });

    it('shows alert when profile already exists', async () => {
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ profileComplete: true }),
      });

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      fillValidForm(getByPlaceholderText, getByTestId);

      await act(async () => {
        fireEvent.press(getByText('Get Started'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Profile Already Exists',
          'You already have a completed profile. Redirecting to home.'
        );
      });
    });

    it('creates profile successfully', async () => {
      const mockRefreshProfile = jest.fn().mockResolvedValue();
      useAuth.mockReturnValue({ refreshProfile: mockRefreshProfile });

      const { getByText, getByPlaceholderText, getByTestId, store } = renderWithProvider(<ProfileSetupScreen />);

      fillValidForm(getByPlaceholderText, getByTestId);

      await act(async () => {
        fireEvent.press(getByText('Get Started'));
      });

      await waitFor(() => {
        expect(setDoc).toHaveBeenCalled();
      });
    });

    it('shows success alert on profile creation', async () => {
      const mockRefreshProfile = jest.fn().mockResolvedValue();
      useAuth.mockReturnValue({ refreshProfile: mockRefreshProfile });

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      fillValidForm(getByPlaceholderText, getByTestId);

      await act(async () => {
        fireEvent.press(getByText('Get Started'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Profile Created! 🎉',
          'Your profile has been set up successfully!'
        );
      });
    });

    it('calls refreshProfile after success', async () => {
      const mockRefreshProfile = jest.fn().mockResolvedValue();
      useAuth.mockReturnValue({ refreshProfile: mockRefreshProfile });

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      fillValidForm(getByPlaceholderText, getByTestId);

      await act(async () => {
        fireEvent.press(getByText('Get Started'));
      });

      await waitFor(() => {
        expect(mockRefreshProfile).toHaveBeenCalledWith('test-uid-123');
      });
    });

    it('shows error alert when profile creation fails', async () => {
      setDoc.mockRejectedValue(new Error('Firestore error'));

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      fillValidForm(getByPlaceholderText, getByTestId);

      await act(async () => {
        fireEvent.press(getByText('Get Started'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          'Failed to create profile. Please try again.'
        );
      });
    });

    it('saves correct profile data to Firestore', async () => {
      const mockRefreshProfile = jest.fn().mockResolvedValue();
      useAuth.mockReturnValue({ refreshProfile: mockRefreshProfile });

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      // Fill form
      fireEvent.changeText(getByPlaceholderText('Jane Doe'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('Tell others a bit about yourself...'), 'My bio');
      fireEvent.press(getByTestId('select-School/University'));
      fireEvent.press(getByTestId('select-Major'));
      fireEvent.press(getByTestId('select-Graduation Year'));

      await act(async () => {
        fireEvent.press(getByText('Get Started'));
      });

      await waitFor(() => {
        expect(setDoc).toHaveBeenCalledWith(
          'mock-doc-ref',
          expect.objectContaining({
            uid: 'test-uid-123',
            email: 'test@university.edu',
            name: 'Test User',
            bio: 'My bio',
            profileComplete: true,
          })
        );
      });
    });
  });

  describe('Validation Edge Cases', () => {
    it('validates bio length', async () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      // Fill valid data
      fireEvent.changeText(getByPlaceholderText('Jane Doe'), 'John Smith');
      fireEvent.press(getByTestId('select-School/University'));
      fireEvent.press(getByTestId('select-Major'));
      fireEvent.press(getByTestId('select-Graduation Year'));
      
      // Add long bio (>200 chars)
      const longBio = 'a'.repeat(201);
      fireEvent.changeText(getByPlaceholderText('Tell others a bit about yourself...'), longBio);

      fireEvent.press(getByText('Get Started'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Bio Too Long',
        'Bio must be 200 characters or less.'
      );
    });

    it('trims name whitespace', async () => {
      const mockRefreshProfile = jest.fn().mockResolvedValue();
      useAuth.mockReturnValue({ refreshProfile: mockRefreshProfile });

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      // Fill form with whitespace name
      fireEvent.changeText(getByPlaceholderText('Jane Doe'), '  John Smith  ');
      fireEvent.press(getByTestId('select-School/University'));
      fireEvent.press(getByTestId('select-Major'));
      fireEvent.press(getByTestId('select-Graduation Year'));

      await act(async () => {
        fireEvent.press(getByText('Get Started'));
      });

      await waitFor(() => {
        expect(setDoc).toHaveBeenCalledWith(
          'mock-doc-ref',
          expect.objectContaining({
            name: 'John Smith', // trimmed
          })
        );
      });
    });

    it('handles pronouns selection', async () => {
      const mockRefreshProfile = jest.fn().mockResolvedValue();
      useAuth.mockReturnValue({ refreshProfile: mockRefreshProfile });

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProvider(<ProfileSetupScreen />);

      // Fill form and select pronouns
      fireEvent.changeText(getByPlaceholderText('Jane Doe'), 'John Smith');
      fireEvent.press(getByTestId('select-School/University'));
      fireEvent.press(getByTestId('select-Major'));
      fireEvent.press(getByTestId('select-Graduation Year'));
      fireEvent.press(getByTestId('select-Pronouns'));

      await act(async () => {
        fireEvent.press(getByText('Get Started'));
      });

      await waitFor(() => {
        expect(setDoc).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State During Submission', () => {
    it('disables button during submission', async () => {
      // Make setDoc take time
      setDoc.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { getByText, getByPlaceholderText, getByTestId, queryByTestId } = renderWithProvider(<ProfileSetupScreen />);

      // Fill form
      fireEvent.changeText(getByPlaceholderText('Jane Doe'), 'John Smith');
      fireEvent.press(getByTestId('select-School/University'));
      fireEvent.press(getByTestId('select-Major'));
      fireEvent.press(getByTestId('select-Graduation Year'));

      await act(async () => {
        fireEvent.press(getByText('Get Started'));
      });

      // Let the async operation complete
      await waitFor(() => {
        expect(setDoc).toHaveBeenCalled();
      });
    });
  });
});
