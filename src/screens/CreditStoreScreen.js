import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Dimensions, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const CreditStoreScreen = ({ navigation }) => {
    const { credits, addCredits, t, language } = useUser();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    const CREDIT_PACKS = [
        {
            id: 'starter',
            credits: 3,
            price: '₺29.99',
            name: language === 'tr' ? 'Başlangıç Paketi' : 'Starter Pack',
            icon: 'star',
            color: ['#4F46E5', '#4338CA'],
            gradient: ['rgba(79, 70, 229, 0.2)', 'rgba(67, 56, 202, 0.4)'],
            popular: false
        },
        {
            id: 'popular',
            credits: 10,
            price: '₺79.99',
            name: language === 'tr' ? 'Kahins Paketi' : 'Dreamer Pack',
            icon: 'moon',
            color: ['#A855F7', '#7C3AED'],
            gradient: ['rgba(168, 85, 247, 0.2)', 'rgba(124, 58, 237, 0.4)'],
            popular: true
        },
        {
            id: 'best_value',
            credits: 25,
            price: '₺149.99',
            name: language === 'tr' ? 'Guru Paketi' : 'Guru Pack',
            icon: 'diamond',
            color: ['#EC4899', '#DB2777'],
            gradient: ['rgba(236, 72, 153, 0.2)', 'rgba(219, 39, 119, 0.4)'],
            popular: false,
            bestValue: true
        }
    ];

    const handlePurchase = async (pack) => {
        setLoading(true);
        setTimeout(async () => {
            setLoading(false);
            await addCredits(pack.credits);
            Alert.alert(
                language === 'tr' ? 'Satın Alma Başarılı! 🔮' : 'Purchase Successful! 🔮',
                language === 'tr'
                    ? `${pack.credits} Kredi hesabınıza eklendi. Geleceği keşfetmeye hazırsınız!`
                    : `${pack.credits} Credits added. You are ready to explore the future!`,
                [{ text: 'Tamam', onPress: () => navigation.goBack() }]
            );
        }, 1500);
    };

    return (
        <View style={styles.container}>
            {/* Ambient Background Glows */}
            <View style={[styles.glowOrb, { top: -100, left: -50, backgroundColor: '#4C1D95' }]} />
            <View style={[styles.glowOrb, { bottom: -100, right: -50, backgroundColor: '#BE185D' }]} />

            <BlurView intensity={30} style={StyleSheet.absoluteFillObject} tint="dark" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.balanceTag}>
                    <Ionicons name="diamond" size={14} color="#FCD34D" />
                    <Text style={styles.balanceText}>{credits}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.heroIconContainer}>
                        <LinearGradient
                            colors={['#A855F7', '#7C3AED']}
                            style={styles.heroIconGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <MaterialCommunityIcons name="crystal-ball" size={64} color="white" />
                        </LinearGradient>
                        <View style={styles.heroRing} />
                        <View style={[styles.heroRing, { width: 140, height: 140, opacity: 0.1 }]} />
                    </View>

                    <Text style={styles.heroTitle}>
                        {t('store') || 'Kredi Marketi'}
                    </Text>
                    <Text style={styles.heroSubtitle}>
                        {language === 'tr'
                            ? 'Bilinçaltının derinliklerine inmek için kredilerini kullan.'
                            : 'Use your credits to dive deep into your subconscious.'}
                    </Text>
                </View>

                {/* Credit Packs */}
                <View style={styles.packsContainer}>
                    {CREDIT_PACKS.map((pack) => (
                        <TouchableOpacity
                            key={pack.id}
                            style={[
                                styles.packCard,
                                pack.popular && styles.packCardPopular,
                                pack.bestValue && styles.packCardValue
                            ]}
                            onPress={() => handlePurchase(pack)}
                            activeOpacity={0.9}
                            disabled={loading}
                        >
                            {/* Card Background Gradient */}
                            <LinearGradient
                                colors={['#2A1F3D', '#1F1629']}
                                style={StyleSheet.absoluteFillObject}
                            />

                            {/* Selection Border/Glow for Popular items */}
                            {(pack.popular || pack.bestValue) && (
                                <LinearGradient
                                    colors={pack.color}
                                    style={[StyleSheet.absoluteFill, { opacity: 0.1 }]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            )}

                            {/* Badges */}
                            {pack.popular && (
                                <View style={styles.badgeContainer}>
                                    <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                        <Text style={styles.badgeText}>{t('popular')}</Text>
                                    </LinearGradient>
                                </View>
                            )}
                            {pack.bestValue && (
                                <View style={styles.badgeContainer}>
                                    <LinearGradient colors={['#F43F5E', '#E11D48']} style={styles.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                        <Text style={styles.badgeText}>{t('best_value')}</Text>
                                    </LinearGradient>
                                </View>
                            )}

                            <View style={styles.packContent}>
                                {/* Left: Icon & Credits */}
                                <View style={styles.packLeft}>
                                    <View style={[styles.packIconBox, { backgroundColor: pack.color[0] + '20' }]}>
                                        <Ionicons name={pack.icon} size={24} color={pack.color[0]} />
                                    </View>
                                    <View>
                                        <Text style={styles.packCredits}>{pack.credits} {t('credits')}</Text>
                                        <Text style={styles.packName}>{pack.name}</Text>
                                    </View>
                                </View>

                                {/* Right: Price */}
                                <View style={styles.priceButton}>
                                    <Text style={styles.priceText}>{pack.price}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.footer}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#6B7280" />
                    <Text style={styles.footerText}>
                        {language === 'tr'
                            ? 'Güvenli Ödeme & Anında Teslimat'
                            : 'Secure Payment & Instant Delivery'}
                    </Text>
                </View>

            </ScrollView>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <BlurView intensity={30} style={StyleSheet.absoluteFillObject} tint="dark" />
                    <ActivityIndicator size="large" color="#A855F7" />
                    <Text style={styles.loadingText}>{language === 'tr' ? 'İşleniyor...' : 'Processing...'}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0914', // Deepest dark
    },
    glowOrb: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    balanceText: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'SplineSans_700Bold',
    },
    content: {
        padding: 24,
        paddingBottom: 50,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 10,
    },
    heroIconContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    heroIconGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    heroRing: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
        zIndex: 1,
    },
    heroTitle: {
        color: 'white',
        fontSize: 28,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSubtitle: {
        color: '#9CA3AF',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        fontFamily: 'SplineSans_400Regular',
        paddingHorizontal: 20,
    },
    packsContainer: {
        gap: 16,
    },
    packCard: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        height: 88,
        justifyContent: 'center',
    },
    packCardPopular: {
        borderColor: '#A855F7',
        height: 96, // Slightly taller
        transform: [{ scale: 1.02 }],
    },
    packCardValue: {
        borderColor: '#EC4899',
    },
    badgeContainer: {
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 10,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderBottomLeftRadius: 16,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontFamily: 'SplineSans_700Bold',
        letterSpacing: 0.5,
    },
    packContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: '100%',
    },
    packLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    packIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    packCredits: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 2,
    },
    packName: {
        color: '#9CA3AF',
        fontSize: 13,
        fontFamily: 'SplineSans_500Medium',
    },
    priceButton: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
    },
    priceText: {
        color: '#0F0914',
        fontSize: 15,
        fontFamily: 'SplineSans_700Bold',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 32,
    },
    footerText: {
        color: '#6B7280',
        fontSize: 12,
        fontFamily: 'SplineSans_500Medium',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    loadingText: {
        color: '#D8B4FE',
        marginTop: 16,
        fontFamily: 'SplineSans_600SemiBold',
        fontSize: 16,
    }
});

export default CreditStoreScreen;
