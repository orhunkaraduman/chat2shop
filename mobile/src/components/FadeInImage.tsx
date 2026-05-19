import { useRef } from 'react';
import { Animated, Image, ImageProps } from 'react-native';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export function FadeInImage({ onLoad, style, ...props }: ImageProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  return (
    <AnimatedImage
      {...props}
      onLoad={(event) => {
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }).start();
        onLoad?.(event);
      }}
      style={[style, { opacity }]}
    />
  );
}
