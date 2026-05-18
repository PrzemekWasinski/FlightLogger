import { registerRootComponent } from 'expo';
import { Text, TextInput } from 'react-native';
import App from './App';

// Cap system font scale at 1× so oversized accessibility fonts don't break layouts
(Text as any).defaultProps = { ...((Text as any).defaultProps ?? {}), maxFontSizeMultiplier: 1 };
(TextInput as any).defaultProps = { ...((TextInput as any).defaultProps ?? {}), maxFontSizeMultiplier: 1 };

registerRootComponent(App);
