import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen 
        name="signin" 
        options={{ 
          title: 'Sign In',
        }} 
      />
      
      <Stack.Screen 
        name="signup" 
        options={{ 
          title: 'Sign Up',
        }} 
      />
      
      <Stack.Screen 
        name="forgot-password" 
        options={{ 
          title: 'Forgot Password',
        }} 
      />
      
      <Stack.Screen 
        name="profile-setup" 
        options={{ 
          title: 'Complete Profile',
          gestureEnabled: false,
          headerShown: false,
        }} 
      />
    </Stack>
  );
}
