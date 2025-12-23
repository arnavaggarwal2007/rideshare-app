
import { Tabs } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';


export default function TabsLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const activeTintColor = useThemeColor({}, 'tabIconSelected');
  const inactiveTintColor = useThemeColor({}, 'tabIconDefault');
  // Use the app's blue for the tab bar background
  const tabBarBackgroundColor = useThemeColor({ light: '#2774AE', dark: '#2774AE' }, 'tint');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        tabBarStyle: { backgroundColor: tabBarBackgroundColor },
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
