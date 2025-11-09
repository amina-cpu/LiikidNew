// app/context/TabAnimationContext.tsx
import { createContext, useContext } from 'react';
import { Animated, Platform } from 'react-native';

// Calculate tab bar height based on platform
export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 80;

// Define the shape of the context data
interface TabAnimationContextType {
  /** The Animated.Value used to control the tab bar's translateY property. */
  bottomBarAnim: Animated.Value;
  /** The calculated total height of the tab bar (for offsetting). */
  TAB_BAR_HEIGHT: number;
}

// Create the Context with default values
const TabAnimationContext = createContext<TabAnimationContextType>({
  bottomBarAnim: new Animated.Value(0),
  TAB_BAR_HEIGHT,
});

/**
 * Custom hook to consume the Tab Animation Context.
 * Use this in screens (like HomeScreen) to get the Animated.Value.
 */
export const useTabAnimation = () => useContext(TabAnimationContext);

/**
 * Provider component to wrap the Tab Navigator.
 * This makes the Animated.Value available to all child screens.
 */
export const TabAnimationProvider = TabAnimationContext.Provider;