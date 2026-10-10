import type {CapacitorConfig} from '@capacitor/cli';
const config:CapacitorConfig={
  appId:'com.seronx94.eldoria',appName:'Eldoria',webDir:'apps/client/dist',
  // Bundle assets locally. No dev/LAN server URL in the installed application.
  android:{backgroundColor:'#172b28'},
};
export default config;
