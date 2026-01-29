import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://azsgrawkvgwkgecfrlci.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_h4bLRlkDiVdf_Sar7to7Zw_uMnxyZ6x';

const ExpoSecureStoreAdapter = {
  getItem: (key) => {
    try {
      return SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn('SecureStore.getItemAsync failed', error);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn('SecureStore.setItemAsync failed', error);
    }
  },
  removeItem: (key) => {
    try {
      return SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn('SecureStore.deleteItemAsync failed', error);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
