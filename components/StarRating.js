/**
 * StarRating Component
 * Interactive star rating selector with haptic feedback
 * Can be used for both input (rating selection) and display (readonly)
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

/**
 * @param {Object} props
 * @param {number} props.rating - Current rating value (0-5)
 * @param {number} [props.maxStars=5] - Maximum number of stars
 * @param {number} [props.size=32] - Size of each star icon
 * @param {string} [props.color='#FFD700'] - Color of filled stars
 * @param {string} [props.emptyColor='#D1D5DB'] - Color of empty stars
 * @param {Function} [props.onRatingChange] - Callback when rating changes
 * @param {boolean} [props.disabled=false] - Whether the component is readonly
 * @param {number} [props.spacing=4] - Space between stars
 * @param {boolean} [props.animated=true] - Whether to animate star selection
 */
export default function StarRating({
	rating = 0,
	maxStars = 5,
	size = 32,
	color = '#FFD700',
	emptyColor = '#D1D5DB',
	onRatingChange,
	disabled = false,
	spacing = 4,
	animated = true
}) {
	const [selectedRating, setSelectedRating] = useState(rating);
	
	// Animation refs for each star
	const scaleAnimations = useRef(
		Array.from({ length: maxStars }, () => new Animated.Value(1))
	).current;

	// Sync with external rating prop changes
	useEffect(() => {
		setSelectedRating(rating);
	}, [rating]);
	
	// Animate star with scale effect
	const animateStar = (index) => {
		if (!animated || disabled) return;
		
		Animated.sequence([
			Animated.timing(scaleAnimations[index], {
				toValue: 1.3,
				duration: 100,
				useNativeDriver: true,
			}),
			Animated.timing(scaleAnimations[index], {
				toValue: 1,
				duration: 100,
				useNativeDriver: true,
			}),
		]).start();
	};

	const handlePress = async (starIndex) => {
		if (disabled) return;

		const newRating = starIndex + 1;

		// Trigger haptic feedback
		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} catch (_e) {
			// Haptics may not be available on all devices
		}
		
		// Animate all stars up to and including the selected one
		for (let i = 0; i <= starIndex; i++) {
			// Stagger animation slightly for each star
			setTimeout(() => animateStar(i), i * 30);
		}

		setSelectedRating(newRating);

		if (onRatingChange) {
			onRatingChange(newRating);
		}
	};

	const renderStar = (index) => {
		// Use Math.floor to determine full stars (e.g., rating 3.8 means stars 0,1,2 are full)
		const fullStars = Math.floor(selectedRating);
		const isFilled = index < fullStars;
		// Half star shows when index equals the floor and there's a fractional part
		const hasPartialStar = selectedRating % 1 !== 0;
		const isHalfFilled = !isFilled && index === fullStars && hasPartialStar;

		// Determine icon name based on fill state
		let iconName = 'star-outline';
		if (isFilled) {
			iconName = 'star';
		} else if (isHalfFilled) {
			iconName = 'star-half';
		}

		const starColor = isFilled || isHalfFilled ? color : emptyColor;

		return (
			<TouchableOpacity
				key={index}
				onPress={() => handlePress(index)}
				disabled={disabled}
				activeOpacity={disabled ? 1 : 0.7}
				style={[styles.starContainer, { marginHorizontal: spacing / 2 }]}
				accessibilityLabel={`${index + 1} star${index !== 0 ? 's' : ''}`}
				accessibilityRole="button"
				accessibilityState={{ disabled }}
			>
				<Animated.View style={{ transform: [{ scale: scaleAnimations[index] }] }}>
					<Ionicons
						name={iconName}
						size={size}
						color={starColor}
					/>
				</Animated.View>
			</TouchableOpacity>
		);
	};

	return (
		<View style={styles.container} accessibilityLabel={`Rating: ${selectedRating} out of ${maxStars} stars`}>
			{Array.from({ length: maxStars }, (_, index) => renderStar(index))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	starContainer: {
		padding: 2,
	}
});
