import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUser } from '../context/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, SplineSans_400Regular, SplineSans_600SemiBold, SplineSans_700Bold } from '@expo-google-fonts/spline-sans';

const OnboardingScreen = ({ navigation }) => {
    const { t, updateProfile, language } = useUser();
    const [fullName, setFullName] = useState('');
    // Başlangıç tarihi olarak 18 yıl öncesini ayarla
    const initialDate = new Date();
    initialDate.setFullYear(initialDate.getFullYear() - 18);
    const [date, setDate] = useState(initialDate);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    // Maksimum tarih (En az 13 yaşında olmalı)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 13);

    let [fontsLoaded] = useFonts({
        SplineSans_400Regular,
        SplineSans_600SemiBold,
        SplineSans_700Bold,
    });

    const calculateZodiac = (day, month) => {
        const zodiacSigns = [
            { sign: 'capricorn', endDay: 19 },
            { sign: 'aquarius', endDay: 18 },
            { sign: 'pisces', endDay: 20 },
            { sign: 'aries', endDay: 19 },
            { sign: 'taurus', endDay: 20 },
            { sign: 'gemini', endDay: 20 },
            { sign: 'cancer', endDay: 22 },
            { sign: 'leo', endDay: 22 },
            { sign: 'virgo', endDay: 22 },
            { sign: 'libra', endDay: 22 },
            { sign: 'scorpio', endDay: 21 },
            { sign: 'sagittarius', endDay: 21 },
            { sign: 'capricorn', endDay: 31 }
        ];

        let i = month - 1;
        if (day > zodiacSigns[i].endDay) {
            i = i + 1;
        }
        if (i === 12) i = 0;
        return zodiacSigns[i].sign;
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert(t('error') || 'Error', t('error_fill_fields') || 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const zodiac = calculateZodiac(date.getDate(), date.getMonth() + 1);

            await updateProfile({
                full_name: fullName,
                birth_date: date.toISOString().split('T')[0],
                zodiac_sign: zodiac
            });

            // Navigation is handled automatically by AppNavigator listening to isProfileComplete state

        } catch (error) {
            Alert.alert(t('error') || 'Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    if (!fontsLoaded) return <View style={styles.container} />;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1a1125', '#0d0814']}
                style={styles.background}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('onboarding_title') || 'Welcome!'}</Text>
                    <Text style={styles.subtitle}>{t('onboarding_subtitle') || 'Let\'s get to know you better.'}</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>{t('onboarding_name_label') || 'Name'}</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder={t('onboarding_name_placeholder') || 'Your Name'}
                            placeholderTextColor="#4B5563"
                            value={fullName}
                            onChangeText={setFullName}
                        />
                    </View>

                    <Text style={styles.label}>{t('onboarding_date_label') || 'Birth Date'}</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.icon} />
                        <Text style={styles.dateText}>
                            {date.toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={date}
                            mode="date"
                            display="spinner"
                            onChange={onDateChange}
                            maximumDate={maxDate}
                            locale={language === 'tr' ? 'tr-TR' : 'en-US'}
                            textColor="white"
                            themeVariant="dark"
                        />
                    )}
                </View>

                <Text style={styles.explanation}>
                    {t('onboarding_explanation')}
                </Text>

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={['#9F45FF', '#6C2bd9']}
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.saveButtonText}>{t('save_and_continue') || 'Save & Continue'}</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d0814',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 48,
    },
    title: {
        fontSize: 32,
        fontFamily: 'SplineSans_700Bold',
        color: 'white',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'SplineSans_400Regular',
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 24,
    },
    form: {
        marginBottom: 32,
    },
    label: {
        fontSize: 14,
        fontFamily: 'SplineSans_600SemiBold',
        color: '#E5E7EB',
        marginBottom: 8,
        marginTop: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        height: 56,
    },
    input: {
        flex: 1,
        color: 'white',
        fontFamily: 'SplineSans_400Regular',
        fontSize: 16,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        height: 56,
    },
    dateText: {
        color: 'white',
        fontFamily: 'SplineSans_400Regular',
        fontSize: 16,
    },
    icon: {
        marginRight: 12,
    },
    explanation: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'SplineSans_400Regular',
    },
    saveButton: {
        marginTop: 24,
        borderRadius: 16,
        overflow: 'hidden',
        height: 56,
    },
    gradientButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_600SemiBold',
    },
});

export default OnboardingScreen;
