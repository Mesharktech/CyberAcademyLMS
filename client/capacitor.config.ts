import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cyberacademy.lms',
  appName: 'CyberAcademyLMS',
  webDir: 'dist',
  server: {
    cleartext: true
  }
};

export default config;
