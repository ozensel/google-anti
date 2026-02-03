import React, { useState, useEffect } from 'react';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import { SplineSans_300Light, SplineSans_400Regular, SplineSans_500Medium, SplineSans_600SemiBold, SplineSans_700Bold } from '@expo-google-fonts/spline-sans';
import { StatusBar } from 'react-native';

import { UserProvider, useUser } from './src/context/UserContext';
import AppNavigator from './src/navigation';

const AppContent = () => {
  const { loading } = useUser();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const loadAssets = async () => {
    const imageAssets = [
      require('./assets/explore/better_results.png'),
      require('./assets/explore/lucid_dream.png'),
      require('./assets/explore/nightmare.png'),
      require('./assets/explore/dream_symbols.png'),
      require('./assets/avatars/avatar_male.png'),
      require('./assets/avatars/avatar_female.png'),
      require('./assets/avatars/avatar_other.png'),
    ];

    const fontAssets = Font.loadAsync({
      SplineSans_300Light,
      SplineSans_400Regular,
      SplineSans_500Medium,
      SplineSans_600SemiBold,
      SplineSans_700Bold,
    });

    await Promise.all([
      ...imageAssets.map(image => Asset.fromModule(image).downloadAsync()),
      fontAssets
    ]);

    setFontsLoaded(true);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  if (!fontsLoaded || loading) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#191022" />
      <AppNavigator />
    </>
  );
};

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};
