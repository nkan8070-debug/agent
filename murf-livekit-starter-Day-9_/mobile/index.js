import { registerGlobals } from '@livekit/react-native';

registerGlobals();

import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
