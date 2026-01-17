
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Lato_400Regular, useFonts as useLatoFonts } from '@expo-google-fonts/lato';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';


export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const activeTintColor = '#FFFFFF';
  const inactiveTintColor = '#A3C7E8';
  
  const user = useSelector((state) => state.auth.user);
  const chats = useSelector((state) => state.chats.chats);
  
  // Calculate total unread messages across all chats
  const totalUnread = chats.reduce((total, chat) => {
    const unreadCount = chat.unreadCount?.[user?.uid] || 0;
    return total + unreadCount;
  }, 0);

  const [fontsLoaded] = useLatoFonts({
    Lato_400Regular,
  });

  const marginHorizontal = Math.max(16, 20 + Math.max(insets.left, insets.right));
  const marginBottom = Math.max(14, 18 + insets.bottom);
  const height = 64;
  const verticalPad = 6;

  if (!fontsLoaded) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal,
          marginBottom,
          backgroundColor: '#2774AE',
          borderRadius: 24,
          height,
          paddingBottom: verticalPad,
          paddingTop: verticalPad,
          paddingHorizontal: 8,
          shadowColor: '#0A2540',
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: 14 },
          shadowRadius: 24,
          elevation: 16,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: '#1F5F93',
          overflow: 'visible',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          fontFamily: 'Lato_400Regular',
          marginTop: 2,
          textAlign: 'center',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="house.fill" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-rides"
        options={{
          title: 'My Rides',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="paperplane.fill" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="map.fill" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <MaterialIcons name="forum" color={color} size={size} />
              {totalUnread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="person.crop.circle" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#2774AE',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
