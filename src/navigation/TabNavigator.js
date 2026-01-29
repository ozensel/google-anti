import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Screens
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NewDreamScreen from '../screens/NewDreamScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#191022',
                    borderTopColor: 'rgba(255,255,255,0.05)',
                    height: Platform.OS === 'ios' ? 88 : 70,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
                    paddingTop: 10,
                },
                tabBarActiveTintColor: '#7f13ec',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarShowLabel: false,
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={24} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="AnalysisTab"
                component={AnalysisScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="sparkles" size={24} color={color} />
                    ),
                }}
            />

            {/* Floating Add Button - Dummy Screen */}
            <Tab.Screen
                name="AddDream"
                component={NewDreamScreen} // Normalde placeholder koyup listener ile modal açarız, burada direkt yönlenmesi için
                options={({ navigation }) => ({
                    tabBarButton: (props) => (
                        <TouchableOpacity
                            {...props}
                            style={styles.floatingButtonContainer}
                            onPress={() => navigation.navigate('NewDream')}
                        >
                            <LinearGradient
                                colors={['#9f2cf9', '#7f13ec']}
                                style={styles.floatingButton}
                            >
                                <Ionicons name="add" size={32} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    ),
                })}
            />

            <Tab.Screen
                name="HistoryTab"
                component={HistoryScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="book" size={24} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="SettingsTab"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings-sharp" size={24} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    floatingButtonContainer: {
        top: -24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#7f13ec',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    floatingButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#191022', // Arka planla aynı renk bordo efekti
    }
});

export default TabNavigator;
