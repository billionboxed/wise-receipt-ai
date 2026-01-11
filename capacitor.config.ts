import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e9a7d0885b7d43b1a87e025dea4b76fa',
  appName: 'clearspends',
  webDir: 'dist',
  // For development/testing with hot-reload, uncomment the server block below:
  // server: {
  //   url: 'https://e9a7d088-5b7d-43b1-a87e-025dea4b76fa.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    App: {
      // Enable deep links with custom URL scheme
      androidScheme: 'app.lovable.e9a7d0885b7d43b1a87e025dea4b76fa'
    }
  }
};

export default config;
