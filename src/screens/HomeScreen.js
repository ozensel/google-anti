import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, ImageBackground, Modal, RefreshControl, Animated, Easing } from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import CreditBalanceButton from '../components/CreditBalanceButton';

import { useUser } from '../context/UserContext';
import ProfileAvatar from '../components/ProfileAvatar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
    const { t, profile, user } = useUser();
    const [greeting, setGreeting] = useState('');
    const [recentDreams, setRecentDreams] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const spinValue = React.useRef(new Animated.Value(0)).current;

    const startSpin = () => {
        spinValue.setValue(0);
        Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    };

    const stopSpin = () => {
        spinValue.stopAnimation();
    };

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        startSpin();
        await fetchRecentDreams();
        // Simulate a small delay if fetch is too fast, for UX
        setTimeout(() => {
            setRefreshing(false);
            stopSpin();
        }, 500);
    }, [user]);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 11) {
            setGreeting(t('greeting_morning')); // Günaydın
        } else if (hour >= 11 && hour < 14) {
            setGreeting(t('greeting_noon')); // Tünaydın
        } else if (hour >= 14 && hour < 18) {
            setGreeting(t('greeting_afternoon')); // Keyifler nasıl?
        } else if (hour >= 18 && hour < 22) {
            setGreeting(t('greeting_evening')); // İyi Akşamlar
        } else if (hour >= 22 || hour < 2) {
            setGreeting(t('greeting_night_wish')); // Tatlı Rüyalar
        } else {
            // 02:00 - 05:00
            setGreeting(t('greeting_late_night')); // Hala uyanık mısın?
        }
    }, [t]);

    useFocusEffect(
        React.useCallback(() => {
            fetchRecentDreams();
        }, [])
    );

    const fetchRecentDreams = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('dreams')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false })
                .limit(2);

            if (error) {
                console.error('Error fetching recent dreams:', error);
                return;
            }
            setRecentDreams(data || []);
        } catch (error) {
            console.error('Error fetching recent dreams:', error);
        }
    };

    const [selectedExploreItem, setSelectedExploreItem] = useState(null);

    const exploreItems = [
        {
            id: 'improve',
            title: t('improve_results_title'),
            content: t('improve_results_content'),
            image: require('../../assets/explore/better_results.png'),
            color: '#F59E0B' // Amber
        },
        {
            id: 'lucid',
            title: t('lucid_dream_title'),
            content: t('lucid_dream_content'),
            image: require('../../assets/explore/lucid_dream.png'),
            color: '#8B5CF6' // Purple
        },
        {
            id: 'nightmare',
            title: t('nightmare_title'),
            content: t('nightmare_content'),
            image: require('../../assets/explore/nightmare.png'),
            color: '#EF4444' // Red
        },
        {
            id: 'symbols',
            title: t('symbols_title'),
            content: t('symbols_content'),
            image: require('../../assets/explore/dream_symbols.png'),
            color: '#10B981' // Green
        }
    ];

    const getMoodIcon = (mood) => {
        switch (mood) {
            case 'feeling_great': return { name: 'sentiment-very-satisfied', color: '#10B981' };
            case 'feeling_good': return { name: 'sentiment-satisfied', color: '#EAB308' };
            case 'feeling_scary': return { name: 'sentiment-very-dissatisfied', color: '#EF4444' };
            case 'feeling_sad': return { name: 'sentiment-dissatisfied', color: '#3B82F6' };
            default: return { name: 'sentiment-neutral', color: '#9CA3AF' };
        }
    };

    const ExploreCard = ({ item }) => (
        <TouchableOpacity
            style={styles.exploreCard}
            activeOpacity={0.9}
            onPress={() => setSelectedExploreItem(item)}
        >
            <ImageBackground
                source={item.image}
                style={styles.exploreImage}
                imageStyle={{ borderRadius: 16 }}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.exploreGradient}
                />
                <View style={styles.exploreContent}>
                    <Text style={styles.exploreTitle}>{item.title}</Text>
                    <View style={[styles.exploreBadge, { backgroundColor: item.color }]}>
                        <Text style={styles.exploreBadgeText}>{t('read_badge')}</Text>
                    </View>
                </View>
            </ImageBackground>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            {/* Header */}
            {/* Header */}
            <View style={[styles.header, { zIndex: 100, elevation: 100, backgroundColor: '#191022' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <ProfileAvatar
                        size={48}
                        onPress={() => navigation.navigate('SettingsTab')}
                    />
                    <View>
                        <Text style={styles.greetingText}>{greeting}</Text>
                        <Text style={styles.userName}>{profile?.full_name?.split(' ')[0] || t('hello_user')}</Text>
                    </View>
                </View>

                <CreditBalanceButton dark={true} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                overflow="visible"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="transparent"
                        colors={['transparent']}
                        style={{ backgroundColor: 'transparent', zIndex: 100 }}
                    />
                }
            >
                {/* Custom Bear Refresher (Moves with scroll) */}
                <View style={{ position: 'absolute', top: -150, left: 0, right: 0, height: 140, alignItems: 'center', justifyContent: 'flex-end', zIndex: 10 }}>
                    <View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ translateY: 5 }] }}>
                        {/* Spinning Stars */}
                        <Animated.View style={{
                            position: 'absolute',
                            width: 140,
                            height: 140,
                            justifyContent: 'center',
                            alignItems: 'center',
                            transform: [{ rotate: spin }],
                            opacity: refreshing ? 1 : 0
                        }}>
                            <Ionicons name="star" size={18} color="#FCD34D" style={{ position: 'absolute', top: 10 }} />
                            <Ionicons name="star" size={12} color="#FCD34D" style={{ position: 'absolute', bottom: 30, right: 30 }} />
                            <Ionicons name="star" size={15} color="#FCD34D" style={{ position: 'absolute', bottom: 30, left: 30 }} />
                        </Animated.View>

                        {/* Bear Image (Swap based on state) */}
                        <Image
                            source={refreshing ? require('../assets/bear_awake.png') : require('../assets/bear_sleep.png')}
                            style={{ width: 100, height: 80, resizeMode: 'contain' }}
                        />
                    </View>
                </View>

                {/* Hero Action Card */}
                <TouchableOpacity
                    style={styles.heroCardContainer}
                    activeOpacity={0.95}
                    onPress={() => navigation.navigate('NewDream')}
                >
                    <LinearGradient
                        colors={['#7f13ec', '#4c1d95']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroTextContainer}>
                            <View style={styles.moonIconBg}>
                                <Ionicons name="moon" size={24} color="#FCD34D" />
                            </View>
                            <Text style={styles.heroTitle}>{t('hero_title')}</Text>
                            <Text style={styles.heroSubtitle}>{t('hero_subtitle')}</Text>
                        </View>
                        <View style={styles.heroButton}>
                            <Text style={styles.heroButtonText}>{t('add_dream_button')}</Text>
                            <MaterialIcons name="arrow-forward" size={20} color="#7f13ec" />
                        </View>

                        {/* Decorative Elements */}
                        <View style={styles.decoratorCircle1} />
                        <View style={styles.decoratorCircle2} />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Dream Notes Button */}
                <TouchableOpacity
                    style={styles.notesCard}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('DreamNotes')}
                >
                    <LinearGradient
                        colors={['#2D2438', '#1F1625']}
                        style={styles.notesGradient}
                    >
                        <View style={styles.notesIconBox}>
                            <MaterialCommunityIcons name="notebook-edit-outline" size={24} color="#D8B4FE" />
                        </View>
                        <View style={styles.notesContent}>
                            <Text style={styles.notesTitle}>{t('dream_notes_button')}</Text>
                            <Text style={styles.notesSubtitle}>{t('add_first_note')}</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Daily Tip */}
                <View style={styles.tipContainer}>
                    <View style={styles.tipIconBox}>
                        <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#F59E0B" />
                    </View>
                    <View style={styles.tipContent}>
                        <Text style={styles.tipTitle}>{t('daily_tip_title')}</Text>
                        <Text style={styles.tipText}>{t('daily_tip_content')}</Text>
                    </View>
                </View>

                {/* Explore Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('explore_section')}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exploreScroll}>
                    {exploreItems.map((item) => (
                        <ExploreCard key={item.id} item={item} />
                    ))}
                </ScrollView>

                {/* Recent Dreams Preview */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('recent_dreams')}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('HistoryTab')}>
                        <Text style={styles.seeAllText}>{t('see_all')}</Text>
                    </TouchableOpacity>
                </View>

                {recentDreams.length > 0 ? (
                    recentDreams.map((dream) => {
                        const date = new Date(dream.date); // Changed from created_at
                        const day = date.getDate();
                        const month = date.toLocaleString('default', { month: 'short' });
                        const moodInfo = getMoodIcon(dream.mood);

                        return (
                            <TouchableOpacity
                                key={dream.id}
                                style={styles.recentItem}
                                onPress={() => navigation.navigate('Chat', {
                                    dreamId: dream.id,
                                    dreamText: dream.text,
                                    interpreter: dream.interpreter || 'AI', // Default to AI if missing
                                    tag: dream.tag,
                                    mood: dream.mood,
                                    previousAnalysis: dream.analysis,
                                    previousMessages: dream.messages
                                })}
                            >
                                <View style={styles.dateBox}>
                                    <Text style={styles.dateMonth}>{month}</Text>
                                    <Text style={styles.dateDay}>{day}</Text>
                                </View>
                                <View style={styles.recentContent}>
                                    <View style={styles.recentHeader}>
                                        <Text style={styles.recentTitle} numberOfLines={1}>
                                            {dream.title || (dream.text ? dream.text.substring(0, 20) + '...' : t('dream'))}
                                        </Text>
                                        <MaterialIcons name={moodInfo.name} size={16} color={moodInfo.color} />
                                    </View>
                                    <Text style={styles.recentDesc} numberOfLines={1}>
                                        {dream.text}
                                    </Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        );
                    })
                ) : (
                    <TouchableOpacity
                        style={styles.emptyRecentCard}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('NewDream')}
                    >
                        <LinearGradient
                            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                            style={styles.emptyRecentGradient}
                        >
                            <View style={styles.emptyIconBox}>
                                <Ionicons name="moon-outline" size={24} color="#A855F7" />
                            </View>
                            <View style={styles.emptyContent}>
                                <Text style={styles.emptyTitle}>{t('no_dreams_yet') || 'Henüz yorumlanmış bir rüyanız yok'}</Text>
                                <Text style={styles.emptySubtitle}>
                                    {t('start_recording_desc') || "Rüyanızı yorumlatmak ister misiniz?"}
                                </Text>
                            </View>
                            <Ionicons name="add-circle-outline" size={28} color="#A855F7" style={{ opacity: 0.8 }} />
                        </LinearGradient>
                    </TouchableOpacity>
                )}

            </ScrollView>

            {/* Explore Detail Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={!!selectedExploreItem}
                onRequestClose={() => setSelectedExploreItem(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedExploreItem && (
                            <>
                                <Image
                                    source={selectedExploreItem.image}
                                    style={styles.modalImage}
                                />
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setSelectedExploreItem(null)}
                                >
                                    <Ionicons name="close-circle" size={32} color="white" />
                                </TouchableOpacity>

                                <ScrollView style={styles.modalTextScroll}>
                                    <Text style={styles.modalTitle}>{selectedExploreItem.title}</Text>
                                    <View style={[styles.modalBadge, { backgroundColor: selectedExploreItem.color }]}>
                                        <Text style={styles.modalBadgeText}>{t('read_badge')}</Text>
                                    </View>
                                    <Text style={styles.modalBody}>{selectedExploreItem.content}</Text>
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#191022',
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    greetingText: {
        color: '#D8B4FE',
        fontSize: 11,
        fontFamily: 'SplineSans_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2
    },
    userName: {
        color: 'white',
        fontSize: 19,
        fontFamily: 'SplineSans_700Bold',
    },
    profileButton: {
        padding: 2,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#7f13ec',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    heroCardContainer: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 24,
        shadowColor: '#7f13ec',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    heroCard: {
        padding: 24,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        minHeight: 180,
        justifyContent: 'space-between',
    },
    heroTextContainer: {
        zIndex: 10,
    },
    moonIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        color: 'white',
        fontSize: 22,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 8,
        width: '80%',
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontFamily: 'SplineSans_400Regular',
        width: '90%',
    },
    heroButton: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 16,
        gap: 8,
        zIndex: 10,
    },
    heroButtonText: {
        color: '#7f13ec',
        fontSize: 14,
        fontFamily: 'SplineSans_700Bold',
    },
    decoratorCircle1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    decoratorCircle2: {
        position: 'absolute',
        bottom: -20,
        right: 40,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    tipContainer: {
        flexDirection: 'row',
        backgroundColor: '#2a1f33',
        marginHorizontal: 20,
        marginBottom: 24,
        padding: 16,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
        gap: 16,
        alignItems: 'center',
    },
    tipIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tipContent: {
        flex: 1,
    },
    tipTitle: {
        color: '#F59E0B',
        fontSize: 12,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    tipText: {
        color: '#D1D5DB',
        fontSize: 13,
        fontFamily: 'SplineSans_400Regular',
        lineHeight: 18,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
    },
    seeAllText: {
        color: '#7f13ec',
        fontSize: 14,
        fontFamily: 'SplineSans_600SemiBold',
    },
    exploreScroll: {
        paddingHorizontal: 20,
        gap: 16,
        paddingBottom: 24,
    },
    exploreCard: {
        width: 160,
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
    },
    exploreImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end',
    },
    exploreGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    exploreContent: {
        padding: 12,
    },
    exploreTitle: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 8,
    },
    exploreBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    exploreBadgeText: {
        color: 'white',
        fontSize: 10,
        fontFamily: 'SplineSans_700Bold',
        textTransform: 'uppercase',
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a1f33',
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 12,
        borderRadius: 16,
        gap: 16,
    },
    dateBox: {
        width: 48,
        height: 48,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    dateMonth: {
        color: '#9CA3AF',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    dateDay: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_700Bold',
    },
    recentContent: {
        flex: 1,
    },
    recentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
        gap: 8,
    },
    recentTitle: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_600SemiBold',
    },
    recentDesc: {
        color: '#9CA3AF',
        fontSize: 14,
        fontFamily: 'SplineSans_400Regular',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1F1625',
        height: '85%',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    modalImage: {
        width: '100%',
        height: 250,
        resizeMode: 'cover',
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
    },
    modalTextScroll: {
        flex: 1,
        padding: 24,
    },
    modalTitle: {
        color: 'white',
        fontSize: 28,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 12,
    },
    modalBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 20,
    },
    modalBadgeText: {
        color: 'white',
        fontSize: 12,
        fontFamily: 'SplineSans_700Bold',
    },
    modalBody: {
        color: '#D1D5DB', // Gray-300
        fontSize: 16,
        fontFamily: 'SplineSans_400Regular',
        lineHeight: 28,
        paddingBottom: 40,
    },
    // Dream Notes Card Styles
    notesCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    notesGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        gap: 16,
    },
    notesIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(216, 180, 254, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(216, 180, 254, 0.2)',
    },
    notesContent: {
        flex: 1,
    },
    notesTitle: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_600SemiBold',
        marginBottom: 4,
    },
    notesSubtitle: {
        color: '#9CA3AF',
        fontSize: 12,
        fontFamily: 'SplineSans_400Regular',
    },
    // Empty State Syles
    emptyRecentCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    emptyRecentGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    emptyIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContent: {
        flex: 1,
    },
    emptyTitle: {
        color: '#E9D5FF',
        fontSize: 15,
        fontFamily: 'SplineSans_600SemiBold',
        marginBottom: 4,
    },
    emptySubtitle: {
        color: '#9CA3AF',
        fontSize: 12,
        fontFamily: 'SplineSans_400Regular',
        lineHeight: 18,
    },
});

export default HomeScreen;
