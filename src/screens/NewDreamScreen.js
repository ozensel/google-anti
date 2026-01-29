import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Dimensions, Platform, ActivityIndicator, Alert, Modal, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import Voice from '@react-native-voice/voice';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const NewDreamScreen = ({ navigation }) => {
    const { credits, t, useCredit } = useUser(); // useCredit extracted from context
    const [dreamText, setDreamText] = useState('');
    const [selectedTag, setSelectedTag] = useState('tag_general');
    const [selectedInterpreter, setSelectedInterpreter] = useState('AI');
    const [selectedMood, setSelectedMood] = useState('feeling_neutral');

    // Confirm Modal State
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);

    // 1. Load draft on mount
    useEffect(() => {
        const loadDraft = async () => {
            try {
                const savedDraft = await AsyncStorage.getItem('dream_draft_text');
                if (savedDraft) setDreamText(savedDraft);
            } catch (e) {
                console.error("Failed to load draft", e);
            }
        };
        loadDraft();
    }, []);

    // 2. Save draft on text change
    const handleTextChange = async (text) => {
        setDreamText(text);
        try {
            await AsyncStorage.setItem('dream_draft_text', text);
        } catch (e) {
            console.error("Failed to save draft", e);
        }
    };

    // 3. Handle Interpret Press (Credit Flow)
    const handleInterpretPress = () => {
        const text = dreamText.trim();
        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

        if (wordCount < 10) {
            Alert.alert(t('error'), t('dream_too_short') || 'Rüyanız çok kısa. Lütfen biraz daha detay ekleyin (en az 10 kelime).');
            return;
        }

        if (credits <= 0) {
            Alert.alert(t('error'), t('not_enough_credits') || 'Yetersiz kredi');
            return;
        }
        setIsConfirmModalVisible(true);
    };

    const confirmAndAnalyze = async () => {
        setIsConfirmModalVisible(false);
        const result = await useCredit();
        if (result.success) {
            // Clear draft
            await AsyncStorage.removeItem('dream_draft_text');

            // Navigate to Chat - UNLOCKED
            navigation.navigate('Chat', {
                dreamText,
                interpreter: selectedInterpreter,
                tag: selectedTag,
                mood: selectedMood,
                unlocked: true // KEY: Unlock immediately
            });

            setDreamText('');
        } else {
            Alert.alert(t('error'), t('not_enough_credits'));
        }
    };


    // State for Custom Tags
    const [customTags, setCustomTags] = useState([]);
    const [isTagModalVisible, setIsTagModalVisible] = useState(false);
    const [newTag, setNewTag] = useState('');

    // Voice State
    const [isListening, setIsListening] = useState(false);
    const baseTextRef = useRef('');

    const defaultTags = ['tag_general', 'tag_career', 'tag_love', 'tag_finance', 'tag_family', 'tag_education', 'tag_health'];
    const allTags = [...customTags, ...defaultTags]; // Custom tags first

    useEffect(() => {
        loadCustomTags();

        // Voice listeners
        function onSpeechStart(e) { console.log('onSpeechStart: ', e); setIsListening(true); }
        function onSpeechEnd(e) { console.log('onSpeechEnd: ', e); setIsListening(false); }
        function onSpeechError(e) {
            console.log('onSpeechError: ', e);
            setIsListening(false);
            Alert.alert(t('error'), 'Ses algılama hatası: ' + JSON.stringify(e.error));
        }
        function onSpeechResults(e) {
            console.log('onSpeechResults: ', e);
            if (e.value && e.value[0]) {
                const spokenText = e.value[0];
                const newText = baseTextRef.current ? `${baseTextRef.current} ${spokenText}` : spokenText;
                handleTextChange(newText); // Use handleTextChange to save draft
            }
        }

        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechEnd = onSpeechEnd;
        Voice.onSpeechError = onSpeechError;
        Voice.onSpeechResults = onSpeechResults;

        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, []);

    const startRecording = async () => {
        try {
            baseTextRef.current = dreamText;
            await Voice.start('tr-TR');
        } catch (e) {
            console.error(e);
            Alert.alert(t('error'), 'Ses başlatılamadı.');
        }
    };
    const stopRecording = async () => { try { await Voice.stop(); } catch (e) { console.error(e); } };
    const handleVoiceToggle = () => { isListening ? stopRecording() : startRecording(); };

    const loadCustomTags = async () => {
        try {
            const stored = await AsyncStorage.getItem('user_agenda_tags');
            if (stored) setCustomTags(JSON.parse(stored));
        } catch (error) { console.error('Failed to load custom agenda tags', error); }
    };

    const handleAddTag = async () => {
        if (newTag.trim().length > 0) {
            const tagToAdd = newTag.trim();
            if (customTags.includes(tagToAdd) || defaultTags.includes(tagToAdd)) {
                Alert.alert(t('error'), t('tag_exists') || 'Bu etiket zaten var.');
                return;
            }
            const updatedTags = [tagToAdd, ...customTags];
            setCustomTags(updatedTags);
            setSelectedTag(tagToAdd);
            setNewTag('');
            setIsTagModalVisible(false);
            try { await AsyncStorage.setItem('user_agenda_tags', JSON.stringify(updatedTags)); } catch (error) { console.error('Failed to save custom agenda tag', error); }
        }
    };

    const handleDeleteCustomTag = (tag) => {
        if (defaultTags.includes(tag)) return;
        Alert.alert(
            t('delete_tag_title') || 'Etiketi Sil',
            t('delete_tag_confirm') || 'Bu etiketi silmek istediğinize emin misiniz?',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        const updatedTags = customTags.filter(t => t !== tag);
                        setCustomTags(updatedTags);
                        if (selectedTag === tag) setSelectedTag('tag_general');
                        try { await AsyncStorage.setItem('user_agenda_tags', JSON.stringify(updatedTags)); } catch (error) { console.error('Failed to save custom agenda tags after delete', error); }
                    }
                }
            ]
        );
    };

    const interpreters = [
        { name: 'AI', image: require('../../assets/interpreters/ai_interpreter.png') },
        { name: 'Sigmund Freud', image: require('../../assets/interpreters/freud.png') },
        { name: 'Carl Jung', image: require('../../assets/interpreters/carl_jung.png') },
        { name: 'İbn-i Şirin', image: require('../../assets/interpreters/ibn_sirin.png') },
        { name: 'Baba Vanga', image: require('../../assets/interpreters/baba_vanga.png') },
        { name: 'Nostradamus', image: require('../../assets/interpreters/nostradamus.png') },
    ];

    const moods = [
        { labelKey: 'feeling_scary', emoji: '😨', value: 'feeling_scary' },
        { labelKey: 'feeling_sad', emoji: '😔', value: 'feeling_sad' },
        { labelKey: 'feeling_neutral', emoji: '😐', value: 'feeling_neutral' },
        { labelKey: 'feeling_good', emoji: '🙂', value: 'feeling_good' },
        { labelKey: 'feeling_great', emoji: '🤩', value: 'feeling_great' },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('new_dream_page_title')}</Text>
                <View style={styles.headerCreditBadge}>
                    <MaterialIcons name="auto-awesome" size={14} color="#D8B4FE" />
                    <Text style={styles.headerCreditText}>{credits}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.contentContainer}>
                    {/* Date */}
                    <View style={styles.dateContainer}>
                        <MaterialIcons name="calendar-today" size={14} color="#7f13ec" />
                        <Text style={styles.dateText}>{t('today')}, {new Date().toLocaleDateString()}</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{t('what_did_you_see')}</Text>

                    {/* Input Area */}
                    <View style={styles.inputWrapper}>
                        <LinearGradient
                            colors={['rgba(127, 19, 236, 0.2)', 'rgba(147, 51, 234, 0.2)']}
                            style={styles.inputGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.textInput}
                                placeholder={isListening ? t('listening') || "Dinliyorum..." : t('dream_input_placeholder')}
                                placeholderTextColor={isListening ? "#D8B4FE" : "rgba(255,255,255,0.4)"}
                                multiline
                                textAlignVertical="top"
                                value={dreamText}
                                onChangeText={handleTextChange}
                                editable={!isListening}
                            />
                            <View style={styles.inputFooter}>
                                <TouchableOpacity
                                    style={[styles.micButton, isListening && styles.micButtonActive]}
                                    onPress={handleVoiceToggle}
                                >
                                    {isListening ? (
                                        <Feather name="stop-circle" size={20} color="#EF4444" />
                                    ) : (
                                        <Feather name="mic" size={20} color="#9CA3AF" />
                                    )}
                                </TouchableOpacity>

                                {isListening ? (
                                    <Text style={styles.listeningText}>{t('listening') || "Dinliyorum..."}</Text>
                                ) : (
                                    <Text style={styles.wordCount}>{t('word_count', { count: dreamText.trim().split(/\s+/).filter(w => w.length > 0).length })}</Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Tags */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{t('tags_label')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            <TouchableOpacity
                                style={[styles.tagButton, { borderWidth: 1, borderColor: '#A855F7', borderStyle: 'dashed', backgroundColor: 'transparent' }]}
                                onPress={() => setIsTagModalVisible(true)}
                            >
                                <Ionicons name="add" size={18} color="#A855F7" style={{ marginRight: 4 }} />
                                <Text style={[styles.tagText, { color: '#A855F7' }]}>{t('add_tag')}</Text>
                            </TouchableOpacity>

                            {allTags.map((tagKey, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.tagButton,
                                        selectedTag === tagKey && styles.tagButtonActive,
                                        selectedTag !== tagKey && styles.tagButtonInactive
                                    ]}
                                    onPress={() => setSelectedTag(tagKey)}
                                    onLongPress={() => handleDeleteCustomTag(tagKey)}
                                    delayLongPress={500}
                                >
                                    {selectedTag === tagKey && <Ionicons name="checkmark" size={16} color="white" style={{ marginRight: 4 }} />}
                                    <Text style={[styles.tagText, selectedTag === tagKey ? styles.tagTextActive : styles.tagTextInactive]}>
                                        {defaultTags.includes(tagKey) ? (t(tagKey) || tagKey) : tagKey}
                                    </Text>
                                    {customTags.includes(tagKey) && (
                                        <View style={{ marginLeft: 6, opacity: 0.6 }}>
                                            <Ionicons name="close-circle-outline" size={14} color={selectedTag === tagKey ? "white" : "#ad92c9"} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Interpreters */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('choose_interpreter')}</Text>
                            <View style={styles.aiBadge}>
                                <Text style={styles.aiBadgeText}>AI</Text>
                            </View>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            {interpreters.map((int, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.interpreterItem}
                                    onPress={() => setSelectedInterpreter(int.name)}
                                >
                                    <View style={[styles.avatarContainer, selectedInterpreter === int.name && styles.avatarContainerActive]}>
                                        <View style={styles.avatarInner}>
                                            <Image source={int.image} style={[styles.avatarImage, selectedInterpreter !== int.name && styles.avatarImageInactive]} />
                                        </View>
                                        {selectedInterpreter === int.name && (
                                            <View style={styles.checkBadge}>
                                                <Ionicons name="checkmark" size={10} color="white" />
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.interpreterName, selectedInterpreter === int.name && styles.interpreterNameActive]}>{int.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Mood */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{t('dream_feeling_label')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            {moods.map((m, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.moodItem,
                                        selectedMood === m.value && styles.moodItemActive,
                                        selectedMood !== m.value && styles.moodItemInactive
                                    ]}
                                    onPress={() => setSelectedMood(m.value)}
                                >
                                    <View style={styles.moodEmojiContainer}>
                                        <Text style={[styles.moodEmoji, selectedMood === m.value && styles.moodEmojiActive]}>{m.emoji}</Text>
                                    </View>
                                    <Text style={[styles.moodLabel, selectedMood === m.value ? styles.moodLabelActive : styles.moodLabelInactive]}>
                                        {t(m.labelKey)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.interpretButton, credits === 0 && styles.disabledButton]}
                    activeOpacity={0.9}
                    disabled={credits === 0}
                    onPress={handleInterpretPress}
                >
                    <LinearGradient
                        colors={credits > 0 ? ['#7f13ec', '#650ecc'] : ['#4B5563', '#374151']}
                        style={styles.gradientButtonBg}
                    />
                    <View style={styles.buttonContent}>
                        <MaterialIcons name="auto-awesome" size={20} color={credits > 0 ? "white" : "#9CA3AF"} />
                        <Text style={[styles.interpretButtonText, credits === 0 && styles.disabledButtonText]}>
                            {credits > 0 ? t('interpret_button') : t('not_enough_credits_short') || "Kredi Yetersiz"}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Confirmation Modal */}
            <Modal
                visible={isConfirmModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsConfirmModalVisible(false)}
            >
                <View style={styles.confirmModalOverlay}>
                    <View style={styles.confirmModalContent}>
                        <View style={styles.confirmIconContainer}>
                            <MaterialIcons name="auto-awesome" size={32} color="#D8B4FE" />
                        </View>
                        <Text style={styles.confirmTitle}>{t('confirm_credit_usage_title')}</Text>
                        <Text style={styles.confirmDesc}>
                            {t('confirm_credit_usage_desc')}
                        </Text>
                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setIsConfirmModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={confirmAndAnalyze}
                            >
                                <LinearGradient
                                    colors={['#7f13ec', '#650ecc']}
                                    style={StyleSheet.absoluteFillObject}
                                />
                                <Text style={styles.confirmButtonText}>{t('approve')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Tag Ekleme Modalı */}
            <Modal
                visible={isTagModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsTagModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('add_tag')}</Text>
                            <TouchableOpacity onPress={() => setIsTagModalVisible(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalLabel}>Yeni Etiket İsmi</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Örn: Uçmak, Tırmanmak..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={newTag}
                            onChangeText={setNewTag}
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.modalSaveButton, !newTag.trim() && styles.modalSaveButtonDisabled]}
                            onPress={handleAddTag}
                            disabled={!newTag.trim()}
                        >
                            <Text style={styles.modalSaveButtonText}>{t('add')}</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#191022' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(25, 16, 34, 0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', zIndex: 10 },
    headerTitle: { color: 'white', fontSize: 18, fontFamily: 'SplineSans_700Bold' },
    headerCreditBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(127, 19, 236, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: 'rgba(127, 19, 236, 0.3)' },
    headerCreditText: { color: 'white', fontSize: 14, fontFamily: 'SplineSans_600SemiBold' },
    iconButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
    scrollContent: { paddingBottom: 100 },
    contentContainer: { padding: 16, maxWidth: 600, alignSelf: 'center', width: '100%' },
    dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 4 },
    dateText: { color: '#9CA3AF', fontSize: 14, fontFamily: 'SplineSans_500Medium' },
    title: { color: 'white', fontSize: 30, fontFamily: 'SplineSans_700Bold', marginBottom: 24, paddingHorizontal: 4, lineHeight: 36 },
    inputWrapper: { position: 'relative', marginBottom: 32, borderRadius: 16 },
    inputGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 16, opacity: 0.5 },
    inputContainer: { backgroundColor: '#251b2e', borderRadius: 16, padding: 16, minHeight: 200 },
    textInput: { flex: 1, fontSize: 18, color: 'white', fontFamily: 'SplineSans_400Regular', minHeight: 150 },
    inputFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    micButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
    micButtonActive: { backgroundColor: 'rgba(127, 19, 236, 0.2)' },
    listeningText: { color: '#D8B4FE', fontSize: 12, marginLeft: 8 },
    wordCount: { color: '#6B7280', fontSize: 12 },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
    sectionTitle: { color: 'white', fontSize: 16, fontFamily: 'SplineSans_700Bold' },
    confirmModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    confirmModalContent: {
        backgroundColor: '#2A1F3D',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(127, 19, 236, 0.3)',
        shadowColor: '#7f13ec',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10
    },
    confirmIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(127, 19, 236, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(127, 19, 236, 0.3)',
    },
    confirmTitle: {
        fontSize: 20,
        color: 'white',
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 8,
        textAlign: 'center'
    },
    confirmDesc: {
        fontSize: 15,
        color: '#ad92c9',
        fontFamily: 'SplineSans_400Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelButtonText: {
        color: 'white',
        fontFamily: 'SplineSans_600SemiBold',
        fontSize: 15
    },
    confirmButton: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center'
    },
    confirmButtonText: {
        color: 'white',
        fontFamily: 'SplineSans_600SemiBold',
        fontSize: 15,
        zIndex: 1
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#2A1F3D', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', minHeight: 300 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, color: 'white', fontFamily: 'SplineSans_700Bold' },
    modalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontFamily: 'SplineSans_400Regular' },
    modalInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, color: 'white', fontSize: 16, fontFamily: 'SplineSans_400Regular', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    modalSaveButton: { backgroundColor: '#7f13ec', borderRadius: 16, padding: 16, alignItems: 'center' },
    modalSaveButtonDisabled: { backgroundColor: 'rgba(127, 19, 236, 0.3)' },
    modalSaveButtonText: { color: 'white', fontSize: 16, fontFamily: 'SplineSans_600SemiBold' },
    horizontalScroll: { paddingHorizontal: 4, gap: 12, paddingBottom: 4 },
    tagButton: { height: 36, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
    tagButtonActive: { backgroundColor: '#7f13ec', shadowColor: '#7f13ec', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    tagButtonInactive: { backgroundColor: '#251b2e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tagText: { fontSize: 14, fontFamily: 'SplineSans_500Medium' },
    tagTextActive: { color: 'white' },
    tagTextInactive: { color: '#ad92c9' },
    aiBadge: { backgroundColor: 'rgba(127, 19, 236, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    aiBadgeText: { color: '#7f13ec', fontSize: 12, fontFamily: 'SplineSans_500Medium' },
    interpreterItem: { alignItems: 'center', gap: 8, marginRight: 16 },
    avatarContainer: { width: 64, height: 64, borderRadius: 32, padding: 2, position: 'relative' },
    avatarContainerActive: { backgroundColor: '#7f13ec', shadowColor: '#7f13ec', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    avatarInner: { flex: 1, borderRadius: 32, backgroundColor: 'white', overflow: 'hidden', borderWidth: 2, borderColor: '#251b2e' },
    avatarImage: { width: '100%', height: '100%' },
    avatarImageInactive: { opacity: 0.8 },
    checkBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#7f13ec', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#251b2e' },
    interpreterName: { fontSize: 12, color: '#9CA3AF', fontFamily: 'SplineSans_500Medium' },
    interpreterNameActive: { color: 'white', fontFamily: 'SplineSans_700Bold' },
    moodContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    moodItem: { width: 110, padding: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center', marginRight: 12, height: 110, justifyContent: 'center' },
    moodItemActive: { backgroundColor: 'rgba(127, 19, 236, 0.2)', borderColor: '#7f13ec' },
    moodItemInactive: { opacity: 0.7 },
    moodEmojiContainer: { marginBottom: 8, height: 40, justifyContent: 'center' },
    moodEmoji: { fontSize: 32 },
    moodEmojiActive: { transform: [{ scale: 1.1 }] },
    moodLabel: { color: '#9CA3AF', fontSize: 12, fontFamily: 'SplineSans_400Regular', textAlign: 'center', lineHeight: 16 },
    moodLabelActive: { color: '#D8B4FE', fontFamily: 'SplineSans_600SemiBold' },
    moodLabelInactive: { color: '#6B7280' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16, backgroundColor: 'rgba(25, 16, 34, 0.95)' }, // Fixed: Added background to hide content behind
    interpretButton: { height: 56, borderRadius: 14, overflow: 'hidden', shadowColor: '#7f13ec', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    gradientButtonBg: { ...StyleSheet.absoluteFillObject },
    buttonContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    interpretButtonText: { color: 'white', fontSize: 16, fontFamily: 'SplineSans_700Bold' },
    disabledButton: { opacity: 0.5 },
    disabledButtonText: { color: '#9CA3AF' }
});

export default NewDreamScreen;
