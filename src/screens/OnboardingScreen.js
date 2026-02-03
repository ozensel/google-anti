import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, ScrollView, Dimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUser } from '../context/UserContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, SplineSans_400Regular, SplineSans_500Medium, SplineSans_600SemiBold, SplineSans_700Bold } from '@expo-google-fonts/spline-sans';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
    const { t, updateProfile, language } = useUser();
    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState('');

    // Default 18 years ago
    const initialDate = new Date();
    initialDate.setFullYear(initialDate.getFullYear() - 18);
    const [date, setDate] = useState(initialDate);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [zodiacSign, setZodiacSign] = useState('');

    // Min age 13
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 13);

    let [fontsLoaded] = useFonts({
        SplineSans_400Regular,
        SplineSans_500Medium,
        SplineSans_600SemiBold,
        SplineSans_700Bold,
    });

    const calculateZodiac = (day, month) => {
        const zodiacSigns = [
            { sign: 'capricorn', endDay: 19, icon: 'zodiac-capricorn', label: 'Oğlak' },
            { sign: 'aquarius', endDay: 18, icon: 'zodiac-aquarius', label: 'Kova' },
            { sign: 'pisces', endDay: 20, icon: 'zodiac-pisces', label: 'Balık' },
            { sign: 'aries', endDay: 19, icon: 'zodiac-aries', label: 'Koç' },
            { sign: 'taurus', endDay: 20, icon: 'zodiac-taurus', label: 'Boğa' },
            { sign: 'gemini', endDay: 20, icon: 'zodiac-gemini', label: 'İkizler' },
            { sign: 'cancer', endDay: 22, icon: 'zodiac-cancer', label: 'Yengeç' },
            { sign: 'leo', endDay: 22, icon: 'zodiac-leo', label: 'Aslan' },
            { sign: 'virgo', endDay: 22, icon: 'zodiac-virgo', label: 'Başak' },
            { sign: 'libra', endDay: 22, icon: 'zodiac-libra', label: 'Terazi' },
            { sign: 'scorpio', endDay: 21, icon: 'zodiac-scorpio', label: 'Akrep' },
            { sign: 'sagittarius', endDay: 21, icon: 'zodiac-sagittarius', label: 'Yay' },
            { sign: 'capricorn', endDay: 31, icon: 'zodiac-capricorn', label: 'Oğlak' }
        ];

        let i = month - 1;
        if (day > zodiacSigns[i].endDay) {
            i = i + 1;
        }
        if (i === 12) i = 0;
        return zodiacSigns[i];
    };

    useEffect(() => {
        const z = calculateZodiac(date.getDate(), date.getMonth() + 1);
        setZodiacSign(z);
    }, [date]);

    const handleSave = async () => {
        if (!fullName.trim() || !gender) {
            Alert.alert(t('error') || 'Hata', t('error_fill_fields') || 'Lütfen isim ve cinsiyet alanlarını doldurun.');
            return;
        }

        setLoading(true);
        try {
            const avatarUrl = `avatar_${gender}`; // Store key: avatar_male, avatar_female, avatar_other

            await updateProfile({
                full_name: fullName,
                birth_date: date.toISOString().split('T')[0],
                zodiac_sign: zodiacSign.sign,
                gender: gender,
                avatar_url: avatarUrl
            });
            // Navigation handled by context listener
        } catch (error) {
            Alert.alert(t('error') || 'Hata', error.message);
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
            {/* Dark Gradient Background */}
            <LinearGradient
                colors={['#1a1125', '#0d0814']}
                style={styles.background}
            />

            {/* Ambient Glow */}
            <View style={styles.glowContainer}>
                <View style={styles.glow} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.content}>

                            {/* Header Section */}
                            <View style={styles.header}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="person-circle-outline" size={64} color="#d8b4fe" />
                                </View>
                                <Text style={styles.title}>{language === 'en' ? 'Welcome!' : 'Hoş Geldiniz!'}</Text>
                                <Text style={styles.subtitle}>{language === 'en' ? "Let's get to know you better." : 'Sizi daha yakından tanıyalım.'}</Text>
                            </View>

                            {/* Form Card */}
                            <View style={styles.card}>

                                {/* Name Input */}
                                <Text style={styles.label}>{language === 'en' ? 'Name' : 'Adınız'}</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="person-outline" size={20} color="#a78bfa" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={language === 'en' ? 'Your Name' : 'Adınız Soyadınız'}
                                        placeholderTextColor="#6b7280"
                                        value={fullName}
                                        onChangeText={setFullName}
                                        autoCapitalize="words"
                                    />
                                </View>

                                {/* Date Input */}
                                <Text style={styles.label}>{language === 'en' ? 'Birth Date' : 'Doğum Tarihiniz'}</Text>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setShowDatePicker(!showDatePicker);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="calendar-clear-outline" size={20} color="#a78bfa" style={styles.inputIcon} />
                                        <Text style={styles.dateText}>
                                            {date.toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </Text>
                                    </View>
                                    <Ionicons name={showDatePicker ? "chevron-up" : "chevron-down"} size={16} color="#6b7280" />
                                </TouchableOpacity>

                                {/* Gender Selection */}
                                <Text style={styles.label}>{language === 'en' ? 'Gender' : 'Cinsiyetiniz'}</Text>
                                <View style={styles.genderContainer}>
                                    {['male', 'female', 'other'].map((g) => (
                                        <TouchableOpacity
                                            key={g}
                                            style={[
                                                styles.genderButton,
                                                gender === g && styles.genderButtonActive
                                            ]}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setGender(g);
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <MaterialCommunityIcons
                                                name={g === 'male' ? 'gender-male' : g === 'female' ? 'gender-female' : 'gender-male-female'}
                                                size={24}
                                                color={gender === g ? 'white' : '#9ca3af'}
                                            />
                                            <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                                                {g === 'male' ? (language === 'en' ? 'Male' : 'Erkek') :
                                                    g === 'female' ? (language === 'en' ? 'Female' : 'Kadın') :
                                                        (language === 'en' ? 'Other' : 'Diğer')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Zodiac Preview (Dynamic) */}
                                {zodiacSign && (
                                    <View style={styles.zodiacContainer}>
                                        <LinearGradient
                                            colors={['rgba(124, 58, 237, 0.1)', 'rgba(139, 92, 246, 0.05)']}
                                            style={styles.zodiacGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            <MaterialCommunityIcons name={zodiacSign.icon} size={24} color="#c4b5fd" />
                                            <Text style={styles.zodiacText}>
                                                Burcunuz: <Text style={styles.zodiacHighlight}>
                                                    {(() => {
                                                        const key = `zodiac_${zodiacSign.sign}`;
                                                        const translated = t(key);
                                                        // Check if translation is missing (usually returns key or specific error string)
                                                        if (!translated || translated.includes('missing') || translated === key) {
                                                            return zodiacSign.label;
                                                        }
                                                        return translated;
                                                    })()}
                                                </Text>
                                            </Text>
                                        </LinearGradient>
                                    </View>
                                )}

                                {showDatePicker && (
                                    <View style={styles.datePickerContainer}>
                                        <DateTimePicker
                                            testID="dateTimePicker"
                                            value={date}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={onDateChange}
                                            maximumDate={maxDate}
                                            locale={language === 'tr' ? 'tr-TR' : 'en-US'}
                                            textColor="white"
                                            themeVariant="dark"
                                            style={styles.datePicker}
                                        />
                                        {Platform.OS === 'ios' && (
                                            <TouchableOpacity
                                                style={styles.closeDatePickerButton}
                                                onPress={() => setShowDatePicker(false)}
                                            >
                                                <Text style={styles.closeDatePickerText}>
                                                    {language === 'tr' ? 'Tamam' : 'Done'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Info Text */}
                            <Text style={styles.explanation}>
                                {language === 'en' ?
                                    "We need this information to create your birth chart and provide personalized dream interpretations." :
                                    "Doğum haritanızı oluşturmak ve size özel rüya yorumları sunabilmek için bu bilgilere ihtiyacımız var."}
                            </Text>

                            {/* Save Button */}
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSave}
                                disabled={loading}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#7c3aed', '#6d28d9']}
                                    style={styles.gradientButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Text style={styles.saveButtonText}>{language === 'en' ? 'Save & Continue' : 'Devam Et'}</Text>
                                            <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                        </View>
                    </TouchableWithoutFeedback>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d0814',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    glowContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflow: 'hidden',
    },
    glow: {
        width: width * 1.2,
        height: height * 0.5,
        backgroundColor: 'rgba(124, 58, 237, 0.15)', // Violet glow
        borderRadius: width,
        transform: [{ scaleX: 1.5 }, { translateY: -height * 0.2 }],
        opacity: 0.8,
        blurRadius: 100, // Not supported effectively on RN View directly often, but opacity helps.
        // Or specific blur view if available. For now just low opacity color blob.
    },
    content: {
        padding: 24,
        paddingBottom: 40,
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    title: {
        fontSize: 28,
        fontFamily: 'SplineSans_700Bold',
        color: 'white',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        fontFamily: 'SplineSans_400Regular',
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 22,
    },
    card: {
        backgroundColor: 'rgba(30, 20, 45, 0.6)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 24,
    },
    label: {
        fontSize: 13,
        fontFamily: 'SplineSans_600SemiBold',
        color: '#e5e7eb',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 20,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: 'white',
        fontFamily: 'SplineSans_500Medium',
        fontSize: 16,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 20,
    },
    dateText: {
        color: 'white',
        fontFamily: 'SplineSans_500Medium',
        fontSize: 16,
    },
    zodiacContainer: {
        marginTop: 4,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.3)',
    },
    zodiacGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    zodiacText: {
        color: '#e9d5ff',
        fontFamily: 'SplineSans_400Regular',
        fontSize: 14,
    },
    zodiacHighlight: {
        fontFamily: 'SplineSans_700Bold',
        color: '#c4b5fd',
    },
    explanation: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'SplineSans_400Regular',
        lineHeight: 20,
        paddingHorizontal: 16,
    },
    saveButton: {
        borderRadius: 16,
        overflow: 'hidden',
        height: 58,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    gradientButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 17,
        fontFamily: 'SplineSans_700Bold',
        letterSpacing: 0.5,
    },
    datePickerContainer: {
        marginTop: 10,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 10,
        overflow: 'hidden',
        alignItems: 'center', // Center the picker
        width: '100%',
    },
    datePicker: {
        height: 120,
        marginTop: -10,
        width: Platform.OS === 'ios' ? 320 : '100%', // Fixed width for iOS spinner to prevent overflow/misalignment
    },
    closeDatePickerButton: {
        alignSelf: 'center', // Center the button too
        paddingVertical: 8,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.3)',
        width: 'auto',
    },
    closeDatePickerText: {
        color: '#d8b4fe',
        fontFamily: 'SplineSans_600SemiBold',
        fontSize: 14,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 12,
    },
    genderButton: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    genderButtonActive: {
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
        borderColor: '#7c3aed',
    },
    genderText: {
        color: '#9ca3af',
        fontFamily: 'SplineSans_500Medium',
        fontSize: 14,
    },
    genderTextActive: {
        color: 'white',
        fontFamily: 'SplineSans_600SemiBold',
    },
});

export default OnboardingScreen;
