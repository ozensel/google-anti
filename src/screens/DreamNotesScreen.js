import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, Dimensions, Alert, ImageBackground, Image, Share, RefreshControl, Animated, Easing, Platform, KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Voice from '@react-native-voice/voice';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import CreditBalanceButton from '../components/CreditBalanceButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DreamNotesScreen = ({ navigation }) => {
    const { t, useCredit, user, completionPercentage } = useUser();
    const insets = useSafeAreaInsets();
    const [notes, setNotes] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);
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
        await loadNotes();
        setTimeout(() => {
            setRefreshing(false);
            stopSpin();
        }, 500);
    }, [user]);

    // Form State
    const [title, setTitle] = useState('');
    const [noteText, setNoteText] = useState('');
    const [dreamDate, setDreamDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedMood, setSelectedMood] = useState(null);
    const [selectedTags, setSelectedTags] = useState([]);
    const [editingNoteId, setEditingNoteId] = useState(null);

    // Custom Tags State
    const [customTags, setCustomTags] = useState([]);
    const [isTagInputVisible, setTagInputVisible] = useState(false);
    const [newTagText, setNewTagText] = useState('');

    // Voice State
    const [isListening, setIsListening] = useState(false);
    const baseTextRef = useRef('');

    const MOODS = [
        { labelKey: 'feeling_scary', emoji: '😨', value: 'anxiety' }, // Mapped to existing values for compatibility
        { labelKey: 'feeling_good', emoji: '🙂', value: 'peace' },
        { labelKey: 'feeling_great', emoji: '🤩', value: 'excitement' },
        { labelKey: 'feeling_scary', emoji: '👻', value: 'fear' }, // Reusing scary label or new one? Using existing 'fear' value
        { labelKey: 'feeling_neutral', emoji: '😐', value: 'neutral' }
    ];

    const DEFAULT_TAGS = ['nightmare', 'lucid', 'recurring', 'vivid', 'prophetic'];

    useEffect(() => {
        loadNotes();
        loadCustomTags();
        setupVoiceListeners();
        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, []);

    const loadCustomTags = async () => {
        try {
            const stored = await AsyncStorage.getItem('user_custom_tags');
            if (stored) setCustomTags(JSON.parse(stored));
        } catch (error) {
            console.error('Failed to load custom tags', error);
        }
    };

    const handleAddCustomTag = async () => {
        if (!newTagText.trim()) return;
        const newTag = newTagText.trim();
        if (customTags.includes(newTag) || DEFAULT_TAGS.includes(newTag)) {
            Alert.alert(t('error'), t('tag_exists') || 'Bu etiket zaten var.');
            return;
        }

        const updatedTags = [newTag, ...customTags];
        setCustomTags(updatedTags);
        try {
            await AsyncStorage.setItem('user_custom_tags', JSON.stringify(updatedTags));
        } catch (error) {
            console.error('Failed to save custom tag', error);
        }

        // Auto-select the new tag
        toggleTag(newTag);
        setNewTagText('');
        setTagInputVisible(false);
    };

    const setupVoiceListeners = () => {
        Voice.onSpeechStart = (e) => setIsListening(true);
        Voice.onSpeechEnd = (e) => setIsListening(false);
        Voice.onSpeechError = (e) => {
            setIsListening(false);
            Alert.alert(t('error'), 'Ses algılama hatası: ' + JSON.stringify(e.error));
        };
        Voice.onSpeechResults = (e) => {
            if (e.value && e.value[0]) {
                const spokenText = e.value[0];
                const newText = baseTextRef.current
                    ? `${baseTextRef.current} ${spokenText}`
                    : spokenText;
                setNoteText(newText);
            }
        };
    };

    const handleVoiceToggle = async () => {
        if (isListening) {
            try {
                await Voice.stop();
            } catch (e) {
                console.error(e);
            }
        } else {
            try {
                baseTextRef.current = noteText;
                await Voice.start('tr-TR'); // Default to TR, potentially dynamic based on locale
            } catch (e) {
                console.error(e);
                Alert.alert(t('error'), 'Ses başlatılamadı.');
            }
        }
    };

    const loadNotes = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('dream_notes')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (error) throw error;
            setNotes(data || []);
        } catch (error) {
            console.error('Failed to load notes', error);
        }
    };


    const handleSaveNote = async () => {
        if (!noteText.trim() && !title.trim()) return;
        if (!user) return;

        const noteData = {
            id: editingNoteId || Date.now().toString(),
            user_id: user.id,
            title: title.trim() || t('untitled_dream'),
            text: noteText,
            date: dreamDate.toISOString(),
            mood: selectedMood,
            tags: selectedTags,
            updated_at: new Date().toISOString(), // DB column usually snake_case
        };

        // Optimistic Update
        let updatedNotes;
        if (editingNoteId) {
            updatedNotes = notes.map(n => n.id === editingNoteId ? { ...n, ...noteData } : n);
        } else {
            updatedNotes = [noteData, ...notes];
        }
        setNotes(updatedNotes);

        try {
            const { error } = await supabase
                .from('dream_notes')
                .upsert(noteData);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to save note to Supabase", error);
            Alert.alert(t('error'), "Not kaydedilemedi.");
        }

        setModalVisible(false);
        resetForm();
    };

    const resetForm = () => {
        setTitle('');
        setNoteText('');
        setDreamDate(new Date()); // Auto-select current date
        setSelectedMood(null);
        setSelectedTags([]);
        setEditingNoteId(null);
        setShowDatePicker(false);
        setIsListening(false);
        Voice.stop().catch(() => { });
    };

    const handleDeleteNote = (id) => {
        Alert.alert(
            t('delete_note_title'),
            t('delete_note_confirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        // Optimistic
                        const updatedNotes = notes.filter(note => note.id !== id);
                        setNotes(updatedNotes);

                        try {
                            const { error } = await supabase
                                .from('dream_notes')
                                .delete()
                                .eq('id', id);
                            if (error) throw error;
                        } catch (error) {
                            console.error("Failed to delete note", error);
                            loadNotes(); // Revert
                        }
                    }
                }
            ]
        );
    };

    const openEditModal = (note) => {
        setTitle(note.title || '');
        setNoteText(note.text || '');
        setDreamDate(new Date(note.date || note.updated_at || note.updatedAt));
        setSelectedMood(note.mood || null);

        // Filter out ghost tags (tags that were deleted globally but exist on this old note)
        // This ensures the Modal only shows valid, selectable tags.
        // When saved, the ghost tags will be removed from the note permanently.
        const validTags = (note.tags || []).filter(tag =>
            DEFAULT_TAGS.includes(tag) || customTags.includes(tag)
        );
        setSelectedTags(validTags);

        setEditingNoteId(note.id);
        setModalVisible(true);
    };

    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleDeleteCustomTag = (tag) => {
        if (DEFAULT_TAGS.includes(tag)) return; // Cannot delete default tags

        Alert.alert(
            t('delete_tag_title') || 'Etiketi Sil',
            t('delete_tag_confirm') || 'Bu etiketi silmek istediğinize emin misiniz?',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        // 1. Remove from global custom tags (Local Storage for now)
                        const updatedCustomTags = customTags.filter(t => t !== tag);
                        setCustomTags(updatedCustomTags);

                        // 2. Remove from active selection
                        if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                        }

                        // 3. Remove this tag from ALL existing notes
                        // Filter notes that actually have the tag
                        const notesToUpdate = notes
                            .filter(n => n.tags && n.tags.includes(tag))
                            .map(n => ({
                                ...n,
                                tags: n.tags.filter(t => t !== tag)
                            }));

                        // Optimistic UI Update
                        const updatedNotes = notes.map(n => {
                            const found = notesToUpdate.find(u => u.id === n.id);
                            return found || n;
                        });
                        setNotes(updatedNotes);

                        try {
                            // Save Tags locally
                            await AsyncStorage.setItem('user_custom_tags', JSON.stringify(updatedCustomTags));

                            // Save impacted notes to Supabase
                            if (notesToUpdate.length > 0) {
                                const { error } = await supabase
                                    .from('dream_notes')
                                    .upsert(notesToUpdate);
                                if (error) throw error;
                            }
                        } catch (error) {
                            console.error('Failed to save updates after tag deletion', error);
                        }
                    }
                }
            ]
        );
    };

    // Generic Modal State
    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        visible: false,
        type: 'confirm', // 'confirm' | 'error' | 'success'
        title: '',
        message: '',
        buttons: [] // { text, style, onPress }
    });

    const showModal = (type, title, message, buttons = []) => {
        setModalConfig({
            visible: true,
            type,
            title,
            message,
            buttons: buttons.length > 0 ? buttons : [
                { text: 'Tamam', onPress: () => setModalConfig(prev => ({ ...prev, visible: false })) }
            ]
        });
    };

    const [noteToInterpret, setNoteToInterpret] = useState(null);

    const proceedWithInterpretation = (note) => {
        const textToAnalyze = note.text || noteText;
        const wordCount = textToAnalyze.trim().split(/\s+/).length;

        if (wordCount < 10) {
            showModal(
                'error',
                t('error'),
                t('dream_too_short') || 'Rüyanız çok kısa. Lütfen biraz daha detay ekleyin (en az 10 kelimelik).',
                [{ text: 'Tamam', onPress: () => setModalConfig(prev => ({ ...prev, visible: false })) }]
            );
            return;
        }

        setNoteToInterpret(note);
        showModal(
            'confirm',
            t('confirm_credit_usage_title') || 'Kredi Onayı',
            t('confirm_credit_usage_desc') || 'Bu rüyayı yorumlamak için 1 Kredi, harcanacak. Onaylıyor musunuz?',
            [
                {
                    text: t('cancel'),
                    style: 'cancel',
                    onPress: () => setModalConfig(prev => ({ ...prev, visible: false }))
                },
                {
                    text: t('approve') || 'Onayla',
                    onPress: () => confirmAndAnalyze(note)
                }
            ]
        );
    };

    const handleInterpret = (note) => {
        if (completionPercentage < 100) {
            setNoteToInterpret(note);
            setIsProfileModalVisible(true);
            return;
        }

        proceedWithInterpretation(note);
    };

    const confirmAndAnalyze = async (note) => {
        setModalConfig(prev => ({ ...prev, visible: false })); // Close modal first

        // Use either passed note or stored note
        const targetNote = note || noteToInterpret;
        if (!targetNote) return;

        const result = await useCredit();
        if (result.success) {
            navigation.navigate('Chat', {
                dreamText: targetNote.text,
                mood: targetNote.mood,
                tag: targetNote.tags && targetNote.tags.length > 0 ? targetNote.tags[0] : 'general',
                isNote: true,
                unlocked: true // Unlock immediately
            });
        } else {
            const errorTitle = result.error === 'network_error' ? t('error') : (t('not_enough_credits_short') || 'Yetersiz Kredi');
            const errorMsg = result.error === 'network_error'
                ? 'Bağlantı hatası. Lütfen internetinizi kontrol edin.'
                : t('not_enough_credits');

            setTimeout(() => {
                showModal('error', errorTitle, errorMsg);
            }, 300); // Small delay for modal transition
        }
    };

    const renderItem = ({ item }) => {
        const moodObj = MOODS.find(m => m.value === item.mood);
        const dateObj = new Date(item.date);

        return (
            <TouchableOpacity
                style={styles.noteCard}
                onPress={() => openEditModal(item)}
                onLongPress={() => handleDeleteNote(item.id)}
                delayLongPress={500}
                activeOpacity={0.8}
            >
                <View style={styles.noteHeader}>
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateDay}>{dateObj.getDate()}</Text>
                        <Text style={styles.dateMonth}>{dateObj.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase()}</Text>
                        {/* Time included for completeness as per user request */}
                        <Text style={styles.dateTime}>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.tagsRow}>
                            {item.tags?.slice(0, 3).map(tag => (
                                <View key={tag} style={styles.miniTag}>
                                    <Text style={styles.miniTagText}>{DEFAULT_TAGS.includes(tag) ? (t(`tag_${tag}`) || tag) : tag}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                    {moodObj && (
                        <View style={styles.moodIconContainer}>
                            <Text style={{ fontSize: 24 }}>{moodObj.emoji}</Text>
                        </View>
                    )}
                </View>

                {item.text ? (
                    <Text style={styles.noteText} numberOfLines={2}>{item.text}</Text>
                ) : null}

                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.interpretButtonSmall} onPress={() => handleInterpret(item)}>
                        <LinearGradient
                            colors={['rgba(168, 85, 247, 0.2)', 'rgba(126, 34, 206, 0.2)']}
                            style={styles.interpretGradientSmall}
                        >
                            <Ionicons name="sparkles" size={14} color="#D8B4FE" style={{ marginRight: 6 }} />
                            <Text style={styles.interpretTextSmall}>{t('interpret_short') || 'Yorumla'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10, zIndex: 100, backgroundColor: '#191022' }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('dream_notes_title')}</Text>
                <CreditBalanceButton dark={true} />
            </View>

            {notes.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyIconContainer}>
                        <MaterialIcons name="edit-note" size={48} color="#D8B4FE" />
                    </View>
                    <Text style={styles.emptyStateTitle}>{t('no_notes_yet') || 'Henüz Not Yok'}</Text>
                    <Text style={styles.emptyStateText}>
                        {t('start_writing_note') || 'Aklınıza gelenleri, sembolleri veya hislerinizi not almaya başlayın.'}
                    </Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={notes}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="transparent"
                                colors={['transparent']}
                                style={{ backgroundColor: 'transparent', zIndex: 100 }}
                            />
                        }
                        ListHeaderComponent={
                            /* Custom Bear Refresher Header (Negative margin trick for FlatList is harder, using Header but it pushes content...
                               Better: Put this VIEW absolutely positioned inside the FlatList header? No.
                               For FlatList, the best "pull reveal" mimics are tricky.
                               BUT: overflow: visible works on FlatList too.
                               We can put the View inside the fragment but `absolute` relative to the container.
                               Actually, the previous implementation had it outside.
                               To move *with* scroll, it must be inside.
                               FlatList has `ListHeaderComponent`. If we put it there with `marginTop: -140`, it will be hidden?
                               Let's try putting it as a sibling in valid ScrollView hierarchy? No FlatList is virtualized.
                               Best approach for FlatList: Render it as part of ListHeaderComponent but offset up.
                            */
                            <View style={{ height: 0, overflow: 'visible' }}>
                                <View style={{ position: 'absolute', top: -170, left: 0, right: 0, height: 140, alignItems: 'center', justifyContent: 'flex-end', zIndex: 10 }}>
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
                            </View>
                        }
                    />
                </>
            )}

            <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
                <LinearGradient
                    colors={['#A855F7', '#7E22CE']}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={32} color="white" />
                </LinearGradient>
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                                    <Text style={styles.cancelText}>{t('cancel')}</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>{editingNoteId ? t('edit_note') : t('new_note')}</Text>
                                <TouchableOpacity onPress={handleSaveNote} style={styles.saveHeaderButton}>
                                    <Text style={styles.saveHeaderText}>{t('save')}</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                contentContainerStyle={styles.formScroll}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                            >

                                {/* 1. Title Input (Top) */}
                                <TextInput
                                    style={styles.titleInput}
                                    placeholder={t('title_placeholder')}
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={title}
                                    onChangeText={setTitle}
                                />

                                {/* 2. Content Input + Voice (Reordered) */}
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.contentInput}
                                        multiline
                                        placeholder={isListening ? t('listening') || "Dinliyorum..." : t('note_placeholder')}
                                        placeholderTextColor={isListening ? "#D8B4FE" : "rgba(255,255,255,0.3)"}
                                        value={noteText}
                                        onChangeText={setNoteText}
                                        textAlignVertical="top"
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
                                        <Text style={styles.wordCount}>
                                            {isListening ? (t('listening') || "Dinliyorum...") : (noteText.trim() ? `${noteText.trim().split(/\s+/).length} kelime` : '')}
                                        </Text>
                                    </View>
                                </View>

                                {/* 3. Date Selector (Auto-selected, editable) */}
                                <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                                    <Ionicons name="calendar-outline" size={20} color="#D8B4FE" />
                                    <Text style={styles.dateSelectorText}>
                                        {dreamDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={dreamDate}
                                        mode="date" // We can switch to 'datetime' if needed, but 'date' is safer for now. Users can edit time by re-opening if mode supports it.
                                        display="spinner"
                                        onChange={(event, date) => {
                                            setShowDatePicker(false);
                                            if (date) setDreamDate(date);
                                        }}
                                        textColor="white"
                                        themeVariant="dark"
                                    />
                                )}

                                {/* 4. Tags Selector (Large UI) */}
                                <Text style={styles.label}>{t('label_tags')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                                    {/* Add Custom Tag Button */}
                                    <TouchableOpacity
                                        style={[styles.tagButton, { borderColor: '#A855F7', borderStyle: 'dashed' }]}
                                        onPress={() => setTagInputVisible(true)}
                                    >
                                        <Ionicons name="add" size={18} color="#A855F7" style={{ marginRight: 4 }} />
                                        <Text style={[styles.tagText, { color: '#A855F7' }]}>{t('add_tag') || 'Ekle'}</Text>
                                    </TouchableOpacity>

                                    {[...customTags, ...DEFAULT_TAGS].map(tag => (
                                        <TouchableOpacity
                                            key={tag}
                                            style={[styles.tagButton, selectedTags.includes(tag) && styles.tagButtonActive]}
                                            onPress={() => toggleTag(tag)}
                                            onLongPress={() => {
                                                if (customTags.includes(tag)) {
                                                    handleDeleteCustomTag(tag);
                                                }
                                            }}
                                            delayLongPress={500}
                                        >
                                            {selectedTags.includes(tag) && <Ionicons name="checkmark" size={16} color="white" style={{ marginRight: 4 }} />}
                                            <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                                                {DEFAULT_TAGS.includes(tag) ? (t(`tag_${tag}`) || tag) : tag}
                                            </Text>

                                            {/* Visual Indicator for Custom Tags */}
                                            {customTags.includes(tag) && (
                                                <View style={{ marginLeft: 6, opacity: 0.6 }}>
                                                    <Ionicons name="close-circle-outline" size={14} color={selectedTags.includes(tag) ? "white" : "#ad92c9"} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* 5. Mood Selector (Large UI) */}
                                <Text style={styles.label}>{t('label_mood')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScroll}>
                                    {MOODS.map(m => (
                                        <TouchableOpacity
                                            key={m.value}
                                            style={[
                                                styles.moodItem,
                                                selectedMood === m.value && styles.moodItemActive
                                            ]}
                                            onPress={() => setSelectedMood(selectedMood === m.value ? null : m.value)}
                                        >
                                            <Text style={[styles.moodEmoji, selectedMood === m.value && styles.moodEmojiActive]}>{m.emoji}</Text>
                                            <Text style={[styles.moodLabel, selectedMood === m.value && styles.moodLabelActive]}>
                                                {t(m.labelKey) || m.value}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* 6. Interpret Action */}
                                <TouchableOpacity style={styles.modalInterpretButton} onPress={() => {
                                    setModalVisible(false);
                                    handleInterpret({ text: noteText, mood: selectedMood, tags: selectedTags });
                                }}>
                                    <LinearGradient
                                        colors={['#7f13ec', '#4c1d95']}
                                        style={styles.modalInterpretGradient}
                                    >
                                        <Ionicons name="sparkles" size={20} color="white" style={{ marginRight: 8 }} />
                                        <Text style={styles.modalInterpretText}>{t('interpret_this_dream') || 'Bu Rüyayı Yorumla'}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                            </ScrollView>

                            {/* Custom Tag Input Overlay */}
                            {isTagInputVisible && (
                                <View style={[StyleSheet.absoluteFill, styles.centerModalOverlay, { zIndex: 999, elevation: 11 }]}>
                                    <View style={styles.centerModalContent}>
                                        <Text style={styles.centerModalTitle}>{t('add_custom_tag') || 'Yeni Etiket Ekle'}</Text>
                                        <TextInput
                                            style={styles.centerModalInput}
                                            placeholder={t('tag_placeholder') || 'Örn: Kedi, Uçmak'}
                                            placeholderTextColor="rgba(255,255,255,0.4)"
                                            value={newTagText}
                                            onChangeText={setNewTagText}
                                            autoFocus
                                            maxLength={20}
                                        />
                                        <View style={styles.centerModalButtons}>
                                            <TouchableOpacity
                                                style={styles.centerModalButtonCancel}
                                                onPress={() => setTagInputVisible(false)}
                                            >
                                                <Text style={styles.centerModalButtonText}>{t('cancel')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.centerModalButtonSave}
                                                onPress={handleAddCustomTag}
                                            >
                                                <Text style={[styles.centerModalButtonText, { color: 'white' }]}>{t('add') || 'Ekle'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
            {/* Profile Incomplete Modal - Customized Design */}
            <Modal
                visible={isProfileModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsProfileModalVisible(false)}
            >
                <View style={styles.confirmModalOverlay}>
                    <View style={styles.profileModalContent}>
                        {/* Decorative Icon */}
                        <View style={styles.profileModalIconContainer}>
                            <MaterialIcons name="person-outline" size={40} color="#D8B4FE" />
                            <View style={styles.profileModalIconBadge}>
                                <MaterialIcons name="priority-high" size={16} color="white" />
                            </View>
                        </View>

                        <Text style={styles.profileModalTitle}>{t('profile_incomplete_title') || 'Profiliniz Eksik!'}</Text>
                        <Text style={styles.profileModalDesc}>
                            {t('profile_incomplete_desc') || 'Daha isabetli rüya yorumları alabilmek için lütfen profil bilgilerinizi eksiksiz tamamlayın.'}
                        </Text>

                        {/* Feature List */}
                        <View style={styles.profileFeatureList}>
                            <View style={styles.profileFeatureItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#A855F7" />
                                <Text style={styles.profileFeatureText}>{t('improve_accuracy', { defaultValue: 'Daha doğru yorumlar' })}</Text>
                            </View>
                            <View style={styles.profileFeatureItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#A855F7" />
                                <Text style={styles.profileFeatureText}>{t('personalized_insights', { defaultValue: 'Kişiselleştirilmiş içgörüler' })}</Text>
                            </View>
                        </View>

                        <View style={styles.profileModalButtons}>
                            <TouchableOpacity
                                style={styles.profileLaterButton}
                                onPress={() => {
                                    setIsProfileModalVisible(false);
                                    if (noteToInterpret) {
                                        setTimeout(() => proceedWithInterpretation(noteToInterpret), 300);
                                    }
                                }}
                            >
                                <Text style={styles.profileLaterText}>{t('later') || 'Daha Sonra'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.profileCompleteButton}
                                onPress={() => {
                                    setIsProfileModalVisible(false);
                                    navigation.navigate('MainTabs', {
                                        screen: 'SettingsTab',
                                        params: { openProfile: true }
                                    });
                                }}
                            >
                                <LinearGradient
                                    colors={['#7f13ec', '#650ecc']}
                                    style={StyleSheet.absoluteFillObject}
                                />
                                <Text style={styles.profileCompleteText}>{t('complete_now') || 'Hemen Tamamla'}</Text>
                                <MaterialIcons name="arrow-forward" size={16} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Generic Custom Modal */}
            <Modal
                visible={modalConfig.visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalConfig(prev => ({ ...prev, visible: false }))}
            >
                <View style={styles.confirmModalOverlay}>
                    <View style={styles.confirmModalContent}>
                        <View style={styles.confirmIconContainer}>
                            <MaterialIcons
                                name={modalConfig.type === 'error' ? "info-outline" : "auto-awesome"}
                                size={32}
                                color="#D8B4FE"
                            />
                        </View>
                        <Text style={styles.confirmTitle}>{modalConfig.title}</Text>
                        <Text style={styles.confirmDesc}>
                            {modalConfig.message}
                        </Text>
                        <View style={styles.confirmButtons}>
                            {modalConfig.buttons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={btn.style === 'cancel' ? styles.cancelButton : styles.confirmButton}
                                    onPress={btn.onPress}
                                >
                                    {btn.style !== 'cancel' && (
                                        <LinearGradient
                                            colors={['#7f13ec', '#650ecc']}
                                            style={StyleSheet.absoluteFillObject}
                                        />
                                    )}
                                    <Text style={btn.style === 'cancel' ? styles.cancelButtonText : styles.confirmButtonText}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#191022',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    noteCard: {
        backgroundColor: '#2D2438',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden', // Added to contain children
    },
    noteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateBadge: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginRight: 12,
        minWidth: 50,
    },
    dateDay: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
        lineHeight: 22,
    },
    dateMonth: {
        color: '#9CA3AF',
        fontSize: 10,
        fontFamily: 'SplineSans_600SemiBold',
    },
    dateTime: {
        color: '#6B7280',
        fontSize: 9,
        marginTop: 2,
    },
    headerContent: {
        flex: 1,
    },
    noteTitle: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_600SemiBold',
        marginBottom: 4,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    miniTag: {
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniTagText: {
        color: '#D8B4FE',
        fontSize: 10,
        fontFamily: 'SplineSans_600SemiBold',
    },
    noteText: {
        color: '#E9D5FF',
        fontSize: 14,
        fontFamily: 'SplineSans_400Regular',
        lineHeight: 20,
        marginBottom: 8,
    },
    cardActions: {
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    interpretButtonSmall: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    interpretGradientSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    interpretTextSmall: {
        color: '#D8B4FE',
        fontSize: 12,
        fontFamily: 'SplineSans_600SemiBold',
    },
    modalInterpretButton: {
        marginTop: 20,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    modalInterpretGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    modalInterpretText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_700Bold',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    deleteButton: {
        padding: 4,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(216, 180, 254, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(216, 180, 254, 0.2)',
    },
    emptyStateTitle: {
        fontSize: 20,
        fontFamily: 'SplineSans_700Bold',
        color: 'white',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        fontFamily: 'SplineSans_400Regular',
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        shadowColor: '#7f13ec',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    fabGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#191022',
    },
    modalContent: {
        flex: 1,
        backgroundColor: '#191022',
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    closeButton: {
        padding: 8,
    },
    cancelText: {
        color: '#9CA3AF',
        fontSize: 16,
        fontFamily: 'SplineSans_400Regular',
    },
    modalTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
    },
    saveHeaderButton: {
        padding: 8,
    },
    saveHeaderText: {
        color: '#D8B4FE',
        fontSize: 16,
        fontFamily: 'SplineSans_700Bold',
    },
    formScroll: {
        padding: 20,
        paddingBottom: 100,
    },
    titleInput: {
        fontSize: 24,
        fontFamily: 'SplineSans_700Bold',
        color: 'white',
        marginBottom: 24,
    },
    inputContainer: {
        backgroundColor: '#2D2438',
        borderRadius: 16,
        padding: 16,
        minHeight: 200,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    contentInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'SplineSans_400Regular',
        color: 'white',
        lineHeight: 24,
        minHeight: 150,
        textAlignVertical: 'top',
    },
    inputFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    micButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    micButtonActive: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
    },
    listeningText: {
        color: '#D8B4FE',
        fontSize: 12,
        marginLeft: 8,
    },
    wordCount: {
        color: '#6B7280',
        fontSize: 12,
        fontFamily: 'SplineSans_500Medium',
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    dateSelectorText: {
        color: 'white',
        marginLeft: 10,
        fontSize: 16,
        fontFamily: 'SplineSans_500Medium',
    },
    label: {
        color: '#9CA3AF',
        fontSize: 12,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tagsScroll: {
        marginBottom: 24,
    },
    tagButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagButtonActive: {
        backgroundColor: '#7f13ec',
        borderColor: '#7f13ec',
    },
    tagText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontFamily: 'SplineSans_500Medium',
    },
    tagTextActive: {
        color: 'white',
    },
    moodScroll: {
        marginBottom: 32,
    },
    moodItem: {
        width: 100,
        height: 100,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    moodItemActive: {
        backgroundColor: 'rgba(127, 19, 236, 0.2)',
        borderColor: '#7f13ec',
    },
    moodEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    moodEmojiActive: {
        transform: [{ scale: 1.1 }],
    },
    moodLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        fontFamily: 'SplineSans_500Medium',
        textAlign: 'center',
    },
    moodLabelActive: {
        color: '#D8B4FE',
        fontFamily: 'SplineSans_700Bold',
    },
    moodIconContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    centerModalOverlay: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    centerModalContent: {
        width: '100%',
        backgroundColor: '#2D2438',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    centerModalTitle: {
        fontSize: 18,
        color: 'white',
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    centerModalInput: {
        backgroundColor: '#191022',
        borderRadius: 12,
        padding: 16,
        color: 'white',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 24,
    },
    centerModalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    centerModalButtonCancel: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    },
    centerModalButtonSave: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#7f13ec',
        alignItems: 'center',
    },
    centerModalButtonText: {
        color: '#9CA3AF',
        fontSize: 16,
        fontFamily: 'SplineSans_600SemiBold',
    },
    profileModalContent: {
        width: '100%',
        backgroundColor: '#2A1F3D',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(127, 19, 236, 0.3)',
        shadowColor: '#7f13ec',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10
    },
    profileModalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(42, 31, 61, 1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(127, 19, 236, 0.5)',
        position: 'relative'
    },
    profileModalIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#EF4444',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2A1F3D'
    },
    profileModalTitle: {
        fontSize: 22,
        fontFamily: 'SplineSans_700Bold',
        color: 'white',
        marginBottom: 8,
        textAlign: 'center'
    },
    profileModalDesc: {
        fontSize: 15,
        fontFamily: 'SplineSans_400Regular',
        color: '#D8B4FE',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22
    },
    profileFeatureList: {
        width: '100%',
        backgroundColor: 'rgba(127, 19, 236, 0.1)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24
    },
    profileFeatureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    profileFeatureText: {
        fontSize: 14,
        color: 'white',
        fontFamily: 'SplineSans_500Medium',
        marginLeft: 10
    },
    profileModalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    profileLaterButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)'
    },
    profileLaterText: {
        color: '#9CA3AF',
        fontFamily: 'SplineSans_600SemiBold',
        fontSize: 15
    },
    profileCompleteButton: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        overflow: 'hidden',
        paddingVertical: 14,
        gap: 8
    },
    profileCompleteText: {
        color: 'white',
        fontFamily: 'SplineSans_600SemiBold',
        fontSize: 15,
        zIndex: 1
    },
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
        justifyContent: 'center',
        paddingVertical: 14, // Added to fix thin button height
    },
    confirmButtonText: {
        color: 'white',
        fontFamily: 'SplineSans_600SemiBold',
        fontSize: 15,
        zIndex: 1
    }
});

export default DreamNotesScreen;
