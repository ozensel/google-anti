import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, StatusBar, Platform, ScrollView, TextInput, ActivityIndicator, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useFonts, SplineSans_300Light, SplineSans_400Regular, SplineSans_500Medium, SplineSans_600SemiBold, SplineSans_700Bold } from '@expo-google-fonts/spline-sans';
import { useUser } from '../context/UserContext'; // Added

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
    const { t, login, register } = useUser(); // useUser'dan fonksiyonları al
    const [authMode, setAuthMode] = React.useState(null); // 'login' | 'signup' | null
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    let [fontsLoaded] = useFonts({
        SplineSans_300Light,
        SplineSans_400Regular,
        SplineSans_500Medium,
        SplineSans_600SemiBold,
        SplineSans_700Bold,
    });

    if (!fontsLoaded) {
        return <View style={styles.loadingContainer} />;
    }

    const handleAuth = async () => {
        if (!email || !password) {
            alert(t('error_fill_fields') || 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (authMode === 'login') {
                await login(email, password);
            } else {
                const { session } = await register(email, password);

                // Eğer mail doğrulama kapalıysa session hemen gelir, direkt giriş yaparız
                if (!session) {
                    alert(t('success_register') || 'Registration successful! Please log in.');
                    setAuthMode('login');
                    setLoading(false);
                    return;
                }
            }
            // Navigation is handled automatically by AppNavigator
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Ambient Background Glow */}
            <View style={styles.glowContainer}>
                <View style={styles.glow} />
            </View>

            {/* Auth Modal */}
            {authMode && (
                <View style={styles.authOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.authModal}>
                                <TouchableOpacity style={styles.closeButton} onPress={() => setAuthMode(null)}>
                                    <Ionicons name="close" size={24} color="white" />
                                </TouchableOpacity>

                                <Text style={styles.authTitle}>
                                    {authMode === 'login' ? t('welcome_login') : t('welcome_create_account')}
                                </Text>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Email"
                                        placeholderTextColor="#9CA3AF"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Password"
                                        placeholderTextColor="#9CA3AF"
                                        secureTextEntry
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.authButton}
                                    onPress={handleAuth}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.authButtonText}>
                                            {authMode === 'login' ? t('welcome_login') : t('welcome_create_account')}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            )}

            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >

                    {/* Top Section: Hero Visual */}
                    <View style={styles.heroSection}>
                        <View style={styles.cardContainer}>
                            <Image
                                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAECeTcnAxdXwyXRoxUbWPlQgeJtRNOndhml0UliUyUg1IsSxkX6uRfqHlcoHimZ-fHFMRwriOw5Uce9MXcN4b7qacQKpwszDX2EpKRiym4o06DatzGmgURIOb8mMDTZfboBCzsh2mBV0B7YeIxVNQOxY8sQTSE4a_778orznpXoW4YfMv8fucFk3eeoFBI3NUEMb5N5uvGOOl4aifIDho9gZVrPpxLWKfsu4wRK-9ObpHAU9cUoORzzNK2TxDxDY498hhZ33tB6Lw' }}
                                style={styles.heroImage}
                                resizeMode="cover"
                            />

                            {/* Overlay Gradient */}
                            <LinearGradient
                                colors={['transparent', 'rgba(25, 16, 34, 0.2)', 'rgba(25, 16, 34, 0.9)']}
                                style={styles.heroGradient}
                            />

                            {/* Floating Badge (BlurView -> View) */}
                            <View style={[styles.badge, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                                <Ionicons name="sparkles" size={16} color="white" />
                                <Text style={styles.badgeText}>{t('welcome_ai_powered')}</Text>
                            </View>

                            {/* Inner Content */}
                            <View style={styles.heroContent}>
                                <Text style={styles.heroTitle}>DreamAI</Text>
                                <Text style={styles.heroSubtitle}>{t('welcome_subtitle')}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Bottom Section: Text & Actions */}
                    <View style={styles.bottomSection}>
                        <Text style={styles.description}>
                            {t('welcome_description')}
                        </Text>

                        <View style={styles.buttonGroup}>
                            {/* Hesap Oluştur */}
                            <TouchableOpacity
                                style={styles.primaryButton}
                                activeOpacity={0.9}
                                onPress={() => setAuthMode('signup')}
                            >
                                <LinearGradient
                                    colors={['#7f13ec', '#650ecc']}
                                    style={styles.gradientButtonBg}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 0, y: 1 }}
                                />
                                <View style={styles.buttonContent}>
                                    <Ionicons name="person-add-outline" size={20} color="white" />
                                    <Text style={styles.primaryButtonText}>{t('welcome_create_account')}</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Giriş Yap */}
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                activeOpacity={0.8}
                                onPress={() => setAuthMode('login')}
                            >
                                <Ionicons name="log-in-outline" size={20} color="white" />
                                <Text style={styles.secondaryButtonText}>{t('welcome_login')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>{t('welcome_or')}</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social Login Buttons */}
                        <View style={{ gap: 12 }}>
                            <TouchableOpacity style={styles.socialButton} activeOpacity={0.9}>
                                <AntDesign name="google" size={22} color="black" />
                                <Text style={styles.socialButtonText}>{t('welcome_google')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.socialButton} activeOpacity={0.9}>
                                <Ionicons name="logo-apple" size={22} color="black" />
                                <Text style={styles.socialButtonText}>{t('welcome_apple')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Misafir Girişi */}
                        <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => alert(t('guest_login_coming_soon') || "Guest login coming soon!")}>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'SplineSans_500Medium', textDecorationLine: 'underline' }}>{t('welcome_guest')}</Text>
                        </TouchableOpacity>

                        {/* Footer Links */}
                        <View style={styles.footerLinks}>
                            <TouchableOpacity><Text style={styles.linkText}>{t('welcome_privacy')}</Text></TouchableOpacity>
                            <View style={styles.linkDot} />
                            <TouchableOpacity><Text style={styles.linkText}>{t('welcome_terms')}</Text></TouchableOpacity>
                        </View>

                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

