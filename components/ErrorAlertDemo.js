import { useState } from 'react';
import { Button, View } from 'react-native';
import ErrorAlert from '../components/ErrorAlert';

export default function ErrorAlertDemo() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('Something went wrong!');

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Show Error" onPress={() => {
        setMessage('Test error: ' + Math.random().toString(36).slice(2, 8));
        setVisible(true);
      }} />
      <ErrorAlert
        visible={visible}
        message={message}
        onDismiss={() => setVisible(false)}
      />
      <Button title="Show Custom Error" onPress={() => {
        setMessage('Custom error: Invalid credentials.');
        setVisible(true);
      }} />
    </View>
  );
}
