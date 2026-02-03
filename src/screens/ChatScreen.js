import { useRef, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Dimensions, Platform, KeyboardAvoidingView, Modal, ActivityIndicator, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import ProfileAvatar from '../components/ProfileAvatar';

const { width, height } = Dimensions.get('window');

const ChatScreen = ({ navigation, route }) => {
    const { dreamId, dreamText, interpreter = 'Sigmund', tag, mood, previousAnalysis, previousMessages, unlocked = false } = route.params || {};
    const { credits, useCredit, isFirstDream, completeFirstDream, t, profile, user, fetchProfile } = useUser();

    // Use passed dreamId or null (will be created on save)
    const [currentDreamId, setCurrentDreamId] = useState(dreamId);

    // Kilit durumu logic update:
    // If it's the first dream OR we have existing analysis/messages OR it was unlocked via NewDreamScreen
    const initialLockedState = !(unlocked || isFirstDream || !!previousAnalysis || (previousMessages && previousMessages.length > 0));

    const [isLocked, setIsLocked] = useState(initialLockedState);
    const [isChatUnlocked, setIsChatUnlocked] = useState(false); // Controls the "Start Chat" barrier
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const scrollViewRef = useRef();

    useEffect(() => {
        // CASE 1: Loading existing history
        if (previousMessages && previousMessages.length > 0) {
            setMessages(previousMessages);
            setIsLocked(false);
            return;
        }

        // CASE 2: Loading just analysis result (compatibility)
        if (previousAnalysis) {
            const reconstructed = [
                {
                    id: 1,
                    type: 'user',
                    text: dreamText || t('dream_text_not_found'),
                    time: getCurrentTime()
                },
                {
                    id: 2,
                    type: 'ai',
                    text: previousAnalysis,
                    time: getCurrentTime(),
                    highlighted: true
                }
            ];
            setMessages(reconstructed);
            setIsLocked(false);
            return;
        }

        // CASE 3: New Dream
        const initialMessages = [
            {
                id: 1,
                type: 'user',
                text: dreamText || t('dream_text_not_found'),
                time: getCurrentTime()
            }
        ];
        setMessages(initialMessages);

        // If first dream OR explicitly unlocked (paid in previous screen), trigger analysis immediately
        if (isFirstDream || unlocked) {
            triggerAnalysis();
            if (isFirstDream) completeFirstDream();
        }

        // Refresh profile to get latest avatar
        if (user?.id && fetchProfile) {
            fetchProfile(user.id);
        }
    }, [dreamText]);

    const [loading, setLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("");
    const [loadingStep, setLoadingStep] = useState(0);

    // Dynamic Loading Text Logic
    useEffect(() => {
        let interval;
        if (loading) {
            setLoadingStep(0);
            interval = setInterval(() => {
                setLoadingStep(prev => (prev + 1) % 5);
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    useEffect(() => {
        if (loading) {
            // 5 steps defined in tr.json
            const stepKey = `loading_step_${loadingStep + 1}`;
            // If interpreter is AI, use generic steps. If Freud etc, maybe customize? sticking to generic for consistency.
            const baseStatus = t(stepKey) || "Analiz yapılıyor...";
            setLoadingStatus(baseStatus);
        }
    }, [loading, loadingStep, t]);

    // Helper to get current time
    const getCurrentTime = () => {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Helper to save/update dream
    const saveConversation = async (newMessages, analysisText = null) => {
        if (!user) return; // Guard against no user
        try {
            let newId = currentDreamId || Date.now().toString();
            if (!currentDreamId) setCurrentDreamId(newId);

            const dreamData = {
                id: newId,
                user_id: user.id,
                date: new Date().toISOString(),
                title: dreamText && dreamText.length > 30 ? dreamText.substring(0, 30) + "..." : (dreamText || "Rüya"),
                text: dreamText,
                analysis: analysisText || (messages.find(m => m.type === 'ai')?.text || ""),
                messages: newMessages,
                mood: mood || 'feeling_neutral',
                tag: tag || 'tag_general',
                interpreter: interpreter
            };

            const { error } = await supabase
                .from('dreams')
                .upsert(dreamData);

            if (error) throw error;
            console.log("Conversation saved to Supabase!");
        } catch (error) {
            console.error("Failed to save conversation:", error);
        }
    };

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    const constructPrompt = (isChatMode = false) => {
        // 1. Define Persona
        let systemRole = "Act as a wise, master dream interpreter who combines psychology and spirituality.";
        if (interpreter === 'Sigmund Freud') systemRole = "Act as Sigmund Freud. Use psychoanalysis, focus on repressed desires, childhood, and sexuality. Be analytical and authoritative.";
        if (interpreter === 'Carl Jung') systemRole = "Act as Carl Jung. Focus on archetypes, the collective unconscious, and individuation. Be philosophical and deep.";
        if (interpreter === 'İbn-i Şirin') systemRole = "Act as Ibn-i Sirin. Interpret based on Islamic tradition and spiritual symbols. Be wise, religious, and respectful.";
        if (interpreter === 'Baba Vanga') systemRole = "Act as Baba Vanga. Be mystical, predictive, and slightly cryptic. Focus on future warnings.";
        if (interpreter === 'Nostradamus') systemRole = "Act as Nostradamus. Write in a slightly poetic, prophetic riddle style, then explain it.";

        // 2. Prepare Profile Context
        let profileContext = "User Profile: Anonymous";
        if (profile) {
            const age = profile.birth_date ? (new Date().getFullYear() - new Date(profile.birth_date).getFullYear()) : '?';
            profileContext = `
User Profile (for context only):
- Age: ${age}
- Gender: ${profile.gender || '?'}
- Job: ${profile.job || '?'}
- Marital Status: ${profile.marital_status || '?'}
- Zodiac: ${profile.zodiac_sign || '?'}
            `.trim();
        }

        // 3. Construct System Instruction (The "Brain")
        let systemInstruction = "";

        if (!isChatMode) {
            // INITIAL ANALYSIS MODE (Deep, Mystical, Detailed)
            systemInstruction = `
${systemRole}

${profileContext}

CRITICAL RULES FOR INTERPRETATION:

1. **ADAPTIVE VOCABULARY (Crucial)**:
   - **Analyze the User's Job**: 
     - If the user has an academic/white-collar job (e.g., Doctor, Engineer, Teacher, Architect), you may use some psychological terminology (like "archetype", "subconscious"), but keep it fluid.
     - **DEFAULT / General User**: If the job is manual, general, student, or unknown, you MUST **SIMPLIFY** your language. 
       - *Forbidden*: "Kolektif bilinçdışı", "Anima/Animus", "Metaforik imge".
       - *Allowed*: "İç dünyan", "Ruhunun derinlikleri", "Sembol".
       - Speak plainly, like a wise friend, not a textbook.

2. **Holistic Synthesis**: 
   - Do NOT list user details. WEAVE them into the story only if relevant.
   - Example: "Since you work as a [Job], this symbol might represent..." (Only if it makes sense).

3. **Language Rule**: 
   - The prompt is in English, but you MUST respond in the **SAME LANGUAGE** as the user's "Dream Text".

4. **Format**: 
   - No headers. No "Introduction".
   - Direct, flowing, warm, and mystical narrative.

5. **ENGAGEMENT HOOK (Crucial)**:
   - You MUST end your interpretation with a **Subtle Mystery** or **Cliffhanger**.
   - Hint at a hidden detail, a connection to a specific person, or a future warning that you haven't fully explained yet.
   - Example rule: "...there is one specific detail about the [dream_object] that suggests a secret from your past, but I am not sure if I should reveal it yet..."
   - **Goal**: Trigger curiosity so the user asks "What is it?" or "Tell me more".

6. **SAFETY GUARDRAILS (ZERO TOLERANCE/CRITICAL)**:
   - **Trigger**: If the dream contains themes of suicide, self-harm, death, jumping from heights, or extreme violence.
   - **Rule 1 (No Romanticizing)**: NEVER frame harmful acts as "peaceful", "safe", or "a return to the womb". 
     - *Bad*: "Jumping from the roof is like returning to mother's arms."
     - *Good*: "Falling often symbolizes a loss of control or a desire to let go of a heavy burden."
   - **Rule 2 (Mandatory Disclaimer)**: You MUST append this exact note at the very end of your response if these themes are present:
     - "Note: Dreams are symbolic. If you feel overwhelmed, please seek professional support." (Translate this to the response language).
            `.trim();
        } else {
            // CONVERSATIONAL CHAT MODE (Responsive, Concise, Direct)
            systemInstruction = `
${systemRole}

${profileContext}

You have already interpreted the user's dream. Now you are in a CONVERSATIONAL MODE.

RULES FOR CHAT:
1. **Direct & Concise**: Answer the user's specific question directly. Do NOT go into long monologues unless asked.
2. **Context**: Key context is the dream text and your previous interpretation, but your FOCUS is the user's current query.
3. **Tone**: Keep the persona (${interpreter}) but be more interactive, shorter, and like a real conversation.
4. **Length Control**: If the user asks for a short explanation ("Kısaca anlat", "zetle"), you MUST be brief.
5. **No Repetition**: Do NOT re-interpret the whole dream unless explicitly asked to "interpret again".
6. **Safety**: Continue to adhere to safety guardrails for self-harm themes.
7. **Language**: Respond in the same language as the user's message.
            `.trim();
        }

        // 4. Initial User Payload
        const initialUserMessage = `
Dream Text: "${dreamText}"
Theme: ${tag || 'General'}
Main Emotion: ${mood || 'Neutral'}

Interpret this dream now.
        `.trim();

        return { systemInstruction, initialUserMessage };
    };

    const fetchGeminiResponse = async (history, systemInstruction) => {
        const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
        const models = ['gemini-3-pro-preview', 'gemini-2.0-flash-001', 'gemini-1.5-pro-001'];

        for (const model of models) {
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    // Status silenced to avoid technical jargon
                    // const statusMsg = `Model deneniyor: ${model}`;
                    // setLoadingStatus(statusMsg);

                    const url = `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${model}:generateContent?key=${apiKey}`;

                    const requestBody = {
                        system_instruction: { parts: [{ text: systemInstruction }] },
                        contents: history
                    };

                    // console.log("🔵 API Request Body:", JSON.stringify(requestBody).substring(0, 100) + "..."); // Silenced/Truncated log

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });

                    const data = await response.json();

                    if (data.error) {
                        if (data.error.code === 429 || data.error.status === 'RESOURCE_EXHAUSTED') {
                            await delay(3000);
                            attempts++;
                            continue;
                        }
                        console.warn(`Model ${model} error:`, data.error.message);
                        break;
                    }

                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) return text;
                    break;

                } catch (error) {
                    // console.error(`Network Error on ${model}:`, error); // Reduced log noise
                    if (attempts < 2) {
                        setLoadingStatus("Bağlantı zayıf, tekrar deneniyor...");
                        await delay(2000);
                        attempts++;
                        continue;
                    }
                    break;
                }
            }
        }
        return t('interpreter_response_default') + " (Sunucu meşgul)";
    };

    const triggerAnalysis = async () => {
        const { systemInstruction, initialUserMessage } = constructPrompt();
        setLoading(true);
        const interpreterName = interpreter === 'AI' ? 'Yapay Zeka' : interpreter;
        setLoadingStatus(t('analyzing_dream_by', { name: interpreterName }) || `${interpreterName} rüyanı inceliyor...`);

        // Initial history is just the dream
        const history = [{
            role: 'user',
            parts: [{ text: initialUserMessage }]
        }];

        const aiResponse = await fetchGeminiResponse(history, systemInstruction);

        const analysisMsg = {
            id: Date.now(),
            type: 'ai',
            text: aiResponse,
            time: getCurrentTime(),
            highlighted: true
        };
        setMessages(prev => [...prev, analysisMsg]);
        setLoading(false);
        setLoadingStatus("");

        // SAVE DREAM TO SUPABASE
        if (user) {
            try {
                const newId = Date.now().toString();
                const newDream = {
                    id: newId,
                    user_id: user.id,
                    date: new Date().toISOString(),
                    title: dreamText.length > 30 ? dreamText.substring(0, 30) + "..." : dreamText,
                    text: dreamText,
                    analysis: aiResponse,
                    mood: mood || 'feeling_neutral',
                    tag: tag || 'tag_general',
                    interpreter: interpreter,
                    messages: [...messages, analysisMsg] // Save initial flow
                };

                const { error } = await supabase
                    .from('dreams')
                    .insert(newDream);

                if (error) throw error;

                setCurrentDreamId(newId);
                console.log("Dream saved to Supabase successfully!");
            } catch (error) {
                console.error("Failed to save dream:", error);
            }
        }
    };

    const handleUnlock = async () => {
        const result = await useCredit();
        if (result.success) {
            setIsLocked(false);
            triggerAnalysis();
        } else {
            if (result.error === 'network_error') {
                alert(t('error') + ': Bağlantı hatası. Lütfen internetinizi kontrol edin.');
            } else {
                alert(t('not_enough_credits'));
            }
        }
    };

    const handleStartChat = () => {
        Alert.alert(
            t('chat_unlock_title'),
            t('chat_unlock_desc'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('approve'),
                    onPress: () => setIsChatUnlocked(true)
                }
            ]
        );
    };

    const handeSend = async () => {
        if (inputText.trim().length === 0) return;

        // 1. Check Credits First
        const result = await useCredit();
        if (!result.success) {
            if (result.error === 'network_error') {
                alert(t('error') + ': Bağlantı hatası. Lütfen internetinizi kontrol edin.');
            } else {
                alert(t('not_enough_credits'));
            }
            return;
        }

        // 2. Add User Message
        const newMsg = {
            id: Date.now(),
            type: 'user',
            text: inputText,
            time: getCurrentTime()
        };
        setMessages(prev => [...prev, newMsg]); // Optimistic update
        setInputText('');

        // 3. Trigger AI Response
        setLoading(true);
        const interpreterName = interpreter === 'AI' ? 'Yapay Zeka' : interpreter;
        setLoadingStatus(`${interpreterName} yazıyor...`);

        // Build History
        const { systemInstruction, initialUserMessage } = constructPrompt(true);

        // Convert 'messages' + 'newMsg' to Vertex API format
        const fullConversation = [...messages, newMsg];

        const apiHistory = fullConversation.map((msg, index) => {
            // Special handling for the very first message which is the Dream Text
            if (index === 0 && msg.type === 'user') {
                return {
                    role: 'user',
                    parts: [{ text: initialUserMessage }]
                };
            }
            return {
                role: msg.type === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            };
        });

        const aiText = await fetchGeminiResponse(apiHistory, systemInstruction);

        const aiReply = {
            id: Date.now() + 1,
            type: 'ai',
            text: aiText,
            time: getCurrentTime()
        };

        const updatedMessages = [...messages, newMsg, aiReply];
        setMessages(updatedMessages);

        setLoading(false);
        setLoadingStatus("");

        // Save updated conversation
        await saveConversation(updatedMessages);
    };

    // Share Logic
    const [isShareModalVisible, setShareModalVisible] = useState(false);
    const viewShotRef = useRef();

    const handleSharePreview = () => {
        setShareModalVisible(true);
    };

    const shareImage = async () => {
        try {
            const uri = await viewShotRef.current.capture();
            await Sharing.shareAsync(uri);
        } catch (error) {
            alert(t('error') + ': ' + error.message);
        }
    };

    // ChatBubble component (extracted from original ScrollView rendering logic)
    const ChatBubble = ({ message, isUser }) => {
        // Determine user avatar URL with fallbacks
        const userAvatarUrl = isUser ? (profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture) : null;
        const [imageError, setImageError] = useState(false);

        return (
            <View key={message.id} style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAi
            ]}>
                {/* AI Avatar (Left) */}
                {!isUser && (
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={['#7f13ec', '#251b2e']}
                            style={styles.avatarGradient}
                        >
                            <Image
                                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCidDKCngN2ln00JQKpdjCFy1gEkUqKKuznUkx-yzpMVL8AkLeoF6S0nhX_s_j5IPIJwmceqOWpUS4e-6N9bpnIZL20KXdNESS-abEKj3nkmh7sZrd1LxxCKy8y9o161HaDPccFsqhT_ZHl5q2Kyy4DcltjGuiTIzXb5EoP_dDYlQWWcVukO9X_WTSjveaXuTaiyZo0Rd1Gabf6qCbKirkNfg69LXk6qVaGRsOozYiMbk9GyTrOltL0-EqnxtpNK3teQRGk1tNQaWR' }}
                                style={styles.avatarImage}
                            />
                        </LinearGradient>
                    </View>
                )}

                {/* Bubble */}
                <View style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleAi,
                    message.highlighted && styles.bubbleHighlighted
                ]}>
                    {isUser && (
                        <LinearGradient
                            colors={['#A855F7', '#7f13ec']}
                            style={StyleSheet.absoluteFillObject}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                    )}

                    {message.isHeader && <Text style={styles.senderName}>{t('interpreter')}</Text>}
                    <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
                        {message.highlighted ? (
                            <Text>
                                {message.text}
                            </Text>
                        ) : message.text}
                    </Text>
                    {isUser && (
                        <View style={styles.readReceipt}>
                            <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.6)" />
                        </View>
                    )}
                </View>

                {isUser && (
                    <View style={styles.userAvatarPlaceholder}>
                        <View style={styles.userAvatarInner} />
                    </View>
                )}
                {/* User Avatar (Right) */}
                {isUser && (
                    <View style={styles.userAvatarContainer}>
                        <ProfileAvatar size={34} showBadge={false} />
                    </View>
                )}
            </View>
        );
    };


    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{t('dream_interpreter_title')}</Text>
                    <View style={styles.statusContainer}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>{t('status_online')}</Text>
                    </View>
                </View>

                <View style={styles.headerRightActions}>
                    <TouchableOpacity style={styles.shareButton} onPress={handleSharePreview}>
                        <Ionicons name="share-social-outline" size={22} color="white" />
                    </TouchableOpacity>
                    <View style={styles.creditBadge}>
                        <Text style={styles.creditText}>{credits}</Text>
                        <Text style={{ fontSize: 14 }}>🔮</Text>
                    </View>
                </View>
            </View>

            {/* Share Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isShareModalVisible}
                onRequestClose={() => setShareModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('dream_card')}</Text>
                            <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Capture Area */}
                        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={styles.shareCardContainer}>
                            <LinearGradient
                                colors={['#4c1d95', '#191022']}
                                style={styles.shareCard}
                            >
                                <View style={styles.shareHeader}>
                                    <Ionicons name="moon" size={24} color="#FCD34D" />
                                    <Text style={styles.shareBrand}>{t('dream_journal')}</Text>
                                </View>

                                <View style={styles.shareBody}>
                                    <Text style={styles.shareDreamTitle}>{t('my_dream') || 'BENİM RÜYAM'}</Text>
                                    <Text style={styles.shareDreamText} numberOfLines={4}>
                                        "{dreamText ? dreamText : t('share_dream_placeholder')}"
                                    </Text>

                                    <View style={styles.shareDivider} />

                                    <View style={styles.shareInterpreterRow}>
                                        <Image
                                            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCidDKCngN2ln00JQKpdjCFy1gEkUqKKuznUkx-yzpMVL8AkLeoF6S0nhX_s_j5IPIJwmceqOWpUS4e-6N9bpnIZL20KXdNESS-abEKj3nkmh7sZrd1LxxCKy8y9o161HaDPccFsqhT_ZHl5q2Kyy4DcltjGuiTIzXb5EoP_dDYlQWWcVukO9X_WTSjveaXuTaiyZo0Rd1Gabf6qCbKirkNfg69LXk6qVaGRsOozYiMbk9GyTrOltL0-EqnxtpNK3teQRGk1tNQaWR' }}
                                            style={styles.shareAvatar}
                                        />
                                        <View>
                                            <Text style={styles.shareInterpreterName}>{interpreter}</Text>
                                            <Text style={styles.shareInterpreterRole}>{t('interpreter')}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.shareFooter}>
                                    <Text style={styles.shareCta}>{t('share_cta')}</Text>
                                </View>
                            </LinearGradient>
                        </ViewShot>

                        <Text style={styles.modalSubtitle}>{t('share_subtitle')}</Text>

                        <TouchableOpacity style={styles.shareActionBtn} onPress={shareImage}>
                            <Ionicons name="share-outline" size={20} color="white" />
                            <Text style={styles.shareActionText}>{t('share_on_story')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Messages Area */}
            <ScrollView
                ref={scrollViewRef}
                style={[styles.messagesContainer, { backgroundColor: '#191022' }]}
                contentContainerStyle={[styles.messagesContent, { flexGrow: 1 }]}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.dateBadge}>
                            <Text style={styles.dateBadgeText}>{t('today')}</Text>
                        </View>

                        {messages.map((msg, index) => (
                            <ChatBubble
                                key={msg.id || index}
                                message={msg}
                                isUser={msg.type === 'user'}
                            />
                        ))}

                        {loading && (
                            <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center' }}>
                                <ActivityIndicator size="small" color="#A855F7" />
                                <Text style={{
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: 13,
                                    marginTop: 10,
                                    textAlign: 'center',
                                    fontFamily: 'SplineSans_400Regular' // Fixed font family name if needed, assuming Inter_400Regular was placeholder
                                }}>
                                    {loadingStatus || t('analyzing_dream') || "Rüyanız inceleniyor..."}
                                </Text>
                            </View>
                        )}

                        {/* Removed System Message Badge as per user request */}
                    </View>
                </TouchableWithoutFeedback>
            </ScrollView>

            {/* Footer Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                style={{ backgroundColor: '#191022' }}
            >
                {
                    isLocked ? (
                        // LOCKED FOOTER
                        <View style={styles.lockedFooter} >
                            <View style={styles.lockInfo}>
                                <Feather name="lock" size={14} color="#9CA3AF" />
                                <Text style={styles.lockText}>{t('credit_needed_for_interpretation')}</Text>
                            </View>
                            <TouchableOpacity style={styles.unlockButton} activeOpacity={0.9} onPress={handleUnlock}>
                                <LinearGradient
                                    colors={['#A855F7', '#7E22CE']}
                                    style={styles.unlockGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                                <Text style={styles.unlockButtonText}>{t('unlock_and_interpret')}</Text>
                                <View style={styles.priceTag}>
                                    <Text style={styles.priceText}>1</Text>
                                    <Text style={{ fontSize: 12 }}>🔮</Text>
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.termsText}>{t('terms_credit')}</Text>
                        </View>
                    ) : !isChatUnlocked ? (
                        // START CHAT BARRIER FOOTER
                        <View style={styles.lockedFooter}>
                            <View style={styles.lockInfo}>
                                <MaterialIcons name="chat-bubble-outline" size={14} color="#D8B4FE" />
                                <Text style={styles.lockText}>{t('chat_cost_info')}</Text>
                            </View>
                            <TouchableOpacity style={styles.unlockButton} activeOpacity={0.9} onPress={handleStartChat}>
                                <LinearGradient
                                    colors={['#7f13ec', '#650ecc']}
                                    style={styles.unlockGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                                <Text style={styles.unlockButtonText}>{t('start_chat_button')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // UNLOCKED INPUT FOOTER
                        <View style={styles.inputFooter}>
                            <TouchableOpacity style={styles.attachButton}>
                                <Ionicons name="add" size={24} color="white" />
                            </TouchableOpacity>
                            <View style={styles.inputFieldContainer}>
                                <TextInput
                                    style={styles.chatInput}
                                    placeholder={t('input_placeholder')}
                                    placeholderTextColor="#9CA3AF"
                                    value={inputText}
                                    onChangeText={setInputText}
                                />
                            </View>
                            <TouchableOpacity style={styles.sendButton} onPress={handeSend}>
                                <LinearGradient
                                    colors={['#A855F7', '#7E22CE']}
                                    style={styles.sendGradient}
                                />
                                <Ionicons name="arrow-up" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}
            </KeyboardAvoidingView >
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#191022',
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#191022',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backButton: {
        padding: 4,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22C55E', // Green
        marginRight: 4,
    },
    statusText: {
        color: '#9CA3AF',
        fontSize: 12,
        fontFamily: 'SplineSans_400Regular',
    },
    creditBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    creditText: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'SplineSans_600SemiBold',
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    messagesContent: {
        paddingBottom: 20,
    },
    dateBadge: {
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginVertical: 16,
    },
    dateBadgeText: {
        color: '#9CA3AF',
        fontSize: 12,
        fontFamily: 'SplineSans_500Medium',
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '85%',
    },
    messageRowUser: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
    },
    messageRowAi: {
        alignSelf: 'flex-start',
    },
    userAvatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginLeft: 8,
        alignSelf: 'flex-end',
        marginBottom: 4,
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        alignSelf: 'flex-start', // Top align
        marginTop: 0,
    },
    avatarGradient: {
        flex: 1,
        borderRadius: 16,
        padding: 1,
    },
    avatarImage: {
        flex: 1,
        borderRadius: 16,
        backgroundColor: 'black'
    },
    bubble: {
        padding: 16,
        borderRadius: 20,
        minWidth: 100,
    },
    bubbleAi: {
        backgroundColor: '#2D2438', // Surface lighter
        borderTopLeftRadius: 4,
    },
    bubbleUser: {
        backgroundColor: '#7f13ec', // Primary (covered by gradient)
        borderTopRightRadius: 4,
        overflow: 'hidden', // for gradient
    },
    senderName: {
        color: '#9CA3AF',
        fontSize: 11,
        marginBottom: 4,
    },
    messageText: {
        color: 'white', // Gray-300
        fontSize: 15,
        fontFamily: 'SplineSans_400Regular',
        lineHeight: 22,
    },
    messageTextUser: {
        color: 'white',
    },
    userAvatarPlaceholder: {
        width: 0,
    },
    readReceipt: {
        position: 'absolute',
        bottom: 8,
        right: 12,
    },
    systemMessage: {
        alignItems: 'center',
        marginVertical: 10,
    },
    systemMessageBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(127, 19, 236, 0.3)',
        gap: 8,
    },
    systemMessageText: {
        color: '#A855F7',
        fontSize: 12,
        fontFamily: 'SplineSans_600SemiBold',
    },
    lockedFooter: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        backgroundColor: '#191022',
    },
    lockInfo: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    lockText: {
        color: '#9CA3AF',
        fontSize: 13,
        fontFamily: 'SplineSans_500Medium',
    },
    unlockButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        position: 'relative',
        overflow: 'hidden',
    },
    unlockGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    unlockButtonText: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
        marginRight: 12,
    },
    priceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 2,
    },
    priceText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    termsText: {
        marginTop: 12,
        textAlign: 'center',
        color: '#6B7280',
        fontSize: 11,
        paddingHorizontal: 20,
    },
    inputFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 12,
        backgroundColor: '#2D2438',
        gap: 12,
    },
    attachButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputFieldContainer: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        justifyContent: 'center',
    },
    chatInput: {
        color: 'white',
        fontSize: 15,
        fontFamily: 'SplineSans_400Regular',
        padding: 0,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    sendGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    shareButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#251b2e',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    modalHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_700Bold',
    },
    modalSubtitle: {
        color: '#ad92c9',
        marginTop: 20,
        marginBottom: 20,
        textAlign: 'center',
        fontFamily: 'SplineSans_400Regular',
    },
    shareCardContainer: {
        width: width * 0.8,
        height: width * 0.8 * 1.4, // Dikey kart formatı (Instagram Story uyumlu gibi)
        borderRadius: 16,
        overflow: 'hidden',
    },
    shareCard: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    shareHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    shareBrand: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'SplineSans_700Bold',
        letterSpacing: 1,
    },
    shareBody: {
        alignItems: 'center',
    },
    shareDreamTitle: {
        color: '#ad92c9',
        fontSize: 12,
        fontFamily: 'SplineSans_700Bold',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    shareDreamText: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'SplineSans_500Medium',
        textAlign: 'center',
        lineHeight: 26,
        fontStyle: 'italic',
    },
    shareDivider: {
        width: 40,
        height: 2,
        backgroundColor: '#7f13ec',
        marginVertical: 20,
    },
    shareInterpreterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 50,
        paddingRight: 20,
    },
    shareAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    shareInterpreterName: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'SplineSans_700Bold',
    },
    shareInterpreterRole: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontFamily: 'SplineSans_500Medium',
    },
    shareFooter: {
        alignItems: 'center',
    },
    shareCta: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontFamily: 'SplineSans_600SemiBold',
    },
    shareActionBtn: {
        backgroundColor: '#7f13ec',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        justifyContent: 'center',
    },
    shareActionText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SplineSans_700Bold',
    },
});

export default ChatScreen;
