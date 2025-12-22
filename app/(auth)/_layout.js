import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen 
        name="signin" 
        options={{ 
          title: 'Sign In',
          animationTypeForReplace: true,
        }} 
      />
      
      <Stack.Screen 
        name="signup" 
        options={{ 
          title: 'Sign Up',
          animationTypeForReplace: true,
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
