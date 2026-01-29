import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../context/UserContext';

const { width } = Dimensions.get('window');

const AnalysisScreen = () => {
    const { t } = useUser();
    const [awarenessScore, setAwarenessScore] = useState(0);
    const [scoreGrade, setScoreGrade] = useState('-');
    const [monthlyCount, setMonthlyCount] = useState(0);
    const [lucidRate, setLucidRate] = useState(0);
    const [sentiments, setSentiments] = useState({ curiosity: 0, anxiety: 0, happiness: 0 });
    const [topSymbols, setTopSymbols] = useState([]);
    const [aiInsight, setAiInsight] = useState('');

    useFocusEffect(
        useCallback(() => {
            calculateScore();
        }, [])
    );

    const calculateScore = async () => {
        try {
            // Load both datasets: 'user_dreams_history' (Chat History) and 'dream_notes' (Personal Notes)
            const historyJson = await AsyncStorage.getItem('user_dreams_history');
            const notesJson = await AsyncStorage.getItem('dream_notes');

            const historyDreams = historyJson ? JSON.parse(historyJson) : [];
            const noteDreams = notesJson ? JSON.parse(notesJson) : [];

            const allDreams = [...historyDreams, ...noteDreams];

            if (allDreams.length === 0) {
                setAwarenessScore(0);
                setScoreGrade('-');
                setMonthlyCount(0);
                setLucidRate(0);
                setTopSymbols([]);
                setAiInsight(t('insight_default')); // Default message
                return;
            }

            const dreams = allDreams;

            // --- 1. Awareness Score Calculation ---
            const volumeScore = Math.min(dreams.length, 30);

            let totalWords = 0;
            const uniqueMoods = new Set();
            let qualityDreams = []; // Lucid or Great dreams

            dreams.forEach(d => {
                if (d.text) totalWords += d.text.split(' ').length;
                if (d.mood) uniqueMoods.add(d.mood);
                // Quality/Lucid check
                if (d.isLucid || (d.tags && d.tags.includes('lucid')) || (d.title && d.title.toLowerCase().includes('lucid')) || d.mood === 'great' || d.mood === 'feeling_great') {
                    qualityDreams.push(d);
                }
            });

            const avgWordCount = dreams.length > 0 ? (totalWords / dreams.length) : 0;
            const detailScore = Math.min(Math.round(avgWordCount / 5), 30);
            const varietyScore = Math.min(uniqueMoods.size * 5, 20);
            const qualityScore = Math.min(qualityDreams.length * 5, 20);

            // Streak Bonus
            let streakBonus = 0;
            if (dreams.length > 0) {
                const lastDreamDate = new Date(dreams[0].date || dreams[0].timestamp); // Assuming sorted new to old
                const diffTime = Math.abs(new Date() - lastDreamDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 2) streakBonus = 5; // Bonus if dream recorded recently
            }

            let totalScore = volumeScore + detailScore + varietyScore + qualityScore + streakBonus;
            if (totalScore > 100) totalScore = 100;

            setAwarenessScore(totalScore);

            // Grade
            let grade = '-';
            if (totalScore >= 90) grade = 'A+';
            else if (totalScore >= 80) grade = 'A';
            else if (totalScore >= 70) grade = 'B';
            else if (totalScore >= 50) grade = 'C';
            else grade = 'D';
            setScoreGrade(grade);


            // --- 2. Monthly Count ---
            const currentMonth = new Date().getMonth();
            const monthlyDreams = dreams.filter(d => {
                const dDate = new Date(d.date || d.timestamp);
                return dDate.getMonth() === currentMonth;
            });
            setMonthlyCount(monthlyDreams.length);

            // --- 3. Lucid Rate ---
            const rate = Math.round((qualityDreams.length / dreams.length) * 100);
            setLucidRate(rate);

            // --- 4. Sentiment Analysis ---
            let sentimentStats = { curiosity: 0, anxiety: 0, happiness: 0 };
            if (dreams.length > 0) {
                let anxietyCount = 0;
                let happinessCount = 0;
                let curiosityCount = 0;

                dreams.forEach(d => {
                    if (d.mood === 'scary' || d.mood === 'sad' || d.mood === 'feeling_scary' || d.mood === 'feeling_sad') anxietyCount++;
                    else if (d.mood === 'happy' || d.mood === 'great' || d.mood === 'feeling_happy' || d.mood === 'feeling_good' || d.mood === 'feeling_great') happinessCount++;
                    else curiosityCount++;
                });

                sentimentStats = {
                    anxiety: Math.round((anxietyCount / dreams.length) * 100),
                    happiness: Math.round((happinessCount / dreams.length) * 100),
                    curiosity: Math.round((curiosityCount / dreams.length) * 100)
                };
                setSentiments(sentimentStats);
            } else {
                setSentiments({ curiosity: 0, anxiety: 0, happiness: 0 });
            }

            // --- 5. Dream Symbols (Advanced) ---
            const symbolCounts = {};
            const KNOWN_SYMBOLS = new Set([
                'araba', 'ev', 'deniz', 'su', 'yılan', 'kedi', 'köpek', 'diş', 'uçak', 'para',
                'okul', 'sınav', 'bebek', 'anne', 'baba', 'kardeş', 'sevgili', 'eski sevgili',
                'arkadaş', 'ayakkabı', 'elbise', 'gelinlik', 'saç', 'kan', 'ateş', 'yangın',
                'telefon', 'bilgisayar', 'orman', 'ağaç', 'çiçek', 'bahçe', 'yol', 'köprü',
                'gemi', 'tren', 'otobüs', 'bisiklet', 'at', 'kuş', 'balık', 'fare', 'böcek',
                'örümcek', 'yatak', 'oda', 'kapı', 'pencere', 'merdiven', 'asansör', 'yemek',
                'ekmek', 'et', 'süt', 'çay', 'kahve', 'altın', 'yüzük', 'kolye', 'saat',
                'güneş', 'ay', 'yıldız', 'bulut', 'yağmur', 'kar', 'rüzgar', 'fırtına', 'deprem',
                'cami', 'mezar', 'ölüm', 'cenaze', 'düğün', 'parti', 'üniversite', 'hastane',
                'doktor', 'polis', 'asker', 'silah', 'bıçak', 'ayna', 'anahtar', 'çanta',
                'cüzdan', 'kitap', 'defter', 'kalem', 'masa', 'sandalye', 'koltuk', 'televizyon',
                'bina', 'apartman', 'şehir', 'köy', 'dağ', 'tepe', 'göl', 'nehir', 'şelale',
                'diş', 'göz', 'ağız', 'burun', 'kulak'
            ]);
            const BLACKLIST = new Set(['huzurla', 'eserken', 'her', 'ılık', 'çok', 'canlı', 've', 'bir', 'bu', 'şu']);

            dreams.forEach(d => {
                if (d.tags && Array.isArray(d.tags)) {
                    d.tags.forEach(tag => {
                        const cleanTag = tag.toLowerCase().trim();
                        if (cleanTag !== 'general' && !BLACKLIST.has(cleanTag)) {
                            symbolCounts[cleanTag] = (symbolCounts[cleanTag] || 0) + 5;
                        }
                    });
                }
                if (d.text) {
                    const text = d.text.toLowerCase().replace(/[.,!?;:()"]/g, ' ');
                    const words = text.split(/\s+/);
                    words.forEach(word => {
                        KNOWN_SYMBOLS.forEach(symbol => {
                            if (word.startsWith(symbol)) {
                                if (word.length <= symbol.length + 4) {
                                    if (!BLACKLIST.has(word)) {
                                        symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
                                    }
                                }
                            }
                        });
                    });
                }
            });

            const sortedSymbols = Object.keys(symbolCounts)
                .map(tag => ({ tag, count: symbolCounts[tag] }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 6); // Top 6

            setTopSymbols(sortedSymbols);

            // --- 6. Generate AI Insight ---
            let insightPart1 = "";
            let insightPart2 = "";
            let insightPart3 = "";

            // Part 1: Score based
            if (totalScore >= 80) insightPart1 = t('insight_score_high');
            else if (totalScore >= 50) insightPart1 = t('insight_score_mid');
            else insightPart1 = t('insight_score_low');

            // Part 2: Sentiment based (Dominant)
            const maxSentiment = Object.keys(sentimentStats).reduce((a, b) => sentimentStats[a] > sentimentStats[b] ? a : b);
            if (sentimentStats[maxSentiment] > 0) { // Check if we have any sentiment
                insightPart2 = t(`insight_sentiment_${maxSentiment}`);
            }

            // Part 3: Symbol based
            if (sortedSymbols.length > 0) {
                const topSymbol = getLocalizedTag(sortedSymbols[0].tag);
                insightPart3 = `${t('insight_symbol_prefix')} '${topSymbol}' ${t('insight_symbol_suffix')}`;
            }

            setAiInsight(`${insightPart1} ${insightPart2} ${insightPart3}`);


        } catch (error) {
            console.error("Error calculating score:", error);
            setAiInsight(t('insight_default'));
        }
    };

    const getLocalizedTag = (tag) => {
        const key = `tag_${tag}`;
        const translated = t(key);
        // i18n-js returns string starting with [missing... for missing keys
        if (translated.includes('[missing') && translated.includes('translation]')) {
            // Capitalize first letter
            return tag.charAt(0).toUpperCase() + tag.slice(1);
        }
        return translated;
    };

    const StatCard = ({ icon, title, value, subtext, color }) => (
        <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: `rgba(${color}, 0.1)` }]}>
                <MaterialIcons name={icon} size={24} color={`rgb(${color})`} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={styles.statSubtext}>{subtext}</Text>
        </View >
    );

    const ProgressBar = ({ label, percentage, color, icon }) => (
        <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
                <View style={styles.progressLabelRow}>
                    <MaterialIcons name={icon} size={16} color={color} />
                    <Text style={styles.progressLabel}>{label}</Text>
                </View>
                <Text style={styles.progressValue}>%{percentage}</Text>
            </View>
            <View style={styles.track}>
                <View style={[styles.bar, { width: `${percentage}%`, backgroundColor: color }]} />
            </View>
        </View>
    );

    const SymbolChip = ({ text, count }) => (
        <View style={styles.symbolChip}>
            <Text style={styles.symbolText}>{text}</Text>
            <View style={styles.symbolBadge}>
                <Text style={styles.symbolCount}>{count}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ alignItems: 'center', width: '100%' }}>
                    <Text style={styles.headerTitle}>{t('dream_insights_title')}</Text>
                    <Text style={styles.headerSubtitle}>{t('subconscious_map')}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Score Card */}
                <View style={styles.scoreCardContainer}>
                    <LinearGradient
                        colors={['#7f13ec', '#4c1d95', '#191022']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.scoreCard}
                    >
                        <View style={styles.scoreContent}>
                            <View style={styles.scoreTextContainer}>
                                <Text style={styles.scoreLabel}>{t('dream_awareness_score')}</Text>
                                <Text style={styles.scoreValue}>{awarenessScore}</Text>
                                <Text style={styles.scoreDesc}>{t('score_desc')}</Text>
                            </View>
                            <View style={styles.scoreCircle}>
                                <Text style={styles.circleText}>{scoreGrade}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Quick Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="nights-stay"
                        title={t('total_dreams')}
                        value={monthlyCount.toString()}
                        subtext={t('this_month')}
                        color="168, 85, 247" // Purple-500
                    />
                    <StatCard
                        icon="auto-awesome"
                        title={t('lucid_rate')}
                        value={`%${lucidRate}`}
                        subtext={t('increase_rate', { rate: '+%0' })} // Keeping static increase for now as requested design-wise, logic is complex
                        color="236, 72, 153" // Pink-500
                    />
                </View>

                {/* Emotion Analysis */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('sentiment_analysis')}</Text>
                        <TouchableOpacity>
                            <MaterialIcons name="more-horiz" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.card}>
                        <ProgressBar label={t('sentiment_curiosity')} percentage={sentiments.curiosity} color="#8B5CF6" icon="search" />
                        <View style={styles.divider} />
                        <ProgressBar label={t('sentiment_anxiety')} percentage={sentiments.anxiety} color="#EF4444" icon="warning" />
                        <View style={styles.divider} />
                        <ProgressBar label={t('sentiment_happiness')} percentage={sentiments.happiness} color="#10B981" icon="sentiment-satisfied" />
                    </View>
                </View>

                {/* Common Symbols */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('symbols_title')}</Text>
                    <View style={styles.symbolsContainer}>
                        {topSymbols.length > 0 ? (
                            topSymbols.map((item, index) => (
                                <SymbolChip
                                    key={index}
                                    text={getLocalizedTag(item.tag)}
                                    count={item.count}
                                />
                            ))
                        ) : (
                            <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, fontStyle: 'italic' }}>
                                {t('no_symbols_yet') || 'Henüz yeterli veri yok.'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* AI Insight */}
                <View style={styles.aiInsightCard}>
                    <View style={styles.aiHeader}>
                        <Ionicons name="sparkles" size={16} color="#F59E0B" />
                        <Text style={styles.aiTitle}>{t('ai_insight_title')}</Text>
                    </View>
                    <Text style={styles.aiText}>
                        {aiInsight || t('ai_insight_content')}
                    </Text>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#191022',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontFamily: 'SplineSans_700Bold',
        textAlign: 'center',
    },
    headerSubtitle: {
        color: '#ad92c9',
        fontSize: 14,
        fontFamily: 'SplineSans_400Regular',
        marginTop: 4,
        textAlign: 'center',
    },
    calendarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    calendarText: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'SplineSans_500Medium',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    scoreCardContainer: {
        marginHorizontal: 20,
        marginBottom: 24,
        shadowColor: '#7f13ec',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    scoreCard: {
        borderRadius: 24,
        padding: 1, // for gradient border effect
    },
    scoreContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'rgba(25, 16, 34, 0.4)', // Slightly transparent inner
        borderRadius: 24,
    },
    scoreTextContainer: {
        flex: 1,
        paddingRight: 16,
    },
    scoreLabel: {
        color: '#ad92c9',
        fontSize: 12,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    scoreValue: {
        color: 'white',
        fontSize: 48,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 8,
    },
    scoreDesc: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        lineHeight: 18,
        fontFamily: 'SplineSans_400Regular',
    },
    scoreCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#7f13ec',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(127, 19, 236, 0.2)',
    },
    circleText: {
        color: 'white',
        fontSize: 32,
        fontFamily: 'SplineSans_700Bold',
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 16,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#2a1f33',
        borderRadius: 16,
        padding: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        color: 'white',
        fontSize: 24,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 2,
    },
    statTitle: {
        color: '#9CA3AF',
        fontSize: 12,
        fontFamily: 'SplineSans_500Medium',
        marginBottom: 2,
    },
    statSubtext: {
        color: '#10B981', // Green for positive trend
        fontSize: 12,
        fontFamily: 'SplineSans_700Bold',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
    },
    card: {
        backgroundColor: '#2a1f33',
        borderRadius: 20,
        padding: 20,
    },
    progressContainer: {
        marginVertical: 4,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressLabel: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'SplineSans_500Medium',
    },
    progressValue: {
        color: '#9CA3AF',
        fontSize: 14,
        fontFamily: 'SplineSans_600SemiBold',
    },
    track: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        borderRadius: 4,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 16,
    },
    symbolsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 12,
    },
    symbolChip: {
        backgroundColor: '#2a1f33',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    symbolText: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'SplineSans_500Medium',
    },
    symbolBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 6,
        borderRadius: 8,
    },
    symbolCount: {
        color: '#ad92c9',
        fontSize: 11,
        fontFamily: 'SplineSans_700Bold',
    },
    aiInsightCard: {
        backgroundColor: 'rgba(245, 158, 11, 0.08)', // Amber tint
        marginHorizontal: 20,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    aiTitle: {
        color: '#F59E0B',
        fontSize: 14,
        fontFamily: 'SplineSans_700Bold',
        textTransform: 'uppercase',
    },
    aiText: {
        color: '#FCD34D',
        fontSize: 15,
        fontFamily: 'SplineSans_400Regular',
        lineHeight: 24,
    },
});

export default AnalysisScreen;
