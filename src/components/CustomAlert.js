import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, buttons = [], onClose }) => {
    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Backdrop with Blur effect for premium feel */}
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                </TouchableOpacity>

                <View style={styles.alertContainer}>
                    <LinearGradient
                        colors={['#2a1e36', '#1f1628']}
                        style={styles.alertContent}
                    >
                        {title ? <Text style={styles.title}>{title}</Text> : null}
                        {message ? <Text style={styles.message}>{message}</Text> : null}

                        <View style={styles.buttonContainer}>
                            {buttons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        btn.style === 'cancel' && styles.cancelButton,
                                        btn.style === 'destructive' && styles.destructiveButton,
                                        // Add left margin to all but the first button
                                        index > 0 && { marginLeft: 12 }
                                    ]}
                                    onPress={() => {
                                        if (btn.onPress) btn.onPress();
                                        // We expect the parent to handle closing via state, 
                                        // but if not provided, we might need a default close.
                                        // Usually parent sets visible=false in onPress.
                                    }}
                                >
                                    <Text style={[
                                        styles.buttonText,
                                        btn.style === 'cancel' && styles.cancelButtonText,
                                        btn.style === 'destructive' && styles.destructiveButtonText
                                    ]}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    alertContainer: {
        width: width * 0.85,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    alertContent: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontFamily: 'SplineSans_700Bold',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        fontFamily: 'SplineSans_400Regular',
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#7f13ec', // Default primary color
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'SplineSans_600SemiBold',
    },
    cancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    cancelButtonText: {
        color: '#9CA3AF',
    },
    destructiveButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.5)',
    },
    destructiveButtonText: {
        color: '#EF4444',
    },
});

export default CustomAlert;
