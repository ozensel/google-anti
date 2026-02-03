import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';

const ProfileAvatar = ({ size = 140, onPress, showBadge = true }) => {
    const { profile, completionPercentage } = useUser();

    // Ensure completionPercentage is a number
    const rate = completionPercentage || 0;

    // Scaling calculations
    const radius = size / 2;
    const strokeWidth = size * 0.045; // ~6px for 140
    const avatarSize = size - (strokeWidth * 4); // ~116px for 140
    const innerContainerSize = size - (strokeWidth * 2); // ~128px for 140

    const badgeSize = size * 0.28; // ~40px for 140
    const badgeIconSize = badgeSize * 0.95;

    // Colors
    const isComplete = rate === 100;
    const activeColor = '#3B82F6'; // Blue
    const inactiveColor = '#7f13ec'; // Purple
    const segmentColor = (threshold) => {
        if (rate === 100) return activeColor;
        return rate >= threshold ? inactiveColor : 'transparent';
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={onPress ? 0.8 : 1}
            disabled={!onPress}
            style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}
        >
            {/* 1. Base Track */}
            <View style={{
                width: size, height: size, borderRadius: radius,
                borderWidth: strokeWidth, borderColor: 'rgba(255,255,255,0.1)',
                position: 'absolute'
            }} />

            {/* 2. Progress Segments (Rotated 135deg to start at Bottom-Right) */}
            <View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: '135deg' }] }}>
                {/* Q1: 0-25% */}
                <View style={{
                    width: size, height: size, borderRadius: radius,
                    borderWidth: strokeWidth, borderColor: 'transparent',
                    borderTopColor: segmentColor(10),
                    position: 'absolute', transform: [{ rotate: '45deg' }]
                }} />
                {/* Q2: 25-50% */}
                <View style={{
                    width: size, height: size, borderRadius: radius,
                    borderWidth: strokeWidth, borderColor: 'transparent',
                    borderRightColor: segmentColor(35),
                    position: 'absolute', transform: [{ rotate: '45deg' }]
                }} />
                {/* Q3: 50-75% */}
                <View style={{
                    width: size, height: size, borderRadius: radius,
                    borderWidth: strokeWidth, borderColor: 'transparent',
                    borderBottomColor: segmentColor(60),
                    position: 'absolute', transform: [{ rotate: '45deg' }]
                }} />
                {/* Q4: 75-100% */}
                <View style={{
                    width: size, height: size, borderRadius: radius,
                    borderWidth: strokeWidth, borderColor: 'transparent',
                    borderLeftColor: segmentColor(85),
                    position: 'absolute', transform: [{ rotate: '45deg' }]
                }} />
            </View>

            {/* 3. Inner Space & Avatar */}
            <View style={{
                width: innerContainerSize, height: innerContainerSize,
                borderRadius: innerContainerSize / 2, backgroundColor: '#191022',
                justifyContent: 'center', alignItems: 'center',
                overflow: 'hidden'
            }}>
                <Image
                    source={
                        profile?.avatar_url === 'avatar_male' ? require('../../assets/avatars/avatar_male.png') :
                            profile?.avatar_url === 'avatar_female' ? require('../../assets/avatars/avatar_female.png') :
                                profile?.avatar_url === 'avatar_other' ? require('../../assets/avatars/avatar_other.png') :
                                    { uri: profile?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXuO__OObJsFp8qm6OoJWkKNiOwhZDsQ4T_prwU9gRzHAgiirx5aRticY9bENq4Jjksje2zER-bGkY9Zd36hRV1oCTxB6P5RJzvdbPPy94cYvHNXxnSVc079wpHa-YMK0X79OjV6GvS5rGgXNlkKNR2hMvwfZTMldCodUIico2FsJn6eqvXB1FWphP74GV--PrLO9AtfBB982VpKdsDFQeOJ8vfMXa9WU_M6nq_rCXbZm6f0dGMokTj4UfF97viP_5ecKtTryLUi8' }
                    }
                    style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
                />
            </View>

            {/* 4. Verified Badge (Bottom Right) */}
            {showBadge && (
                <View style={{ position: 'absolute', bottom: 0, right: 0, width: badgeSize, height: badgeSize, justifyContent: 'center', alignItems: 'center' }}>
                    {/* Background to hide progress bar lines behind badge if any */}
                    <View style={{
                        position: 'absolute', width: badgeSize, height: badgeSize,
                        borderRadius: badgeSize / 2, backgroundColor: '#191022', zIndex: -1
                    }} />

                    {/* Solid Star */}
                    <MaterialCommunityIcons
                        name="decagram"
                        size={badgeSize}
                        color={isComplete ? '#3B82F6' : '#374151'}
                    />

                    {/* Check Overlay */}
                    <View style={{ position: 'absolute' }}>
                        <MaterialCommunityIcons
                            name="check-bold"
                            size={badgeSize * 0.5}
                            color={isComplete ? 'white' : '#6B7280'}
                        />
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
};

export default ProfileAvatar;
