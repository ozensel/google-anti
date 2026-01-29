// src/navigation/index.js
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useUser } from '../context/UserContext';

import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import NewDreamScreen from '../screens/NewDreamScreen';
import ChatScreen from '../screens/ChatScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LockScreen from '../screens/LockScreen';
import DreamNotesScreen from '../screens/DreamNotesScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    const { session, loading, isProfileComplete, isBiometricEnabled, isBiometricAuthenticated } = useUser();

    console.log("AppNavigator Render:", {
        hasSession: !!session,
        loading,
        isProfileComplete,
        isBiometricEnabled,
        isBiometricAuthenticated
    });

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0914' }}>
                <ActivityIndicator size="large" color="#9F45FF" />
            </View>
        );
    }

    // Biyometrik Kilit Kontrolü (Global)
    // Eğer oturum varsa, biyometrik açıksa ve henüz doğrulanmadıysa: Sadece Kilit Ekranını göster.
    // Navigasyon sistemini hiç yükleme.
    if (session && isBiometricEnabled && !isBiometricAuthenticated) {
        return <LockScreen />;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                }}
            >
                {!session ? (
                    // Auth Stack
                    <Stack.Screen name="Welcome" component={WelcomeScreen} />
                ) : !isProfileComplete ? (
                    // Onboarding Stack
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                ) : (
                    // App Stack
                    <>
                        <Stack.Screen name="MainTabs" component={TabNavigator} />
                        <Stack.Screen name="NewDream" component={NewDreamScreen} options={{ presentation: 'fullScreenModal' }} />
                        <Stack.Screen name="Chat" component={ChatScreen} />
                        <Stack.Screen name="DreamNotes" component={DreamNotesScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;

