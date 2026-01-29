import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useUser } from '../context/UserContext';

const LockScreen = () => {
    const { setIsBiometricAuthenticated, t } = useUser();
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [status, setStatus] = useState(t('biometric_prompt') || 'Yüzünüzü okutun...');

    useEffect(() => {
        // Ekran açılır açılmaz bir kez dene (kısa gecikme ile)
        const timer = setTimeout(() => {
            authenticate();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const authenticate = async () => {
        if (isAuthenticating) return;

        try {
            console.log("LockScreen: Authenticating...");
            setIsAuthenticating(true);
            setStatus(t('verifying') || 'Doğrulanıyor...');

            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                console.log("LockScreen: No hardware/enrolled");
                setStatus(t('biometric_no_hardware') || 'Biyometrik sistem kullanılamıyor.');
                setIsAuthenticating(false);
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: t('biometric_prompt') || 'Giriş yapmak için doğrulayın',
                fallbackLabel: t('use_passcode') || 'Şifre Kullan',
                disableDeviceFallback: false,
                cancelLabel: t('cancel') || 'Vazgeç'
            });

            console.log("LockScreen: Result", result);

            if (result.success) {
                setStatus(t('success') || 'Başarılı! Açılıyor...');
                console.log("LockScreen: Setting authenticated = true");
                // State update immediately to see if timeout is the issue
                setIsBiometricAuthenticated(true);
            } else {
                setStatus(t('authentication_failed') || 'Doğrulanamadı. Tekrar dokunun.');
            }
        } catch (error) {
            console.log("LockScreen Error:", error);
            setStatus(t('error') || 'Hata oluştu.');
        } finally {
            setIsAuthenticating(false);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.7}
                onPress={authenticate}
            >
                <View style={[styles.iconContainer, isAuthenticating && styles.iconContainerActive]}>
                    <Ionicons name={isAuthenticating ? "scan" : "lock-closed"} size={64} color="#7f13ec" />
                </View>
                <Text style={styles.title}>AntiGravity</Text>
                <Text style={styles.subtitle}>{status}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#191022',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 40,
    },
    iconButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(127, 19, 236, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: 'rgba(127, 19, 236, 0.3)',
    },
    iconContainerActive: {
        borderColor: '#7f13ec',
        backgroundColor: 'rgba(127, 19, 236, 0.2)',
    },
    title: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
    }
});

export default LockScreen;
