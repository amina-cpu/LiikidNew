// app/components/TabAwareView.tsx
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTabAnimation } from '../context/TabAnimationContext';

interface TabAwareViewProps extends ViewProps {
  children: React.ReactNode;
  /** Additional padding to add beyond the tab bar height */
  extraPadding?: number;
}

/**
 * A wrapper component that automatically adds bottom padding
 * to account for the tab bar height, preventing content from
 * being hidden behind the tab bar.
 */
export const TabAwareView: React.FC<TabAwareViewProps> = ({
  children,
  extraPadding = 0,
  style,
  ...props
}) => {
  const { TAB_BAR_HEIGHT } = useTabAnimation();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: TAB_BAR_HEIGHT + extraPadding },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});