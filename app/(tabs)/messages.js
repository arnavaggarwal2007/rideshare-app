import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ThemedText } from '../../components/themed-text';
import { subscribeToUserChats } from '../../services/firebase/firestore';
import { setChats } from '../../store/slices/chatsSlice';

export default function MessagesScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const chats = useSelector((state) => state.chats.chats);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_400Regular,
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserChats(user.uid, (chatsData) => {
      dispatch(setChats(chatsData));
      setLoading(false);
      setRefreshing(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user, dispatch]);

  const onRefresh = () => {
    if (!user) return;
    setRefreshing(true);
    // The subscription will handle the refresh
  };

  const handleChatPress = (chat) => {
    router.push(`/chat/${chat.id}`);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const renderChatItem = ({ item }) => {
    // Determine other participant
    const otherParticipantId = item.participants.find((p) => p !== user?.uid);
    const otherParticipant = item.participantDetails?.[otherParticipantId];
    
    // Get unread count for current user
    const unreadCount = item.unreadCount?.[user?.uid] || 0;
    const hasUnread = unreadCount > 0;

    return (
      <TouchableOpacity 
        style={styles.chatItem} 
        onPress={() => handleChatPress(item)}
        activeOpacity={0.6}
      >
        <View style={styles.chatLeft}>
          {otherParticipant?.photoURL ? (
            <Image
              source={{ uri: otherParticipant.photoURL }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.chatCenter}>
          <ThemedText style={[styles.chatName, hasUnread && styles.unreadText]}>
            {otherParticipant?.name || 'Unknown'}
          </ThemedText>
          <Text 
            numberOfLines={1} 
            style={[styles.lastMessage, hasUnread && styles.unreadMessage]}
          >
            {item.lastMessage?.text || 'No messages yet'}
          </Text>
        </View>

        <View style={styles.chatRight}>
          <ThemedText style={styles.timestamp}>
            {formatTime(item.updatedAt)}
          </ThemedText>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
      <ThemedText style={styles.emptyText}>No active chats yet</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Chats will appear here once you confirm a trip
      </ThemedText>
    </View>
  );

  if (loading || !fontsLoaded) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Messages</ThemedText>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2774AE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Messages</ThemedText>
      </View>
      {chats.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2774AE']} tintColor="#2774AE" />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E3E7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A1A',
    lineHeight: 34,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  chatLeft: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E3E7',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2774AE',
  },
  chatCenter: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Lato_400Regular',
    marginBottom: 4,
    color: '#1A1A1A',
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#687076',
  },
  unreadText: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
  chatRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: '#687076',
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: '#2774AE',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E3E7',
    marginLeft: 84,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginTop: 16,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Lato_400Regular',
    color: '#687076',
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 110,
  },
});
