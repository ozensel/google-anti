import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Voice from '@react-native-voice/voice';
import { useUser } from '../context/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DreamNotesScreen = ({ navigation }) => {
    const { t, useCredit } = useUser();
    const insets = useSafeAreaInsets();
    const [notes, setNotes] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);

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
        try {
            const storedNotes = await AsyncStorage.getItem('dream_notes');
            if (storedNotes) {
                setNotes(JSON.parse(storedNotes));
            }
        } catch (error) {
            console.error('Failed to load notes', error);
        }
    };

    const saveNotes = async (updatedNotes) => {
        try {
            await AsyncStorage.setItem('dream_notes', JSON.stringify(updatedNotes));
            setNotes(updatedNotes);
        } catch (error) {
            console.error('Failed to save notes', error);
        }
    };

    const handleSaveNote = () => {
        if (!noteText.trim() && !title.trim()) return;

        const noteData = {
            id: editingNoteId || Date.now().toString(),
            title: title.trim() || t('untitled_dream'),
            text: noteText,
            date: dreamDate.toISOString(),
            mood: selectedMood,
            tags: selectedTags,
            updatedAt: new Date().toISOString(),
        };

        let updatedNotes;
        if (editingNoteId) {
            updatedNotes = notes.map(n => n.id === editingNoteId ? noteData : n);
        } else {
            updatedNotes = [noteData, ...notes];
        }

        saveNotes(updatedNotes);
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
                    onPress: () => {
                        const updatedNotes = notes.filter(note => note.id !== id);
                        saveNotes(updatedNotes);
                    }
                }
            ]
        );
    };

    const openEditModal = (note) => {
        setTitle(note.title || '');
        setNoteText(note.text || '');
        setDreamDate(new Date(note.date || note.updatedAt));
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
                        // 1. Remove from global custom tags
                        const updatedCustomTags = customTags.filter(t => t !== tag);
                        setCustomTags(updatedCustomTags);

                        // 2. Remove from active selection if currently editing a note
                        if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                        }

                        // 3. Remove this tag from ALL existing notes (Data Cleanup)
                        const updatedNotes = notes.map(note => {
                            if (note.tags && note.tags.includes(tag)) {
                                return {
                                    ...note,
                                    tags: note.tags.filter(t => t !== tag)
                                };
                            }
                            return note;
                        });
                        setNotes(updatedNotes);

                        try {
                            // Save both updates
                            await AsyncStorage.setItem('user_custom_tags', JSON.stringify(updatedCustomTags));
                            await AsyncStorage.setItem('dream_notes', JSON.stringify(updatedNotes));
                        } catch (error) {
                            console.error('Failed to save updates after tag deletion', error);
                        }
                    }
                }
            ]
        );
    };

    const handleInterpret = (note) => {
        Alert.alert(
            t('confirm_credit_usage_title') || 'Kredi Onayı',
            t('confirm_credit_usage_desc') || 'Bu rüyayı yorumlamak için 1 Kredi harcanacak. Onaylıyor musunuz?',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('approve') || 'Onayla',
                    onPress: async () => {
                        const result = await useCredit();
                        if (result.success) {
                            navigation.navigate('Chat', {
                                dreamText: note.text,
                                mood: note.mood,
                                tag: note.tags && note.tags.length > 0 ? note.tags[0] : 'general',
                                isNote: true,
                                unlocked: true // Unlock immediately
                            });
                        } else {
                            if (result.error === 'network_error') {
                                Alert.alert(t('error'), 'Bağlantı hatası. Lütfen internetinizi kontrol edin.');
                            } else {
                                Alert.alert(t('not_enough_credits_short') || 'Yetersiz Kredi', t('not_enough_credits'));
                            }
                        }
                    }
                }
            ]
        );
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
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('dream_notes_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {notes.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="edit-note" size={80} color="rgba(255,255,255,0.1)" />
                    <Text style={styles.emptyText}>{t('no_notes_yet')}</Text>
                    <TouchableOpacity onPress={() => { resetForm(); setModalVisible(true); }}>
                        <Text style={styles.emptyLink}>{t('add_first_note')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={notes}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
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

                        <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>

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
                </KeyboardAvoidingView>
            </Modal>
        </View>
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
        zIndex: 10,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
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
        marginBottom: 8, // Added margin for spacing
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
        // Removed absolute positioning
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_600SemiBold',
        marginTop: 16,
    },
    emptyLink: {
        color: '#A855F7',
        fontSize: 14,
        fontFamily: 'SplineSans_600SemiBold',
        marginTop: 8,
        textDecorationLine: 'underline',
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    modalContent: {
        backgroundColor: '#1E1428',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        height: '92%', // Increased height
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingBottom: 16,
    },
    modalTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
    },
    cancelText: {
        color: '#9CA3AF',
        fontSize: 16,
        fontFamily: 'SplineSans_400Regular',
    },
    saveHeaderText: {
        color: '#A855F7',
        fontSize: 16,
        fontFamily: 'SplineSans_600SemiBold',
    },
    formScroll: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    titleInput: {
        fontSize: 22,
        fontFamily: 'SplineSans_700Bold',
        color: 'white',
        marginBottom: 16,
        padding: 0,
    },
    inputContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        minHeight: 180,
    },
    contentInput: {
        fontSize: 16,
        fontFamily: 'SplineSans_400Regular',
        color: '#E9D5FF',
        flex: 1,
        lineHeight: 24,
        padding: 0,
        textAlignVertical: 'top',
        minHeight: 120,
    },
    inputFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 12,
    },
    micButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    micButtonActive: {
        backgroundColor: 'rgba(127, 19, 236, 0.2)',
    },
    wordCount: {
        color: '#6B7280',
        fontSize: 12,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 10,
    },
    dateSelectorText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_500Medium',
    },
    label: {
        color: '#9CA3AF',
        fontSize: 12,
        fontFamily: 'SplineSans_600SemiBold',
        marginBottom: 8,
        marginTop: 4,
        textTransform: 'uppercase',
    },
    // New Large UI Styles
    tagsScroll: {
        marginBottom: 24,
        flexGrow: 0,
    },
    tagButton: {
        height: 36,
        paddingHorizontal: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        backgroundColor: '#251b2e',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginRight: 8,
    },
    tagButtonActive: {
        backgroundColor: '#7f13ec',
        borderColor: '#7f13ec',
    },
    tagText: {
        color: '#ad92c9',
        fontSize: 14,
        fontFamily: 'SplineSans_500Medium',
    },
    tagTextActive: {
        color: 'white',
    },
    moodScroll: {
        marginBottom: 30,
    },
    moodItem: {
        width: 100,
        height: 100,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
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
        fontFamily: 'SplineSans_400Regular',
        textAlign: 'center',
    },
    moodLabelActive: {
        color: '#D8B4FE',
        fontFamily: 'SplineSans_600SemiBold',
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
    // Center Modal Styles (for Custom Tag)
    centerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    centerModalContent: {
        backgroundColor: '#2D2438',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    centerModalTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    centerModalInput: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 16,
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_400Regular',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    centerModalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    centerModalButtonCancel: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
    },
    centerModalButtonSave: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#7f13ec',
        alignItems: 'center',
    },
    centerModalButtonText: {
        color: '#D8B4FE',
        fontSize: 14,
        fontFamily: 'SplineSans_600SemiBold',
    },
});

export default DreamNotesScreen;
