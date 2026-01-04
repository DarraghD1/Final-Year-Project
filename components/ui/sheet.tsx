import { Colors } from '@/constants/theme';
import { XIcon } from 'lucide-react-native';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ViewProps,
    ViewStyle,
} from 'react-native';

interface SheetContextType {
  isOpen: boolean;
  onClose: () => void;
}

const SheetContext = createContext<SheetContextType | null>(null);

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

function Sheet({ open = false, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ isOpen: open, onClose: () => onOpenChange?.(false) }}>
      {children}
    </SheetContext.Provider>
  );
}

interface SheetTriggerProps {
  onPress?: () => void;
  children?: React.ReactNode;
}

function SheetTrigger({ onPress, children }: SheetTriggerProps) {
  const context = useContext(SheetContext);
  return (
    <TouchableOpacity onPress={() => onPress?.()}>
      {children}
    </TouchableOpacity>
  );
}

interface SheetContentProps extends ViewProps {
  side?: SheetSide;
  children?: React.ReactNode;
}

type SheetSide = 'top' | 'right' | 'bottom' | 'left';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  } as const,
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  } as const,
  content: {
    position: 'absolute',
    backgroundColor: Colors.light.background,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  } as const,
  contentRight: {
    top: 0,
    right: 0,
    bottom: 0,
    width: '75%',
    maxWidth: 360,
    borderLeftWidth: 1,
    borderColor: Colors.light.icon,
  } as const,
  contentLeft: {
    top: 0,
    left: 0,
    bottom: 0,
    width: '75%',
    maxWidth: 360,
    borderRightWidth: 1,
    borderColor: Colors.light.icon,
  } as const,
  contentTop: {
    top: 0,
    left: 0,
    right: 0,
    maxHeight: '75%',
    borderBottomWidth: 1,
    borderColor: Colors.light.icon,
  } as const,
  contentBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: Colors.light.icon,
  } as const,
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.7,
    padding: 4,
  } as const,
  header: {
    padding: 16,
    gap: 6,
  } as const,
  footer: {
    padding: 16,
    marginTop: 'auto',
    gap: 8,
  } as const,
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  } as const,
  description: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 12,
  } as const,
});

type SheetSideStyles = Record<`content${Capitalize<SheetSide>}`, ViewStyle>;
const sheetSideStyles: SheetSideStyles = {
  contentTop: styles.contentTop,
  contentRight: styles.contentRight,
  contentBottom: styles.contentBottom,
  contentLeft: styles.contentLeft,
} as const;

function SheetContent({ side = 'right', style, children }: SheetContentProps) {
  const context = useContext(SheetContext);
  if (!context) throw new Error('SheetContent must be used within Sheet');
  
  const { isOpen, onClose } = context;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const getSlideStyle = () => {
    const transform = [];
    switch (side) {
      case 'right':
        transform.push({ translateX: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [width, 0],
        })});
        break;
      case 'left':
        transform.push({ translateX: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-width, 0],
        })});
        break;
      case 'top':
        transform.push({ translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-height, 0],
        })});
        break;
      case 'bottom':
        transform.push({ translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [height, 0],
        })});
        break;
    }
    return { transform };
  };

  const sideKey = `content${side.charAt(0).toUpperCase()}${side.slice(1)}` as keyof SheetSideStyles;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.content,
            sheetSideStyles[sideKey],
            getSlideStyle(),
            style,
          ]}
        >
          {children}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <XIcon size={20} color={Colors.light.icon} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface SheetHeaderProps extends ViewProps {}

function SheetHeader({ style, children, ...props }: SheetHeaderProps) {
  return (
    <View style={[styles.header, style]} {...props}>
      {children}
    </View>
  );
}

interface SheetFooterProps extends ViewProps {}

function SheetFooter({ style, children, ...props }: SheetFooterProps) {
  return (
    <View style={[styles.footer, style]} {...props}>
      {children}
    </View>
  );
}

interface SheetTitleProps {
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

function SheetTitle({ style, children }: SheetTitleProps) {
  return (
    <Text style={[styles.title, style]}>
      {children}
    </Text>
  );
}

interface SheetDescriptionProps {
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

function SheetDescription({ style, children }: SheetDescriptionProps) {
  return (
    <Text style={[styles.description, style]}>
      {children}
    </Text>
  );
}

export {
    Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger
};
