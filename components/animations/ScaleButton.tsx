import React from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface ScaleButtonProps extends PressableProps {
  scale?: number;
  duration?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ScaleButton({
  scale = 0.95,
  duration = 100,
  onPressIn,
  onPressOut,
  children,
  style,
  ...props
}: ScaleButtonProps) {
  const scaleValue = useSharedValue(1);

  const handlePressIn = (e: any) => {
    scaleValue.value = withTiming(scale, {
      duration,
      easing: Easing.out(Easing.ease),
    });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scaleValue.value = withTiming(1, {
      duration,
      easing: Easing.out(Easing.ease),
    });
    onPressOut?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
