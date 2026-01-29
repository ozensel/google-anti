import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image, Modal, Alert, Platform, Linking, Dimensions, TextInput, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import { useUser } from '../context/UserContext';

// --- Circular Progress Component (No SVG required) ---
const CircularProgress = ({ size = 140, strokeWidth = 6, progress = 0, color = '#7f13ec', emptyColor = 'rgba(255,255,255,0.1)', children }) => {
    const radius = size / 2;
    const halfSize = size / 2;

    // Rotate degrees
    // We want the progress to start from TOP ( -90deg or 270deg? Standard View starts 0 at right? No, 0 is top usually? No, standard CSS rotation 0 is top. )
    // Actually in RN, we need to test. Usually 0 is Top-ish.

    // Logic:
    // We have two covers: Left and Right.
    // Right Cover masks the Right Half.
    // Left Cover masks the Left Half.

    // Simplest logic:
    // 1. Base Circle (Empty Color)
    // 2. We use 2 semicircles for the Progress.
    //    First semi-circle (Right Side): Rotates 0 -> 180.
    //    Second semi-circle (Left Side): Rotates 180 -> 360.

    const rotate1 = progress > 50 ? 180 : (progress / 50) * 180;
    const rotate2 = progress > 50 ? ((progress - 50) / 50) * 180 : 0;

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            {/* Background Track */}
            <View style={{
                width: size, height: size, borderRadius: radius,
                borderWidth: strokeWidth, borderColor: emptyColor,
                position: 'absolute',
            }} />

            {/* Right Half Progress */}
            <View style={{
                width: halfSize, height: size,
                overflow: 'hidden', position: 'absolute', left: halfSize,
            }}>
                <View style={{
                    width: size, height: size, borderRadius: radius,
                    borderWidth: strokeWidth, borderColor: color,
                    borderLeftColor: 'transparent', borderBottomColor: 'transparent', // Top & Right
                    transform: [{ translateX: -halfSize }, { rotate: `${45 + rotate1}deg` }]
                    // 45deg offset because BorderTop+Right is 0-90 (centered at 45).
                    // Wait, borders are tricky.
                    // Let's use borderLeftColor: transparent, borderBottomColor: transparent, borderRightColor: transparent.
                    // ONLY borderTopColor: color. This is 1/4 circle? No, it's 1/4.
                    // We need 1/2 circle for 180deg.
                    // So using borderTop + borderRight = 180deg.
                    // Starts at -45deg (Top-Left).
                }} />
            </View>

            {/* THIS IS GETTING COMPLEX. LET'S USE A SIMPLER 4-Quadrant APPROACH for stability */}
            {/* Gradient Mockup for simplicity since user just wants "Belli Olsun" */}
            {/* If I can't guarantee math perfection without trial, I'll use a 4-step segmented ring */}

            {/* SEGMENT 1 (Top-Right): 0-25% */}
            {progress > 0 && (
                <View style={{ position: 'absolute', width: size, height: size, borderRadius: radius, borderWidth: strokeWidth, borderColor: 'transparent', borderTopColor: progress >= 12.5 ? color : 'transparent', borderRightColor: progress >= 37.5 ? color : 'transparent', transform: [{ rotate: '-45deg' }] }} />
            )}
            {/* SEGMENT 2 (Bottom): 50-75% */}
            {progress > 50 && (
                <View style={{ position: 'absolute', width: size, height: size, borderRadius: radius, borderWidth: strokeWidth, borderColor: 'transparent', borderBottomColor: progress >= 62.5 ? color : 'transparent', borderLeftColor: progress >= 87.5 ? color : 'transparent', transform: [{ rotate: '-45deg' }] }} />
            )}

            {/* OKAY, pure 4 borders is cleanest. 
                Full Ring = 4 borders colored.
                75% = 3 borders colored.
                50% = 2 borders colored.
                It's "Step" based but robust.
             */}

            {children}
        </View>
    );
};

// BETTER implementation:
const PropyleProgress = ({ size = 140, percentage = 0, color = '#7f13ec' }) => {
    // 4 Segments.
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 5, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            {/* We will just overlay borders on top. */}
            {/* 0-25% : Top Border (Partial? No, full segment) */}
            {/* To enable partial, we need rotation. */}
            {/* Let's Try: Just use 2 Semi Circles. */}

            <View style={{ ...StyleSheet.absoluteFillObject, borderRadius: size / 2, borderWidth: 5, borderColor: 'transparent', borderTopColor: percentage > 0 ? color : 'transparent', transform: [{ rotate: '45deg' }] }} />
            <View style={{ ...StyleSheet.absoluteFillObject, borderRadius: size / 2, borderWidth: 5, borderColor: 'transparent', borderRightColor: percentage >= 25 ? color : 'transparent', transform: [{ rotate: '45deg' }] }} />
            <View style={{ ...StyleSheet.absoluteFillObject, borderRadius: size / 2, borderWidth: 5, borderColor: 'transparent', borderBottomColor: percentage >= 50 ? color : 'transparent', transform: [{ rotate: '45deg' }] }} />
            <View style={{ ...StyleSheet.absoluteFillObject, borderRadius: size / 2, borderWidth: 5, borderColor: 'transparent', borderLeftColor: percentage >= 75 ? color : 'transparent', transform: [{ rotate: '45deg' }] }} />

            {/* The above covers 25% chunks. It's safe and visible. 
                If 70%, 3 segments will light up (Top, Right, Bottom). 75% complete.
                It's good enough for "ne kadarı dolu olduğu belli olsun".
            */}
        </View>
    )
}


