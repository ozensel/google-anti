import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import tr from '../locales/tr.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import pt from '../locales/pt.json';
import ar from '../locales/ar.json';
import hi from '../locales/hi.json';

const i18n = new I18n({
    tr, en, es, pt, ar, hi
});

i18n.enableFallback = true;
i18n.defaultLocale = 'tr';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [credits, setCredits] = useState(3);
    const [isFirstDream, setIsFirstDream] = useState(true);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState('tr');

    const [isBiometricAuthenticated, setIsBiometricAuthenticated] = useState(false);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            console.log("UserContext: checkUser started");
            // Dil tercihini yükle
            const savedLanguage = await AsyncStorage.getItem('appLanguage');
            if (savedLanguage) {
                setLanguage(savedLanguage);
                i18n.locale = savedLanguage;
            } else {
                const deviceLanguage = getLocales()[0].languageCode;
                const supportedLanguages = ['tr', 'en', 'es', 'pt', 'ar', 'hi'];
                const initialLang = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';
                setLanguage(initialLang);
                i18n.locale = initialLang;
            }

            // Biyometrik tercihini yükle
            const savedBiometric = await AsyncStorage.getItem('isBiometricEnabled');
            const isBiometric = savedBiometric === 'true';
            console.log("UserContext: savedBiometric", savedBiometric, "isBiometric", isBiometric);
            setIsBiometricEnabled(isBiometric);

            // Eğer biyometrik açıksa, giriş yapılmadı (false) olarak başla.
            // Kapalıysa, zaten onaylı (true) say.
            console.log("UserContext: setting Initial authenticated =", !isBiometric);
            setIsBiometricAuthenticated(!isBiometric);

            // Supabase oturumunu kontrol et
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                setSession(session);
                setUser(session.user);
                await fetchProfile(session.user.id);
            }
        } catch (error) {
            console.error('Kullanıcı kontrol hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    const [isProfileComplete, setIsProfileComplete] = useState(false);
    const [completionPercentage, setCompletionPercentage] = useState(0);

    const [profile, setProfile] = useState(null);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Profil çekme hatası:', error);
                return;
            }

            if (data) {
                setProfile(data); // Expose full profile data
                setCredits(data.credits);
                setIsFirstDream(data.is_first_dream);

                // Profil tam mı kontrol et (İsim ve Doğum Tarihi varsa tamdır - Uygulama Erişimi İçin)
                const isComplete = data.full_name && data.birth_date;
                setIsProfileComplete(!!isComplete);

                // Detaylı Profil Doluluk Oranı (UI İçin)
                let score = 0;
                const total = 5;
                if (data.full_name) score++;
                if (data.birth_date) score++;
                if (data.gender) score++;
                if (data.marital_status) score++;
                if (data.job) score++;
                setCompletionPercentage(Math.round((score / total) * 100));
            } else {
                setIsProfileComplete(false);
                setCompletionPercentage(0);
            }
        } catch (error) {
            console.error('Profil işlemi hatası:', error);
            setIsProfileComplete(false);
            setCompletionPercentage(0);
        }
    };

    const updateProfile = async (updates) => {
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .upsert({ id: user.id, ...updates });

        if (error) throw error;

        // Başarılı güncelleme sonrası local state'i güncelle
        await fetchProfile(user.id);
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (data.session) {
            setSession(data.session);
            setUser(data.user);
            await fetchProfile(data.user.id);
        }
        return data;
    };

    const register = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        if (data.session) {
            setSession(data.session);
            setUser(data.user);
            // Trigger otomatik profil oluşturacak, biz sadece state güncelleyelim
            setCredits(3);
            setIsFirstDream(true);
            setIsProfileComplete(false); // Yeni kullanıcı için profil tamamlanmamış varsay
            setCompletionPercentage(0); // Yeni kullanıcı için doluluk oranı 0
        }
        return data;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        setSession(null);
        setUser(null);
        setCredits(0); // State'i temizle
        setIsFirstDream(true); // State'i temizle
        setIsProfileComplete(false); // State'i temizle
        setCompletionPercentage(0); // State'i temizle
    };

    const changeLanguage = async (langCode) => {
        setLanguage(langCode);
        i18n.locale = langCode;
        await AsyncStorage.setItem('appLanguage', langCode);
    };

    const t = (key, params) => i18n.t(key, params);

    const useCredit = async () => {
        if (!user) return { success: false, error: 'auth_error' };

        if (credits > 0) {
            const newCredits = credits - 1;

            // Optimistic update
            setCredits(newCredits);

            // Retry logic for unstable networks (3 attempts)
            let attempt = 0;
            let success = false;
            while (attempt < 3 && !success) {
                try {
                    const { error } = await supabase
                        .from('profiles')
                        .update({ credits: newCredits })
                        .eq('id', user.id);

                    if (error) throw error;
                    success = true;
                } catch (error) {
                    console.warn(`Credit deduction attempt ${attempt + 1} failed:`, error.message);
                    attempt++;
                    if (attempt < 3) await new Promise(res => setTimeout(res, 1000)); // Wait 1s
                }
            }

            if (!success) {
                console.error('Final credit deduction failure after 3 attempts.');
                // Rollback optimistic update
                setCredits(credits);
                return { success: false, error: 'network_error' };
            }

            if (isFirstDream) {
                setIsFirstDream(false);
                await supabase
                    .from('profiles')
                    .update({ is_first_dream: false })
                    .eq('id', user.id);
            }
            return { success: true, error: null };
        }
        return { success: false, error: 'insufficient_credits' };
    };

    const addCredits = async (amount) => {
        if (!user) return;

        const newCredits = credits + amount;
        setCredits(newCredits);

        await supabase
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', user.id);
    };

    const completeFirstDream = async () => {
        if (isFirstDream && user) {
            setIsFirstDream(false);
            await supabase
                .from('profiles')
                .update({ is_first_dream: false })
                .eq('id', user.id);
        }
    }

    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

    const toggleBiometric = async (value) => {
        setIsBiometricEnabled(value);
        await AsyncStorage.setItem('isBiometricEnabled', value.toString());
    };

    return (
        <UserContext.Provider value={{
            user,
            session,
            credits,
            isFirstDream,
            loading,
            login,
            register,
            logout,
            useCredit,
            addCredits,
            completeFirstDream,
            isBiometricEnabled,
            toggleBiometric,
            language,
            changeLanguage,
            t,
            updateProfile,
            isProfileComplete,
            profile,
            isBiometricAuthenticated,
            setIsBiometricAuthenticated,
            completionPercentage // Expose percentage
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
