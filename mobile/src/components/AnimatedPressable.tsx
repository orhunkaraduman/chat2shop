import { ReactNode, useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  disabled,
  onPressIn,
  onPressOut,
  scaleTo = 0.97,
  style,
  ...props
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function animate(nextValue: number) {
    Animated.spring(scale, {
      toValue: nextValue,
      speed: 32,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }

  return (
    <AnimatedPressableBase
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) animate(scaleTo);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1);
        onPressOut?.(event);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
