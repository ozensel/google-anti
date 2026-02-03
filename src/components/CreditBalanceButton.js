import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';

const CreditBalanceButton = ({ dark = false }) => {
    const { credits } = useUser();
    const navigation = useNavigation();

    return (
        <TouchableOpacity
            style={[styles.container, dark && styles.containerDark]}
            onPress={() => navigation.navigate('CreditStore')}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="diamond" size={14} color={dark ? "#A855F7" : "white"} />
            </View>
            <Text style={[styles.text, dark && styles.textDark]}>{credits}</Text>

            <View style={styles.plusContainer}>
                <Ionicons name="add" size={10} color="white" />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        paddingLeft: 8,
        paddingRight: 6,
        paddingVertical: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    containerDark: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconContainer: {
        marginRight: 4,
    },
    text: {
        color: '#D8B4FE',
        fontSize: 14,
        fontFamily: 'SplineSans_700Bold',
        marginRight: 6,
    },
    textDark: {
        color: 'white',
    },
    plusContainer: {
        backgroundColor: '#7C3AED',
        borderRadius: 8,
        width: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default CreditBalanceButton;
