import * as React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

interface AspectRatioProps extends ViewProps {
  ratio?: number;
  children?: React.ReactNode;
}

function AspectRatio({ ratio = 1, style, children, ...props }: AspectRatioProps) {
  return (
    <View style={[styles.container, { aspectRatio: ratio }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
});

export { AspectRatio };
