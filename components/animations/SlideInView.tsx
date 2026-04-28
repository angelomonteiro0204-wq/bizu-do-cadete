import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type Direction = 'left' | 'right' | 'up' | 'down';

interface SlideInViewProps extends ViewProps {
  direction?: Direction;
  distance?: number;
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}

export function SlideInView({
  direction = 'left',
  distance = 50,
  duration = 500,
  delay = 0,
  children,
  style,
  ...props
}: SlideInViewProps) {
  const translateX = useSharedValue(direction === 'left' ? -distance : direction === 'right' ? distance : 0);
  const translateY = useSharedValue(direction === 'up' ? distance : direction === 'down' ? -distance : 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      translateX.value = withTiming(0, {
        duration,
        easing: Easing.out(Easing.ease),
      });
      translateY.value = withTiming(0, {
        duration,
        easing: Easing.out(Easing.ease),
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [translateX, translateY, duration, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}
