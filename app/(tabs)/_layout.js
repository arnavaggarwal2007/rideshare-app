
import { IconSymbol } from '@/components/ui/icon-symbol';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const activeTintColor = '#FFFFFF';
  const inactiveTintColor = '#A3C7E8';

  const marginHorizontal = Math.max(16, 20 + Math.max(insets.left, insets.right));
  const marginBottom = Math.max(14, 18 + insets.bottom);
  const height = 60 + Math.min(insets.bottom, 6);
  const verticalPad = 8;

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
          paddingHorizontal: 12,
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
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
          textAlign: 'center',
          alignSelf: 'center',
          width: '100%',
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 2,
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
            <MaterialIcons name="forum" color={color} size={size} />
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
