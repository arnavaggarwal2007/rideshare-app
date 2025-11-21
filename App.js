import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { db } from './firebaseConfig';
import { collection } from 'firebase/firestore';

export default function App() {
  console.log ('Firebase initialized:', db ? 'SUCCESS' : 'FAILED');
  return (
    <View style={styles.container}>
      <Text>Rideshare - Firebase Setup Complete!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
