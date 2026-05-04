import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Globe } from './components/Globe';

export default function App() {
  return (
    <View style={styles.root}>
      <Globe />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050a18',
  },
});
