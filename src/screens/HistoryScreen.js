import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions, Platform, ImageBackground, Image, Alert, TouchableWithoutFeedback, Keyboard, RefreshControl, Animated, Easing } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const HistoryScreen = ({ navigation }) => {
    const { t, user } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('filter_all');

    // 1. Corrected Filters matching NewDreamScreen values
    const filters = [
        { key: 'filter_all', label: t('filter_all') || 'Tümü' },
        { key: 'feeling_scary', label: t('mood_scary') || 'Kabus' },
        { key: 'feeling_sad', label: t('mood_sad') || 'Üzgün' },
        { key: 'feeling_good', label: t('mood_happy') || 'Mutlu' },
        { key: 'feeling_great', label: t('mood_great') || 'Harika' },
        { key: 'feeling_neutral', label: t('mood_neutral') || 'Normal' }
    ];

    const [dreams, setDreams] = useState([]);
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
        await loadDreams();
        setTimeout(() => {
            setRefreshing(false);
            stopSpin();
        }, 500);
    }, [user]);

    useFocusEffect(
        React.useCallback(() => {
            loadDreams();
        }, [])
    );

    const loadDreams = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('dreams')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (error) {
                console.error("Supabase load error:", error);
                return;
            }
            setDreams(data || []);
        } catch (e) {
            console.error("Failed to load dreams", e);
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return { day: '?', month: '?', time: '?' };
        const date = new Date(isoString);
        return {
            day: date.getDate(),
            month: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: date.toLocaleDateString()
        };
    };

    // 2. Filter Logic
    const filteredDreams = dreams.filter(d =>
        (selectedFilter === 'filter_all' || d.mood === selectedFilter) &&
        (searchQuery === '' || d.text.toLowerCase().includes(searchQuery.toLowerCase()) || (d.title && d.title.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    // 3. Featured Dream (Always the very first one of the filtered list)
    const featuredDream = filteredDreams.length > 0 ? filteredDreams[0] : null;
    const listDreams = filteredDreams; // Show all dreams in list, including the featured one

    // 4. Date Grouping Logic
    const groupDreamsByDate = (dreamList) => {
        const groups = {
            today: [],
            yesterday: [],
            thisWeek: [],
            lastWeek: [],
            lastMonth: [],
            older: []
        };

        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        dreamList.forEach(dream => {
            const date = new Date(dream.date);
            const diffTime = now - date;
            const diffDays = Math.floor(diffTime / oneDay);

            if (diffDays === 0) groups.today.push(dream);
            else if (diffDays === 1) groups.yesterday.push(dream);
            else if (diffDays <= 7) groups.thisWeek.push(dream);
            else if (diffDays <= 14) groups.lastWeek.push(dream);
            else if (diffDays <= 30) groups.lastMonth.push(dream);
            else groups.older.push(dream);
        });

        return groups;
    };

    const groups = groupDreamsByDate(listDreams);

    const getDreamImage = (dream) => {
        return { uri: 'https://images.unsplash.com/photo-1499346030926-9a72daac6c63?q=80&w=2070&auto=format&fit=crop' };
    };

    const getInsight = (analysis) => {
        if (!analysis) return "Rüyanızın gizli anlamını keşfedin.";
        const snippet = analysis.split('.')[0];
        return snippet.length > 60 ? snippet.substring(0, 60) + "..." : snippet + ".";
    };

    const getMoodIcon = (mood) => {
        switch (mood) {
            case 'feeling_scary': return <MaterialIcons name="sentiment-very-dissatisfied" size={16} color="#EF4444" />; // Red
            case 'feeling_sad': return <MaterialIcons name="sentiment-dissatisfied" size={16} color="#60A5FA" />; // Blue
            case 'feeling_good': return <MaterialIcons name="sentiment-satisfied" size={16} color="#10B981" />; // Green
            case 'feeling_great': return <MaterialIcons name="sentiment-very-satisfied" size={16} color="#F59E0B" />; // Yellow
            default: return <MaterialIcons name="sentiment-neutral" size={16} color="#9CA3AF" />; // Gray
        }
    };

    const handleDeleteDream = (dreamId) => {
        Alert.alert(
            t('delete_dream_title') || 'Rüyayı Sil',
            t('delete_dream_confirm') || 'Bu rüyayı silmek istediğinize emin misiniz?',
            [
                { text: t('cancel') || 'İptal', style: 'cancel' },
                {
                    text: t('delete') || 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Optimistic update
                            const updatedDreams = dreams.filter(d => d.id !== dreamId);
                            setDreams(updatedDreams);

                            const { error } = await supabase
                                .from('dreams')
                                .delete()
                                .eq('id', dreamId);

                            if (error) throw error;
                        } catch (error) {
                            console.error("Error deleting dream:", error);
                            Alert.alert('Hata', 'Rüya silinirken bir sorun oluştu.');
                            loadDreams(); // Revert on error
                        }
                    }
                }
            ]
        );
    };

    const renderDreamRow = (dream) => {
        const { day, month } = formatDate(dream.date);
        return (
            <TouchableOpacity
                key={dream.id}
                style={styles.listItem}
                onLongPress={() => handleDeleteDream(dream.id)}
                delayLongPress={500}
                onPress={() => navigation.navigate('Chat', {
                    dreamId: dream.id,
                    dreamText: dream.text,
                    interpreter: dream.interpreter,
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
                <View style={styles.listItemContent}>
                    <View style={styles.listItemHeader}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>{dream.title || t('untitled_dream')}</Text>
                        {getMoodIcon(dream.mood)}
                    </View>
                    <Text style={styles.listItemDesc} numberOfLines={1}>
                        {dream.text}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
        );
    };

    const renderSection = (title, data) => {
        if (data.length === 0) return null;
        return (
            <View style={styles.listSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                </View>
                <View style={styles.listContainer}>
                    {data.map(renderDreamRow)}
                </View>
            </View>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                {/* Header */}
                <View style={[styles.header, { zIndex: 100, elevation: 100, backgroundColor: '#191022' }]}>
                    <View style={styles.headerTop}>
                        <Text style={styles.headerTitle}>{t('history_title') || 'Rüya Geçmişi'}</Text>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={20} color="#ad92c9" style={{ marginLeft: 12 }} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={t('search_placeholder') || "Rüyalarında ara..."}
                                placeholderTextColor="#ad92c9"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    {/* Filters */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
                        {filters.map((filter, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.filterButton,
                                    selectedFilter === filter.key ? styles.filterButtonActive : styles.filterButtonInactive
                                ]}
                                onPress={() => setSelectedFilter(filter.key)}
                            >
                                <Text style={[
                                    styles.filtertext,
                                    selectedFilter === filter.key ? styles.filterTextActive : styles.filterTextInactive
                                ]}>{filter.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
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


                    {dreams.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 100, opacity: 0.5 }}>
                            <Ionicons name="moon-outline" size={64} color="white" />
                            <Text style={{ color: 'white', marginTop: 16 }}>{t('no_dreams_yet') || 'Henüz kayıtlı rüya yok.'}</Text>
                        </View>
                    ) : (
                        <>
                            {featuredDream && (
                                <View>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>{t('latest_dream') || 'En Son'}</Text>
                                        <View style={styles.newBadge}>
                                            <Text style={styles.newBadgeText}>Yeni</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.featuredCard}
                                        activeOpacity={0.9}
                                        onPress={() => navigation.navigate('Chat', {
                                            dreamId: featuredDream.id,
                                            dreamText: featuredDream.text,
                                            interpreter: featuredDream.interpreter,
                                            tag: featuredDream.tag,
                                            mood: featuredDream.mood,
                                            previousAnalysis: featuredDream.analysis,
                                            previousMessages: featuredDream.messages
                                        })}
                                    >
                                        <ImageBackground
                                            source={getDreamImage(featuredDream)}
                                            style={styles.cardImage}
                                            imageStyle={{ borderRadius: 20 }}
                                        >
                                            <LinearGradient
                                                colors={['transparent', 'rgba(15, 10, 25, 0.95)']}
                                                style={styles.cardGradient}
                                            />

                                            <View style={styles.cardTag}>
                                                <Text style={styles.cardTagText}>
                                                    {filters.find(f => f.key === featuredDream.mood)?.label || featuredDream.tag || 'RÜYA'}
                                                </Text>
                                            </View>

                                            <View style={styles.cardContent}>
                                                <Text style={styles.cardDate}>{formatDate(featuredDream.date).fullDate}</Text>
                                                <Text style={styles.cardTitle} numberOfLines={1}>{featuredDream.title}</Text>
                                                <Text style={styles.cardDescription} numberOfLines={2}>
                                                    {featuredDream.text}
                                                </Text>

                                                <View style={styles.aiResultBadge}>
                                                    <Ionicons name="sparkles" size={12} color="#A855F7" />
                                                    <Text style={styles.aiResultText} numberOfLines={1}>
                                                        {getInsight(featuredDream.analysis)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </ImageBackground>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Grouped Lists */}
                            {renderSection(t('today') || 'Bugün', groups.today)}
                            {renderSection(t('yesterday') || 'Dün', groups.yesterday)}
                            {renderSection(t('this_week') || 'Bu Hafta', groups.thisWeek)}
                            {renderSection(t('last_week') || 'Geçen Hafta', groups.lastWeek)}
                            {renderSection(t('last_month') || 'Geçen Ay', groups.lastMonth)}
                            {renderSection(t('older_dreams') || 'Daha Eski', groups.older)}

                        </>
                    )}
                </ScrollView>

                {/* FAB for New Dream - Optional, positioned absolute bottom right if needed */}
                <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewDream')}>
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>

            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#191022',
    },
    header: {
        backgroundColor: '#191022',
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 0,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'center', // Centered
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    iconButton: {
        padding: 4,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontFamily: 'SplineSans_700Bold',
    },
    searchContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a1f33',
        borderRadius: 24, // More rounded like mockup
        height: 50,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    searchInput: {
        flex: 1,
        height: '100%',
        color: 'white',
        paddingHorizontal: 12,
        fontFamily: 'SplineSans_400Regular',
        fontSize: 15,
    },
    filtersContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 20,
        height: 36,
        borderRadius: 20, // Circular
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: '#7f13ec',
    },
    filterButtonInactive: {
        backgroundColor: '#2a1f33',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    filtertext: {
        fontSize: 13,
        fontFamily: 'SplineSans_500Medium',
    },
    filterTextActive: {
        color: 'white',
    },
    filterTextInactive: {
        color: '#9CA3AF',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
        marginTop: 16, // More spacing between sections
        gap: 8,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
    },
    newBadge: {
        backgroundColor: '#7f13ec',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    newBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    featuredCard: {
        marginHorizontal: 16,
        marginTop: 4,
        marginBottom: 8,
        height: 280, // Taller for visual
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    cardImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end',
    },
    cardGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '100%',
        borderRadius: 20,
    },
    cardTag: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(10px)', // iOS only
    },
    cardTagText: {
        color: 'white',
        fontSize: 11,
        fontFamily: 'SplineSans_700Bold',
        textTransform: 'uppercase',
    },
    cardContent: {
        padding: 20,
        paddingBottom: 24,
    },
    cardDate: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        marginBottom: 6,
        fontFamily: 'SplineSans_500Medium',
    },
    cardTitle: {
        color: 'white',
        fontSize: 24, // Larger title
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    cardDescription: {
        color: '#E5E7EB',
        fontSize: 14,
        marginBottom: 16,
        fontFamily: 'SplineSans_400Regular',
        lineHeight: 20,
        opacity: 0.9,
    },
    aiResultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(56, 17, 85, 0.8)', // Dark purple transparent
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
        gap: 10,
    },
    aiResultText: {
        color: '#A855F7', // Purple text
        fontSize: 13,
        fontFamily: 'SplineSans_500Medium',
        flex: 1,
    },
    listSection: {
        marginBottom: 8,
    },
    listContainer: {
        paddingHorizontal: 16,
        gap: 12,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a1f33',
        padding: 12,
        borderRadius: 16, // More rounded
        gap: 16,
    },
    dateBox: {
        width: 52,
        height: 52,
        backgroundColor: '#362348',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateMonth: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    dateDay: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
    },
    listItemContent: {
        flex: 1,
        justifyContent: 'center',
        gap: 4
    },
    listItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    listItemTitle: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_600SemiBold',
    },
    listItemDesc: {
        color: '#9CA3AF',
        fontSize: 13,
        fontFamily: 'SplineSans_400Regular',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#7f13ec',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#7f13ec',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    }
});

export default HistoryScreen;
