import React, { useState, useEffect } from 'react';
import * as Font from 'expo-font';
import { SplineSans_300Light, SplineSans_400Regular, SplineSans_500Medium, SplineSans_600SemiBold, SplineSans_700Bold } from '@expo-google-fonts/spline-sans';
import { StatusBar } from 'react-native';

import { UserProvider, useUser } from './src/context/UserContext';
import AppNavigator from './src/navigation';

const AppContent = () => {
  const { loading } = useUser();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    loadFonts();
  }, []);

  const loadFonts = async () => {
    await Font.loadAsync({
      SplineSans_300Light,
      SplineSans_400Regular,
      SplineSans_500Medium,
      SplineSans_600SemiBold,
      SplineSans_700Bold,
    });
    setFontsLoaded(true);
  };

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
