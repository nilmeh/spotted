import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Must be exported or Fast Refresh won't update the context
function App() {
  // @ts-expect-error - require.context is webpack-specific and not in Node types
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

export default App;
registerRootComponent(App);
