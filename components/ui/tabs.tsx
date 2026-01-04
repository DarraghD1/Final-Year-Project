import { Colors } from '@/constants/theme';
import React, { createContext, useCallback, useContext, useState } from 'react';
import {
    LayoutAnimation,
    Platform,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    UIManager,
    View,
    ViewProps,
    ViewStyle,
} from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Context for managing tab state
interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

interface TabsProps extends ViewProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

function Tabs({ style, defaultValue, value, onValueChange, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(value ?? defaultValue ?? '');

  const handleTabChange = useCallback((newValue: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(newValue);
    onValueChange?.(newValue);
  }, [onValueChange]);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <View style={[styles.tabs, style]}>{children}</View>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends ViewProps {
  style?: ViewStyle;
}

function TabsList({ style, children }: TabsListProps) {
  return (
    <View style={[styles.tabsList, style]}>
      {children}
    </View>
  );
}

interface TabsTriggerProps extends ViewProps {
  value: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

function TabsTrigger({ value, style, textStyle, disabled, children }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={() => setActiveTab(value)}
      style={[
        styles.tabsTrigger,
        isActive && styles.tabsTriggerActive,
        disabled && styles.tabsTriggerDisabled,
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.tabsTriggerText,
            isActive && styles.tabsTriggerTextActive,
            disabled && styles.tabsTriggerTextDisabled,
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

interface TabsContentProps extends ViewProps {
  value: string;
}

function TabsContent({ value, style, children }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const { activeTab } = context;
  if (activeTab !== value) return null;

  return (
    <View style={[styles.tabsContent, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'column',
    gap: 8,
  },
  tabsList: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 3,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabsTrigger: {
    flex: 1,
    height: '100%',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tabsTriggerActive: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.icon,
  },
  tabsTriggerDisabled: {
    opacity: 0.5,
  },
  tabsTriggerText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.icon,
  },
  tabsTriggerTextActive: {
    color: Colors.light.text,
  },
  tabsTriggerTextDisabled: {
    color: Colors.light.icon,
  },
  tabsContent: {
    flex: 1,
  },
});

export { Tabs, TabsContent, TabsList, TabsTrigger };