// ... Styles (Aşağıdaki aynı kalıcak şekilde, zaten dosya tamamen yazılıyor)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#191022',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#191022',
    },
    safeArea: {
        flex: 1,
    },
    glowContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
    },
    glow: {
        width: width,
        height: height * 0.6,
        backgroundColor: 'rgba(127, 19, 236, 0.2)',
        borderRadius: width / 2,
        transform: [{ scaleX: 1.5 }, { translateY: -height * 0.1 }],
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: 'center',
    },
    heroSection: {
        alignItems: 'center',
        marginVertical: 20,
        width: '100%',
    },
    cardContainer: {
        width: '100%',
        maxWidth: 340,
        aspectRatio: 4 / 5,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#7f13ec',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    badge: {
        position: 'absolute',
        top: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
    },
    badgeText: {
        color: 'white',
        fontSize: 11,
        fontFamily: 'SplineSans_500Medium',
        marginLeft: 6,
        letterSpacing: 0.5,
    },
    heroContent: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    heroTitle: {
        color: 'white',
        fontSize: 32,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontFamily: 'SplineSans_500Medium',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    bottomSection: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        marginBottom: Platform.OS === 'ios' ? 0 : 20,
    },
    description: {
        color: '#E2E8F0',
        fontSize: 16,
        fontFamily: 'SplineSans_400Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    buttonGroup: {
        gap: 12,
    },
    primaryButton: {
        height: 56,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#7f13ec',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    gradientButtonBg: {
        ...StyleSheet.absoluteFillObject,
    },
    buttonContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_700Bold',
        letterSpacing: 0.5,
    },
    secondaryButton: {
        height: 56,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 8,
    },
    secondaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_700Bold',
        letterSpacing: 0.5,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
        opacity: 0.6,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#4B5563',
    },
    dividerText: {
        marginHorizontal: 16,
        color: '#9CA3AF',
        fontSize: 11,
        fontFamily: 'SplineSans_500Medium',
        letterSpacing: 1,
    },
    socialButton: {
        height: 56,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        gap: 10,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    socialButtonText: {
        color: 'black',
        fontSize: 16,
        fontFamily: 'SplineSans_700Bold',
        letterSpacing: 0.3,
    },
    footerLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        gap: 12,
    },
    linkText: {
        color: '#6B7280',
        fontSize: 12,
        fontFamily: 'SplineSans_400Regular',
    },
    linkDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#4B5563',
    },
    authOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    authModal: {
        width: '85%',
        backgroundColor: '#1F1626',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
    },
    authTitle: {
        color: 'white',
        fontSize: 24,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    input: {
        height: 50,
        color: 'white',
        paddingHorizontal: 16,
        fontFamily: 'SplineSans_400Regular',
    },
    authButton: {
        backgroundColor: '#7f13ec',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    authButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_600SemiBold',
    },
});

export default WelcomeScreen;
