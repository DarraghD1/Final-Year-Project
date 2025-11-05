import { Colors } from '@/constants/theme';
import * as React from 'react';
import {
    Platform,
    ScrollView,
    ScrollViewProps,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

interface ScrollAreaProps extends ScrollViewProps {
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

const ScrollArea = React.forwardRef<ScrollView, ScrollAreaProps>(
  ({ style, contentContainerStyle, children, ...props }, ref) => {
    return (
      <ScrollView
        ref={ref}
        style={[styles.scrollArea, style]}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={true}
        indicatorStyle={Platform.select({ ios: 'black', android: undefined })}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

interface ScrollBarProps {
  orientation?: 'vertical' | 'horizontal';
  style?: ViewStyle;
}

// This is a custom scrollbar component that can be used instead of the native one
// if you need more control over the scrollbar appearance
function ScrollBar({ orientation = 'vertical', style }: ScrollBarProps) {
  return (
    <View
      style={[
        styles.scrollbar,
        orientation === 'vertical' ? styles.scrollbarVertical : styles.scrollbarHorizontal,
        style,
      ]}
    >
      <View style={styles.scrollbarThumb} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
    borderRadius: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollbar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    padding: 2,
  },
  scrollbarVertical: {
    top: 0,
    right: 0,
    bottom: 0,
    width: 10,
  },
  scrollbarHorizontal: {
    left: 0,
    right: 0,
    bottom: 0,
    height: 10,
  },
  scrollbarThumb: {
    backgroundColor: Colors.light.icon,
    borderRadius: 4,
    opacity: 0.3,
    flex: 1,
  },
});

export { ScrollArea, ScrollBar };