const { width } = Dimensions.get('window');

const SettingsScreen = ({ navigation }) => {
    const { credits, addCredits, isBiometricEnabled, toggleBiometric, t, language, changeLanguage, logout, user, profile, updateProfile } = useUser();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
    const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);

    const handleDeleteAllData = () => {
        Alert.alert(
            t('delete_all_data_title') || 'Tüm Verileri Sil',
            t('delete_all_data_confirm') || 'Tüm rüya geçmişiniz ve notlarınız kalıcı olarak silinecek. Emin misiniz?',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.removeItem('user_dreams_history');
                            await AsyncStorage.removeItem('dream_notes');
                            Alert.alert(t('success'), t('data_deleted') || 'Veriler silindi.');
                        } catch (e) {
                            console.error(e);
                            Alert.alert(t('error'), 'Silme işlemi başarısız oldu.');
                        }
                    }
                }
            ]
        );
    };

    const [isEditProfileVisible, setEditProfileVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDate, setEditDate] = useState(new Date());
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [editGender, setEditGender] = useState('');
    const [editMarital, setEditMarital] = useState('');
    const [editJob, setEditJob] = useState('');

    // ... (keep existing states)



    // ... (keep existing render)



    // ... (render modals)


    useEffect(() => {
        if (profile) {
            setEditName(profile.full_name || '');
            if (profile.birth_date) {
                setEditDate(new Date(profile.birth_date));
            }
            setEditGender(profile.gender || '');
            setEditMarital(profile.marital_status || '');
            setEditJob(profile.job || '');
        }
    }, [profile]);

    const calculateCompleteness = () => {
        let score = 0;
        const total = 5;
        if (profile?.full_name) score++;
        if (profile?.birth_date) score++;
        if (profile?.gender) score++;
        if (profile?.marital_status) score++;
        if (profile?.job) score++;
        return Math.round((score / total) * 100);
    };
    const completionRate = calculateCompleteness();

    // Modalı açarken date picker'ın kapalı olduğundan emin ol
    const openEditProfile = () => {
        setShowEditDatePicker(false);
        setEditProfileVisible(true);
    };

    const handleSaveProfile = async () => {
        if (isSaving) return;

        setIsSaving(true);
        try {
            await updateProfile({
                full_name: editName,
                birth_date: editDate.toISOString().split('T')[0],
                gender: editGender,
                marital_status: editMarital,
                job: editJob
            });
            Alert.alert(t('success'), t('profile_updated') || 'Profil güncellendi!');
            setEditProfileVisible(false);
        } catch (error) {
            console.error(error);
            Alert.alert(t('error'), 'Error updating profile');
        } finally {
            setIsSaving(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert(t('permission_denied') || 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            // Base64 olarak kaydet
            const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;

            try {
                await updateProfile({ avatar_url: base64Img });
                alert(t('success') || 'Profile updated!');
            } catch (error) {
                console.error(error);
                alert('Error updating profile picture');
            }
        }
    };

    const LANGUAGES = [
        { code: 'tr', name: 'Türkçe', nativeName: 'Türkçe', flag: '\uD83C\uDDF9\uD83C\uDDF7' },
        { code: 'en', name: 'English', nativeName: 'English', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
        { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
        { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '\uD83C\uDDF5\uD83C\uDDF9' },
        { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '\uD83C\uDDF8\uD83C\uDDE6' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '\uD83C\uDDEE\uD83C\uDDF3' },
    ];

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert(t('error'), 'Unexpected error during logout');
        }
    };

    // Hatırlatıcı State'leri
    const [isReminderActive, setIsReminderActive] = useState(false);
    const [reminderTime, setReminderTime] = useState(new Date(new Date().setHours(7, 30, 0, 0)));
    const [showTimePicker, setShowTimePicker] = useState(false);

    const scheduleNotification = async (time) => {
        try {
            // Önceki bildirimleri temizle
            await Notifications.cancelAllScheduledNotificationsAsync();

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: t('notification_title'),
                    body: t('notification_body'),
                    sound: true,
                },
                trigger: {
                    type: 'calendar',
                    hour: time.getHours(),
                    minute: time.getMinutes(),
                    repeats: true,
                    // Android için channelId gerekli olabilir, şimdilik default bırakıyoruz
                    // iOS için type: 'calendar' otomatik algılanır
                },
            });

            // Kullanıcıya başarı mesajı (Kaydet butonundan çağrıldığında gösterilecek)
            // Ancak bu fonksiyon toggle sırasında da çalışıyor, orada alert göstermek istemeyebiliriz.
            // Bu yüzden alert olayını saveReminder'a taşıyacağız veya burada parametrik yapacağız.
            // Ancak basitlik adına burada console log basıp, saveReminder'da özel alert gösterelim.
            console.log(`Hatırlatıcı ${time.getHours()}:${time.getMinutes()} kuruldu.`);

        } catch (error) {
            console.log(error);
            Alert.alert(t('error'), t('notification_schedule_error') + error.message);
        }
    };

    const handleReminderToggle = async (value) => {
        if (value) {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('error'), t('notification_permission_denied'));
                setIsReminderActive(false);
                return;
            }
            setIsReminderActive(true);
            setShowTimePicker(true); // Direkt saati/kaydet butonunu aç
            // scheduleNotification(reminderTime); // Kaldırıldı: Kaydet butonuna basınca kurulacak
        } else {
            setIsReminderActive(false);
            setShowTimePicker(false);
            await Notifications.cancelAllScheduledNotificationsAsync();
        }
    };

    const onTimeChange = (event, selectedDate) => {
        if (selectedDate) {
            setReminderTime(selectedDate);
            // scheduleNotification ÇAĞIRMIYORUZ, Kaydet beklenecek
        }
    };



    const saveReminder = () => {
        scheduleNotification(reminderTime);
        setShowTimePicker(false);
        Alert.alert(
            t('success'),
            t('reminder_set_message', {
                hour: reminderTime.getHours().toString().padStart(2, '0'),
                minute: reminderTime.getMinutes().toString().padStart(2, '0')
            })
        );
    };

    const handleBiometricToggle = async (value) => {
        if (value) {
            try {
                // 1. Donanım Kontrolü
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                if (!hasHardware) {
                    alert(t('biometric_no_hardware'));
                    return;
                }

                // 2. Kayıt Kontrolü (FaceID/TouchID tanımlı mı?)
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                if (!isEnrolled) {
                    alert(t('biometric_not_enrolled'));
                    return;
                }

                // 3. Doğrulama İsteği
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: t('biometric_prompt'),
                    disableDeviceFallback: false, // Şifre seçeneği de olsun, belki FaceID o an çalışmıyordur
                    cancelLabel: t('cancel')
                });

                if (result.success) {
                    toggleBiometric(true);
                    alert(t('biometric_activated_success'));
                } else {
                    // Hata detayını göster (alert içinde)
                    if (result.error !== 'user_cancel') {
                        alert(`${t('authentication_failed')}: ${result.error || t('unknown_error')}`);
                    }
                }
            } catch (error) {
                alert(`${t('an_error_occurred')}: ${error.message}`);
                console.error(error);
            }
        } else {
            // Kapatıyor
            toggleBiometric(false);
        }
    };

    const ListItem = ({ icon, title, subtitle, color, type = 'arrow', value, onValueChange, onPress }) => (
        <TouchableOpacity
            style={styles.listItem}
            activeOpacity={0.7}
            disabled={type === 'switch'} // Switch ise satıra tıklanmasın, switch'e tıklansın (veya ikisi de)
            onPress={onPress}
        >
            <View style={[styles.iconContainer, { backgroundColor: `rgba(${color}, 0.1)` }]}>
                <MaterialIcons name={icon} size={20} color={`rgb(${color})`} />
            </View>
            <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{title}</Text>
                {subtitle && <Text style={styles.listItemSubtitle}>{subtitle}</Text>}
            </View>

            {type === 'arrow' && <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />}

            {
                type === 'value' && (
                    <View style={styles.valueContainer}>
                        <Text style={styles.valueText}>{value}</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
                    </View>
                )
            }

            {
                type === 'switch' && (
                    <Switch
                        trackColor={{ false: "#374151", true: "#7f13ec" }}
                        thumbColor={"#f4f3f4"}
                        ios_backgroundColor="#374151"
                        onValueChange={onValueChange}
                        value={value}
                    />
                )
            }
        </TouchableOpacity >
    );

    return (
        <View style={styles.container}>
            {/* Global Gradient Background for Header & Profile Area */}
            <LinearGradient
                colors={['rgba(127, 19, 236, 0.25)', 'transparent']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
            />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('settings')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Profile Header */}
                {/* Profile Header - Premium Redesign */}
                {/* Profile Header - Centered & Ring Design */}
                <View style={styles.profileCenteredContainer}>
                    <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.avatarRingWrapper}>
                        {/* Progress Ring Custom Component */}
                        <View style={{ width: 140, height: 140, justifyContent: 'center', alignItems: 'center' }}>
                            {/* Base Track */}
                            <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 6, borderColor: 'rgba(255,255,255,0.1)', position: 'absolute' }} />

                            {/* Rotated Container for Segments (Starts at Bottom-Right/Blue Tick) */}
                            <View style={{ position: 'absolute', width: 140, height: 140, transform: [{ rotate: '135deg' }] }}>
                                {/* Q1: 0-25% */}
                                <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 6, borderColor: 'transparent', borderTopColor: completionRate >= 10 ? (completionRate === 100 ? '#3B82F6' : '#7f13ec') : 'transparent', position: 'absolute', transform: [{ rotate: '45deg' }] }} />
                                {/* Q2: 25-50% */}
                                <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 6, borderColor: 'transparent', borderRightColor: completionRate >= 35 ? (completionRate === 100 ? '#3B82F6' : '#7f13ec') : 'transparent', position: 'absolute', transform: [{ rotate: '45deg' }] }} />
                                {/* Q3: 50-75% */}
                                <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 6, borderColor: 'transparent', borderBottomColor: completionRate >= 60 ? (completionRate === 100 ? '#3B82F6' : '#7f13ec') : 'transparent', position: 'absolute', transform: [{ rotate: '45deg' }] }} />
                                {/* Q4: 75-100% */}
                                <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 6, borderColor: 'transparent', borderLeftColor: completionRate >= 85 ? (completionRate === 100 ? '#3B82F6' : '#7f13ec') : 'transparent', position: 'absolute', transform: [{ rotate: '45deg' }] }} />
                            </View>

                            <View style={styles.avatarInnerContainer}>
                                <Image
                                    source={{ uri: profile?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXuO__OObJsFp8qm6OoJWkKNiOwhZDsQ4T_prwU9gRzHAgiirx5aRticY9bENq4Jjksje2zER-bGkY9Zd36hRV1oCTxB6P5RJzvdbPPy94cYvHNXxnSVc079wpHa-YMK0X79OjV6GvS5rGgXNlkKNR2hMvwfZTMldCodUIico2FsJn6eqvXB1FWphP74GV--PrLO9AtfBB982VpKdsDFQeOJ8vfMXa9WU_M6nq_rCXbZm6f0dGMokTj4UfF97viP_5ecKtTryLUi8' }}
                                    style={styles.avatarLarge}
                                />
                            </View>
                        </View>

                        {/* Status Badge (Solid Layered Style) */}
                        <View style={styles.verifiedBadgeWrapper}>
                            {/* 1. Background Shape (Solid Star) */}
                            <MaterialCommunityIcons
                                name={completionRate === 100 ? "decagram" : "decagram"}
                                size={38}
                                color={completionRate === 100 ? '#3B82F6' : '#374151'}
                            />

                            {/* 2. Checkmark (Overlay) */}
                            <View style={{ position: 'absolute' }}>
                                <MaterialCommunityIcons
                                    name="check-bold"
                                    size={20}
                                    color={completionRate === 100 ? 'white' : '#6B7280'}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.userNameLarge}>{profile?.full_name || t('guest_user') || 'User'}</Text>

                    {profile?.zodiac_sign && (
                        <View style={styles.zodiacRow}>
                            <MaterialCommunityIcons name={`zodiac-${profile.zodiac_sign}`} size={16} color="#D8B4FE" />
                            <Text style={styles.zodiacTextLarge}>{t(profile.zodiac_sign)}</Text>
                            {profile?.birth_date && (
                                <>
                                    <View style={styles.separatorDotLarge} />
                                    <Text style={styles.ageTextLarge}>
                                        {new Date().getFullYear() - new Date(profile.birth_date).getFullYear()} {t('age')}
                                    </Text>
                                </>
                            )}
                        </View>
                    )}
                </View>

                {/* Incomplete Profile Warning Banner */}
                {completionRate < 100 && (
                    <TouchableOpacity
                        style={styles.incompleteWarningContainer}
                        onPress={openEditProfile}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.incompleteWarningGradient}
                        >
                            <View style={styles.warningIconContainer}>
                                <MaterialCommunityIcons name="alert-decagram" size={28} color="#F59E0B" />
                            </View>
                            <View style={styles.warningTextContainer}>
                                <Text style={styles.warningTitle}>{t('profile_incomplete_title')}</Text>
                                <Text style={styles.warningDesc}>{t('profile_incomplete_desc')}</Text>
                            </View>
                            <View style={styles.warningArrowContainer}>
                                <MaterialIcons name="chevron-right" size={24} color="#F59E0B" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Section: Cüzdan */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t('wallet_balance').toUpperCase()}</Text>

                    {/* Premium Kredi Kartı Görünümü */}
                    <View style={styles.walletCardContainer}>
                        <LinearGradient
                            colors={['#4c1d95', '#7f13ec', '#d946ef']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.walletCardBackground}
                        >
                            {/* Kart Üst Bilgi */}
                            <View style={styles.cardHeader}>
                                <View style={styles.cardChip}>
                                    <MaterialCommunityIcons name="integrated-circuit-chip" size={32} color="rgba(255,255,255,0.8)" />
                                    <MaterialCommunityIcons name="wifi" size={20} color="rgba(255,255,255,0.6)" style={{ marginLeft: 8 }} />
                                </View>
                                <Text style={styles.cardBrand}>DREAM CARD</Text>
                            </View>

                            {/* Bakiye Bilgisi */}
                            <View style={styles.cardBody}>
                                <Text style={styles.balanceLabel}>{t('current_credits')}</Text>
                                <View style={styles.balanceRow}>
                                    <Text style={styles.balanceValue}>{credits}</Text>
                                    <Text style={styles.balanceUnit}>KRD</Text>
                                </View>
                            </View>

                            {/* Alt Bilgi & Aksiyon */}
                            <View style={styles.cardFooter}>
                                <View>
                                    <Text style={styles.cardHolderLabel}>{t('card_holder').toUpperCase()}</Text>
                                    <Text style={styles.cardHolderName}>{profile?.full_name ? profile.full_name.toUpperCase() : (user ? 'USER' : 'GUEST')}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.loadCreditsButton}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        addCredits(5);
                                        alert('5 Kredi yüklendi!');
                                    }}
                                >
                                    <MaterialIcons name="add-circle-outline" size={18} color="white" />
                                    <Text style={styles.loadCreditsText}>{t('load')}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Dekoratif Daireler */}
                            <View style={styles.decorativeCircle1} />
                            <View style={styles.decorativeCircle2} />
                        </LinearGradient>
                    </View>
                </View>

                {/* Section: Hesap */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t('account').toUpperCase()}</Text>
                    <View style={styles.card}>
                        <View style={styles.cardItem}>
                            <ListItem
                                icon="person"
                                title={t('personal_info')}
                                color="127, 19, 236"
                                onPress={openEditProfile}
                            />
                        </View>
                        <View style={[styles.divider, { marginLeft: 64 }]} />
                        <View style={styles.cardItem}>
                            <ListItem
                                icon="security"
                                title={t('privacy_settings')}
                                subtitle={t('biometric_and_data') || 'Biyometrik & Veri'}
                                color="127, 19, 236"
                                onPress={() => setPrivacyModalVisible(true)}
                            />
                        </View>
                    </View>
                </View>

                {/* Section: Uygulama Tercihleri */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t('app_preferences').toUpperCase()}</Text>
                    <View style={styles.card}>
                        <View style={styles.cardItem}>
                            <ListItem
                                icon="notifications"
                                title={t('notifications')}
                                color="249, 115, 22"
                                type="switch"
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                            />
                        </View>
                        <View style={[styles.divider, { marginLeft: 0 }]} />
                        <View style={styles.cardItem}>
                            <ListItem
                                icon="language"
                                title={t('language')}
                                color="59, 130, 246"
                                type="value"
                                value={LANGUAGES.find(l => l.code === language)?.nativeName || 'English'}
                                onPress={() => setLanguageModalVisible(true)}
                            />
                        </View>
                        <View style={[styles.divider, { marginLeft: 0 }]} />
                        <View style={styles.cardItem}>
                            <ListItem
                                icon="alarm"
                                title={t('daily_reminder')}
                                subtitle={t('reminder_subtitle')}
                                color="168, 85, 247"
                                type="switch"
                                value={isReminderActive}
                                onValueChange={handleReminderToggle}
                            />

                            {isReminderActive && !showTimePicker && (
                                <TouchableOpacity
                                    style={styles.pickerTimeButton}
                                    onPress={() => setShowTimePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.pickerLabel}>{t('notification_time')}</Text>
                                    <View style={styles.pickerBadge}>
                                        <Text style={styles.pickerTimeText}>
                                            {reminderTime.getHours().toString().padStart(2, '0')}:{reminderTime.getMinutes().toString().padStart(2, '0')}
                                        </Text>
                                        <MaterialIcons name="edit" size={14} color="#d8b4fe" style={{ marginLeft: 6 }} />
                                    </View>
                                </TouchableOpacity>
                            )}

                            {isReminderActive && showTimePicker && (
                                <View style={styles.pickerContainer}>
                                    <View style={styles.pickerHeader}>
                                        <Text style={styles.pickerLabel}>{t('set_time')}</Text>
                                    </View>
                                    <DateTimePicker
                                        value={reminderTime}
                                        mode="time"
                                        is24Hour={true}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onTimeChange}
                                        textColor="white"
                                        themeVariant="dark"
                                        style={styles.datePicker}
                                    />
                                    <TouchableOpacity
                                        style={styles.saveButton}
                                        onPress={saveReminder}
                                    >
                                        <Text style={styles.saveButtonText}>{t('save')}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Section: Destek */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t('support').toUpperCase()}</Text>
                    <View style={styles.card}>
                        <View style={styles.cardItem}>
                            <ListItem icon="help" title={t('help_center')} color="20, 184, 166" />
                        </View>
                        <View style={[styles.divider, { marginLeft: 64 }]} />
                        <View style={styles.cardItem}>
                            <ListItem icon="star" title={t('rate_us')} color="236, 72, 153" />
                        </View>
                    </View>
                </View>

                {/* Footer Actions */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <MaterialIcons name="logout" size={20} color="#EF4444" />
                        <Text style={styles.logoutText}>{t('logout')}</Text>
                    </TouchableOpacity>

                    <View style={styles.versionInfo}>
                        <Text style={styles.versionText}>© 2023 Tüm hakları saklıdır</Text>
                    </View>
                </View>

            </ScrollView>

            <Modal
                animationType="fade"
                transparent={true}
                visible={isLanguageModalVisible}
                onRequestClose={() => setLanguageModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.languageModalOverlay}
                    activeOpacity={1}
                    onPress={() => setLanguageModalVisible(false)}
                >
                    <View style={styles.languageModalContent}>
                        <Text style={styles.languageModalTitle}>Dil Seçin / Select Language</Text>
                        {LANGUAGES.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.languageOption,
                                    language === lang.code && styles.languageOptionSelected
                                ]}
                                onPress={() => {
                                    changeLanguage(lang.code);
                                    setLanguageModalVisible(false);
                                }}
                            >
                                <Text style={styles.languageFlag}>{lang.flag}</Text>
                                <Text style={[
                                    styles.languageName,
                                    language === lang.code && styles.languageNameSelected
                                ]}>{lang.nativeName}</Text>
                                {language === lang.code && (
                                    <MaterialIcons name="check" size={20} color="#7f13ec" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isEditProfileVisible}
                onRequestClose={() => setEditProfileVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('personal_info')}</Text>
                            <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>{t('onboarding_name_label') || 'Name'}</Text>
                        <TextInput
                            style={styles.input}
                            value={editName}
                            onChangeText={setEditName}
                            placeholderTextColor="#666"
                        />

                        <Text style={styles.inputLabel}>{t('onboarding_date_label') || 'Birth Date'}</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowEditDatePicker(!showEditDatePicker)}
                        >
                            <Text style={styles.dateButtonText}>
                                {editDate.toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </Text>
                            <MaterialIcons name="calendar-today" size={20} color="#d8b4fe" />
                        </TouchableOpacity>

                        {showEditDatePicker && (
                            <DateTimePicker
                                value={editDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedDate) => {
                                    setShowEditDatePicker(Platform.OS === 'ios');
                                    if (selectedDate) setEditDate(selectedDate);
                                }}
                                maximumDate={new Date()}
                                locale={language === 'tr' ? 'tr-TR' : 'en-US'}
                                textColor="white"
                                themeVariant="dark"
                            />
                        )}

                        <Text style={styles.inputLabel}>{t('label_gender')}</Text>
                        <View style={styles.selectionRow}>
                            {['male', 'female', 'other'].map(g => (
                                <TouchableOpacity
                                    key={g}
                                    style={[styles.selectionButton, editGender === g && styles.selectionButtonActive]}
                                    onPress={() => setEditGender(g)}
                                >
                                    <Text style={[styles.selectionText, editGender === g && styles.selectionTextActive]}>{t(`gender_${g}`)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>{t('label_marital')}</Text>
                        <View style={[styles.selectionRow, { flexWrap: 'wrap' }]}>
                            {['single', 'relationship', 'married', 'divorced'].map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[
                                        styles.selectionButton,
                                        editMarital === s && styles.selectionButtonActive,
                                        { minWidth: '44%' } // Force 2 columns (gap handles spacing)
                                    ]}
                                    onPress={() => setEditMarital(s)}
                                >
                                    <Text
                                        style={[
                                            styles.selectionText,
                                            editMarital === s && styles.selectionTextActive,
                                            { textAlign: 'center', fontSize: 11 } // Smaller font for really long texts
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {t(`marital_${s}`)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>{t('label_job')}</Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 12 }]}
                            value={editJob}
                            onChangeText={setEditJob}
                            placeholder={t('job_placeholder')}
                            placeholderTextColor="#666"
                        />
                        <View style={{ height: 50 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                                {['student', 'education', 'health', 'engineer', 'freelance', 'retired', 'unemployed'].map(jobKey => {
                                    const jobLabel = t(`job_${jobKey}`);
                                    const isSelected = editJob === jobLabel;
                                    return (
                                        <TouchableOpacity
                                            key={jobKey}
                                            style={[styles.chip, isSelected && styles.chipActive]}
                                            onPress={() => setEditJob(jobLabel)}
                                        >
                                            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{jobLabel}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                            onPress={handleSaveProfile}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.saveButtonText}>{t('save')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isPrivacyModalVisible}
                onRequestClose={() => setPrivacyModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('privacy_settings')}</Text>
                            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardItem}>
                                <ListItem
                                    icon="fingerprint"
                                    title={t('biometric_lock')}
                                    subtitle={t('biometric_subtitle')}
                                    color="127, 19, 236"
                                    type="switch"
                                    value={isBiometricEnabled}
                                    onValueChange={handleBiometricToggle}
                                />
                            </View>
                        </View>


                        <View style={[styles.card, { marginTop: 16 }]}>
                            <TouchableOpacity
                                style={[styles.cardItem, { padding: 16, flexDirection: 'row', alignItems: 'center' }]}
                                onPress={handleDeleteAllData}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <MaterialIcons name="delete-forever" size={20} color="#EF4444" />
                                </View>
                                <View style={{ marginLeft: 16, flex: 1 }}>
                                    <Text style={[styles.listItemTitle, { color: '#EF4444' }]}>{t('delete_all_data') || 'Tüm Verileri Sil'}</Text>
                                    <Text style={styles.listItemSubtitle}>{t('delete_all_data_desc') || 'Bu işlem geri alınamaz'}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Terms Link */}
                        <TouchableOpacity style={{ marginTop: 20, alignSelf: 'center' }}>
                            <Text style={{ color: '#6B7280', fontSize: 12, textDecorationLine: 'underline' }}>{t('privacy_policy')} & {t('terms_of_service')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal >
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#191022',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Centered
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontFamily: 'SplineSans_700Bold',
        textAlign: 'center',
    },
    scrollContent: {
        paddingBottom: 100, // Tab bar için
    },
    profileSectionContainer: {
        marginBottom: 24,
        overflow: 'hidden',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        // Background controlled by global gradient
    },
    profileBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    profileContent: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 32,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 16,
        shadowColor: '#7f13ec',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
    },
    avatarGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: 'rgba(127, 19, 236, 0.3)',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#191022', // İç çerçeve
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#7f13ec',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#191022',
    },
    userInfo: {
        alignItems: 'center',
        gap: 6,
    },
    userName: {
        color: 'white',
        fontSize: 24,
        fontFamily: 'SplineSans_700Bold',
        letterSpacing: 0.5,
    },
    userEmail: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontFamily: 'SplineSans_500Medium',
    },
    zodiacBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(127, 19, 236, 0.15)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(127, 19, 236, 0.3)',
        marginTop: 4,
        marginBottom: 4,
    },
    zodiacText: {
        color: '#D8B4FE',
        fontSize: 13,
        fontFamily: 'SplineSans_600SemiBold',
        marginLeft: 6,
    },
    separatorDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 8,
    },
    ageText: {
        color: '#D8B4FE',
        fontSize: 13,
        fontFamily: 'SplineSans_500Medium',
    },
    section: {
        marginTop: 24,
    },
    sectionHeader: {
        paddingHorizontal: 24,
        marginBottom: 8,
        color: '#ad92c9',
        fontSize: 12,
        fontFamily: 'SplineSans_600SemiBold',
        letterSpacing: 1,
    },
    card: {
        marginHorizontal: 16,
        backgroundColor: '#2a1e36',
        borderRadius: 16,
        overflow: 'hidden',
    },
    cardItem: {
        // Wrapper for spacing if needed
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listItemContent: {
        flex: 1,
    },
    listItemTitle: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_500Medium',
    },
    listItemSubtitle: {
        color: '#ad92c9',
        fontSize: 12,
        marginTop: 4,
        fontFamily: 'SplineSans_400Regular',
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginRight: 4,
    },
    valueText: {
        color: '#E9D5FF', // Daha okunabilir açık mor
        fontSize: 14,
        fontFamily: 'SplineSans_500Medium',
    },
    pickerContainer: {
        marginTop: 12,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    pickerLabel: {
        color: '#9CA3AF',
        fontSize: 14,
        fontFamily: 'SplineSans_500Medium',
    },
    pickerBadge: {
        backgroundColor: 'rgba(127, 19, 236, 0.2)',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(127, 19, 236, 0.4)',
    },
    pickerTimeText: {
        color: '#d8b4fe',
        fontSize: 16,
        fontFamily: 'SplineSans_700Bold',
    },
    saveButton: {
        backgroundColor: '#7f13ec',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_600SemiBold',
    },
    pickerTimeButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 16,
        borderRadius: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    footer: {
        marginTop: 32,
        paddingHorizontal: 24,
        paddingBottom: 32,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        gap: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 16,
        fontFamily: 'SplineSans_500Medium',
    },
    versionInfo: {
        marginTop: 24,
        alignItems: 'center',
        gap: 4,
    },
    versionText: {
        color: '#6B7280',
        fontSize: 12,
    },
    walletCardContainer: {
        marginHorizontal: 16,
        borderRadius: 20,
        overflow: 'hidden', // Gradient border radius için
        elevation: 10,
        shadowColor: '#7f13ec',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    modalContent: {
        backgroundColor: '#1E1428',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontFamily: 'SplineSans_700Bold',
    },
    inputLabel: {
        color: '#A1A1AA',
        marginBottom: 8,
        marginTop: 16,
        fontFamily: 'SplineSans_500Medium',
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        color: 'white',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        fontFamily: 'SplineSans_400Regular',
    },
    dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    dateButtonText: {
        color: 'white',
        fontFamily: 'SplineSans_400Regular',
    },
    walletCardBackground: {
        borderRadius: 20,
        padding: 24,
        overflow: 'hidden',
        minHeight: 200,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardChip: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardBrand: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontFamily: 'SplineSans_700Bold',
        letterSpacing: 2,
    },
    cardBody: {
        marginVertical: 20,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontFamily: 'SplineSans_500Medium',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    balanceValue: {
        color: 'white',
        fontSize: 42,
        fontFamily: 'SplineSans_700Bold',
        lineHeight: 48,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    balanceUnit: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontFamily: 'SplineSans_600SemiBold',
        marginBottom: 10,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    cardHolderLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 2,
    },
    cardHolderName: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_500Medium',
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    loadCreditsButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 30,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    loadCreditsText: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'SplineSans_600SemiBold',
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.1)',
        top: -50,
        right: -50,
    },
    completenessContainer: {
        marginTop: 12,
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    completenessHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    completenessLabel: {
        color: '#D8B4FE',
        fontSize: 12,
        fontFamily: 'SplineSans_600SemiBold',
    },
    completenessValue: {
        color: 'white',
        fontSize: 12,
        fontFamily: 'SplineSans_700Bold',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    completenessHint: {
        color: '#9CA3AF',
        fontSize: 10,
        marginTop: 6,
        fontStyle: 'italic',
    },
    selectionRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    selectionButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    selectionButtonActive: {
        backgroundColor: 'rgba(127, 19, 236, 0.2)',
        borderColor: '#7f13ec',
    },
    selectionText: {
        color: '#9CA3AF',
        fontSize: 12,
        fontFamily: 'SplineSans_400Regular',
    },
    selectionTextActive: {
        color: 'white',
        fontFamily: 'SplineSans_600SemiBold',
    },
    chip: {
        backgroundColor: '#1f1625', // Daha belirgin koyu zemin
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24, // Daha yuvarlak
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    chipActive: {
        backgroundColor: '#7f13ec', // Parlak mor
        borderColor: '#9d4edd',
    },
    chipText: {
        color: '#9CA3AF',
        fontSize: 13,
        fontFamily: 'SplineSans_500Medium',
    },
    chipTextActive: {
        color: 'white',
        fontWeight: 'bold',
        fontFamily: 'SplineSans_700Bold',
    },
    // Profile Centered Redesign
    profileCenteredContainer: {
        alignItems: 'center',
        marginVertical: 24,
    },
    avatarRingWrapper: {
        marginBottom: 16,
        position: 'relative',
    },
    avatarRingGradient: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5, // Thicker ring
    },
    avatarInnerContainer: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: '#191022', // Space between ring and avatar
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLarge: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 0,
    },
    verifiedBadgeWrapper: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Removed old backgrounds as we use layering now
    userNameLarge: {
        color: 'white',
        fontSize: 24,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 8,
    },
    zodiacRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    zodiacTextLarge: {
        color: '#D8B4FE',
        flexDirection: 'row',
        alignItems: 'center',
        fontFamily: 'SplineSans_500Medium',
        fontSize: 14,
    },
    separatorDotLarge: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 4,
    },
    ageTextLarge: {
        color: '#9CA3AF',
        fontSize: 14,
        fontFamily: 'SplineSans_500Medium',
    },
    completenessHeaderMinimal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    completenessLabelMinimal: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontFamily: 'SplineSans_500Medium',
    },
    completenessValueMinimal: {
        color: '#D8B4FE',
        fontSize: 11,
        fontFamily: 'SplineSans_600SemiBold',
    },
    progressBarBgMinimal: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },

    decorativeCircle2: {
        position: 'absolute',
        bottom: -30,
        left: -30,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    languageModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    languageModalContent: {
        width: '80%',
        backgroundColor: '#2a1e36',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    languageModalTitle: {
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
        color: 'white',
        marginBottom: 20,
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        width: '100%',
        borderRadius: 12,
        marginBottom: 8,
    },
    languageOptionSelected: {
        backgroundColor: 'rgba(127, 19, 236, 0.1)',
        borderWidth: 1,
        borderColor: '#7f13ec',
    },
    languageFlag: {
        fontSize: 24,
        marginRight: 12,
    },
    languageName: {
        fontSize: 16,
        fontFamily: 'SplineSans_500Medium',
        color: '#ad92c9',
        flex: 1,
    },
    languageNameSelected: {
        color: '#d8b4fe',
        fontFamily: 'SplineSans_700Bold',
    },
    // Incomplete Warning Styles
    incompleteWarningContainer: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)', // Amber-500 equivalent
        overflow: 'hidden',
    },
    incompleteWarningGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    warningIconContainer: {
        marginRight: 16,
        padding: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: 12,
    },
    warningTextContainer: {
        flex: 1,
    },
    warningTitle: {
        color: '#F59E0B',
        fontSize: 16,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 4,
    },
    warningDesc: {
        color: '#D1D5DB', // Gray-300
        fontSize: 12,
        fontFamily: 'SplineSans_400Regular',
        lineHeight: 18,
    },
    warningArrowContainer: {
        marginLeft: 8,
    },
});

export default SettingsScreen;
