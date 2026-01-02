import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ThemedText } from '../../components/themed-text';
import { getChatById, getTripById, subscribeToChat } from '../../services/firebase/firestore';
import { markMessagesReadThunk, sendMessageThunk, setCurrentChat, setMessages } from '../../store/slices/chatsSlice';

// Custom Input Component to prevent keyboard dismissal
const ChatInput = React.memo(function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  
  const handleSend = useCallback(() => {
    const messageText = text.trim();
    if (!messageText || disabled) return;
    
    onSend(messageText);
    setText('');
  }, [text, onSend, disabled]);
  
  return (
    <View style={inputStyles.inputToolbar}>
      <View style={inputStyles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={inputStyles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          returnKeyType="default"
          blurOnSubmit={false}
          enablesReturnKeyAutomatically={true}
          autoCorrect={true}
          autoCapitalize="sentences"
        />
        <TouchableOpacity
          style={[inputStyles.sendButton, !text.trim() && inputStyles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          <Ionicons 
            name="send" 
            size={24} 
            color={text.trim() ? '#2774AE' : '#ccc'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const inputStyles = StyleSheet.create({
  inputToolbar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#1a1a1a',
    fontWeight: '400',
    backgroundColor: 'transparent',
  },
  sendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default function ChatScreen() {
  const { id: chatId } = useLocalSearchParams();
  const dispatch = useDispatch();
  
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });
  
  const user = useSelector((state) => state.auth.user);
  const userProfile = useSelector((state) => state.auth.userProfile);
  const messages = useSelector((state) => state.chats.messages) || [];
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [tripData, setTripData] = useState(null);

  useEffect(() => {
    if (!chatId || !user) return;

    const loadChat = async () => {
      try {
        const chat = await getChatById(chatId);
        if (!chat) {
          setError('Chat not found');
          setLoading(false);
          return;
        }
        
        dispatch(setCurrentChat(chat));
        
        // Determine other participant
        const otherUserId = chat.participants.find(p => p !== user.uid);
        if (otherUserId && chat.participantDetails) {
          setOtherParticipant(chat.participantDetails[otherUserId]);
        }

        // Load trip data if tripId exists
        if (chat.tripId) {
          try {
            const trip = await getTripById(chat.tripId);
            if (trip) {
              setTripData(trip);
            }
          } catch (tripErr) {
            console.error('Error loading trip:', tripErr);
          }
        }
      } catch (err) {
        console.error('Error loading chat:', err);
        setError('Failed to load chat');
        setLoading(false);
      }
    };

    loadChat();

    setLoading(true);
    setError(null);

    // Subscribe to real-time messages
    const unsubscribe = subscribeToChat(chatId, (messagesData) => {
      try {
        console.log('[ChatScreen] Received messages data:', messagesData.length);
        
        // Transform Firestore messages to GiftedChat format
        const formattedMessages = messagesData
          .filter((msg) => {
            // Filter out invalid messages
            if (!msg || !msg.id || !msg.senderId) {
              console.warn('[ChatScreen] Skipping invalid message:', msg);
              return false;
            }
            return true;
          })
          .map((msg) => {
            // Safely convert timestamp to Date, defaulting to current time if invalid
            let messageDate;
            try {
              if (msg.timestamp?.toDate) {
                messageDate = msg.timestamp.toDate();
              } else if (msg.timestamp) {
                messageDate = new Date(msg.timestamp);
              } else {
                messageDate = new Date();
              }
              // Verify it's a valid date
              if (isNaN(messageDate.getTime())) {
                messageDate = new Date();
              }
            } catch {
              messageDate = new Date();
            }

            const formattedMsg = {
              _id: String(msg.id || Date.now()),
              text: String(msg.text || ''),
              createdAt: messageDate,
              user: {
                _id: String(msg.senderId || 'unknown'),
                name: msg.senderName || 'User',
              },
            };
            
            // Only add avatar if it exists
            if (msg.senderPhotoURL) {
              formattedMsg.user.avatar = msg.senderPhotoURL;
            }
            
            console.log('[ChatScreen] Formatted message:', {
              _id: formattedMsg._id,
              text: formattedMsg.text.substring(0, 20),
              createdAt: formattedMsg.createdAt,
              userId: formattedMsg.user._id,
            });
            
            return formattedMsg;
          });
        
        console.log('[ChatScreen] Total formatted messages:', formattedMessages.length);
        dispatch(setMessages(formattedMessages));
        setLoading(false);
      } catch (err) {
        console.error('[ChatScreen] Error processing messages:', err);
        setError('Failed to load messages');
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      dispatch(setCurrentChat(null));
      dispatch(setMessages([]));
    };
  }, [chatId, user, dispatch]);

  // Mark messages as read when screen comes into view
  useEffect(() => {
    if (!chatId || !user) return;

    dispatch(markMessagesReadThunk({ chatId, userId: user.uid })).catch((err) => {
      console.error('Error marking messages as read:', err);
    });
  }, [chatId, user, dispatch]);

  const onSend = useCallback((newMessages = []) => {
    if (!newMessages.length || !chatId || !user || !userProfile) return;
    
    const message = newMessages[0];
    
    dispatch(sendMessageThunk({
      chatId,
      text: message.text,
      senderId: user.uid,
      senderName: userProfile.name || 'User',
      senderPhotoURL: userProfile.photoURL || null,
    })).catch((err) => {
      console.error('Error sending message:', err);
      // Error handling is done in the thunk
    });
  }, [chatId, user, userProfile, dispatch]);

  // Handle sending message via the custom input component
  const handleSendMessage = useCallback((text) => {
    if (!text || !chatId || !user || !userProfile) return;
    
    dispatch(sendMessageThunk({
      chatId,
      text,
      senderId: user.uid,
      senderName: userProfile.name || 'User',
      senderPhotoURL: userProfile.photoURL || null,
    })).catch((err) => {
      console.error('Error sending message:', err);
    });
  }, [chatId, user, userProfile, dispatch]);

  const handleBack = () => {
    router.back();
  };

  // Helper to extract city/state from full address (e.g., "San Jose, Santa Clara County, California, United States")
  const getLocationShortName = (location) => {
    if (!location) return 'Unknown';
    const placeName = location.placeName || location.address || location.name || '';
    if (!placeName) return 'Unknown';
    
    // Split by comma and get meaningful parts (typically city, state)
    const parts = placeName.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      // Return first two parts (usually city, county or city, state)
      // Skip "County" parts and "United States"
      const meaningfulParts = parts.filter(p => 
        !p.toLowerCase().includes('county') && 
        p.toLowerCase() !== 'united states' &&
        p.toLowerCase() !== 'usa'
      );
      if (meaningfulParts.length >= 2) {
        return `${meaningfulParts[0]}, ${meaningfulParts[1]}`;
      } else if (meaningfulParts.length === 1) {
        return meaningfulParts[0];
      }
    }
    return parts[0] || 'Unknown';
  };

  const formatTripDate = (data) => {
    // Try departureTimestamp first (it's the proper Date object)
    if (data.departureTimestamp) {
      const date = data.departureTimestamp.toDate ? data.departureTimestamp.toDate() : new Date(data.departureTimestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    // Fall back to departureDate string (format: "YYYY-MM-DD")
    if (data.departureDate && typeof data.departureDate === 'string') {
      const [year, month, day] = data.departureDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    // Last resort: createdAt
    if (data.createdAt) {
      const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    return 'Date TBD';
  };

  const formatTripTime = (data) => {
    // Try departureTimestamp first
    if (data.departureTimestamp) {
      const date = data.departureTimestamp.toDate ? data.departureTimestamp.toDate() : new Date(data.departureTimestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      }
    }
    // Fall back to departureTime string (format: "HH:MM")
    if (data.departureTime && typeof data.departureTime === 'string' && data.departureTime.includes(':')) {
      const [hour, minute] = data.departureTime.split(':').map(Number);
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      }
    }
    return 'Time TBD';
  };

  // Render the custom input toolbar using the memoized ChatInput component
  const renderInputToolbar = useCallback(() => (
    <ChatInput 
      onSend={handleSendMessage} 
      disabled={!chatId || !user || !userProfile}
    />
  ), [handleSendMessage, chatId, user, userProfile]);

  // Memoize bubble renderer
  const renderBubble = useCallback((props) => {
    const isCurrentUser = props.currentMessage.user._id === user?.uid;
    return (
      <View style={[
        styles.bubble,
        isCurrentUser ? styles.bubbleRight : styles.bubbleLeft
      ]}>
        <Text style={[
          styles.messageText,
          isCurrentUser ? styles.messageTextRight : styles.messageTextLeft
        ]}>
          {props.currentMessage.text}
        </Text>
        <Text style={[
          styles.timeText,
          isCurrentUser ? styles.timeTextRight : styles.timeTextLeft
        ]}>
          {new Date(props.currentMessage.createdAt).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  }, [user?.uid]);

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2774AE" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Chat</ThemedText>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2774AE" />
          <ThemedText style={styles.loadingText}>Loading chat...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2774AE" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Chat</ThemedText>
        </View>
        <View style={styles.centerContainer}>
          <ThemedText style={styles.error}>{error}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2774AE" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <ThemedText style={styles.headerTitle}>
            {otherParticipant?.name || 'Chat'}
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>Active</ThemedText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} disabled>
            <Ionicons name="call-outline" size={24} color="#2774AE" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} disabled>
            <Ionicons name="videocam-outline" size={24} color="#2774AE" />
          </TouchableOpacity>
          {tripData && (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => router.push(`/trip/${tripData.id}`)}
            >
              <Ionicons name="information-circle-outline" size={24} color="#2774AE" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {tripData && (
          <View style={styles.tripCardContainer}>
            <View style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <Ionicons name="car-outline" size={20} color="#2774AE" />
                <Text style={styles.tripRoute}>
                  {getLocationShortName(tripData.startLocation)} → {getLocationShortName(tripData.endLocation)}
                </Text>
              </View>
              <View style={styles.tripDetails}>
                <View style={styles.tripDetail}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.tripDetailText}>{formatTripDate(tripData)}</Text>
                </View>
                <View style={styles.tripDetail}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.tripDetailText}>{formatTripTime(tripData)}</Text>
                </View>
                <View style={styles.tripDetail}>
                  <Ionicons name="people-outline" size={16} color="#666" />
                  <Text style={styles.tripDetailText}>{tripData.seatsBooked || 1} seat(s) booked</Text>
                </View>
              </View>
              {tripData.status === 'confirmed' && (
                <View style={styles.confirmationBadge}>
                  <Text style={styles.confirmationText}>
                    {otherParticipant?.name || 'Driver'} confirmed your seat request
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={{
            _id: String(user?.uid || 'current-user'),
            name: userProfile?.name || 'You',
          }}
          placeholder="Type a message..."
          alwaysShowSend
          renderUsernameOnMessage
          showAvatarForEveryMessage={false}
          scrollToBottom
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          messagesContainerStyle={styles.messagesContainer}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2774AE',
    fontFamily: 'Montserrat_700Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontWeight: '400',
    fontFamily: 'Lato_400Regular',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
    fontFamily: 'Lato_400Regular',
  },
  error: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    fontWeight: '400',
    fontFamily: 'Lato_400Regular',
  },
  messagesContainer: {
    backgroundColor: '#fff',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 4,
    marginHorizontal: 8,
    maxWidth: '75%',
  },
  bubbleRight: {
    backgroundColor: '#2774AE',
    alignSelf: 'flex-end',
  },
  bubbleLeft: {
    backgroundColor: '#E8F0F7',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '400',
    fontFamily: 'Lato_400Regular',
  },
  messageTextRight: {
    color: '#fff',
  },
  messageTextLeft: {
    color: '#1a1a1a',
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '400',
    fontFamily: 'Lato_400Regular',
  },
  timeTextRight: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  timeTextLeft: {
    color: '#666',
    textAlign: 'left',
  },
  tripCardContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  tripCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Montserrat_700Bold',
  },
  tripDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripDetailText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
    fontFamily: 'Lato_400Regular',
  },
  confirmationBadge: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  confirmationText: {
    fontSize: 13,
    color: '#155724',
    fontWeight: '500',
    fontFamily: 'Lato_400Regular',
  },
  headerButton: {
    marginLeft: 12,
    padding: 4,
  },
});
