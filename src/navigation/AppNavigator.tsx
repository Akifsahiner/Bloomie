// Bloomie - Main Navigation (Updated Design)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppStore } from '../stores/useAppStore';
import { Colors, BorderRadius, Shadows } from '../constants/theme';
import type { RootStackParamList, MainTabParamList } from '../types';

// Screens
import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import InsightsScreen from '../screens/InsightsScreen';
import NurtureDetailScreen from '../screens/NurtureDetailScreen';
import AddNurtureScreen from '../screens/AddNurtureScreen';
import PremiumScreen from '../screens/PremiumScreen';
import SettingsScreen from '../screens/SettingsScreen';
import VoiceModeScreen from '../screens/VoiceModeScreen';
import ChatScreen from '../screens/ChatScreen';
import WeeklyReportScreen from '../screens/WeeklyReportScreen';
import PhotoAnalysisScreen from '../screens/PhotoAnalysisScreen';
import HealthTrackingScreen from '../screens/HealthTrackingScreen';
import PhotoGalleryScreen from '../screens/PhotoGalleryScreen';
import ExportScreen from '../screens/ExportScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import AlertHistoryScreen from '../screens/AlertHistoryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom Tab Bar Button
const TabIcon = ({ 
  name, 
  focused, 
  color 
}: { 
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  focused: boolean;
  color: string;
}) => (
  <View style={styles.tabIconContainer}>
    {focused && <View style={styles.tabGlow} />}
    <MaterialCommunityIcons
      name={name}
      size={28}
      color={color}
      style={focused ? styles.tabIconActive : undefined}
    />
    {focused && <View style={styles.tabDot} />}
  </View>
);

// Custom Tab Bar Component for proper centering
const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  // Icon name mapping
  const iconMap: Record<string, { active: keyof typeof MaterialCommunityIcons.glyphMap; inactive: keyof typeof MaterialCommunityIcons.glyphMap }> = {
    Home: { active: 'home', inactive: 'home-outline' },
    Calendar: { active: 'calendar', inactive: 'calendar-outline' },
    Insights: { active: 'chart-line', inactive: 'chart-line-variant' },
  };

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const color = isFocused ? Colors.primary : Colors.textSubtle;
        const iconNames = iconMap[route.name] || { active: 'circle', inactive: 'circle-outline' };
        const iconName = isFocused ? iconNames.active : iconNames.inactive;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabBarButton}
          >
            <TabIcon name={iconName} focused={isFocused} color={color} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Bottom Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSubtle,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'home' : 'home-outline'} 
              focused={focused}
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'calendar' : 'calendar-outline'} 
              focused={focused}
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'chart-line' : 'chart-line-variant'} 
              focused={focused}
              color={color} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { hasCompletedOnboarding, hasSeenWelcome, isLoading } = useAppStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {isLoading ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : !hasSeenWelcome ? (
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
        ) : !hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="NurtureDetail" 
              component={NurtureDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="AddNurture" 
              component={AddNurtureScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen 
              name="Premium" 
              component={PremiumScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="VoiceMode" 
              component={VoiceModeScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen 
              name="WeeklyReport" 
              component={WeeklyReportScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="PhotoAnalysis" 
              component={PhotoAnalysisScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen 
              name="HealthTracking" 
              component={HealthTrackingScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="AlertHistory" 
              component={AlertHistoryScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="PhotoGallery" 
              component={PhotoGalleryScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen 
              name="Export" 
              component={ExportScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="Statistics" 
              component={StatisticsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="Auth" 
              component={AuthScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    height: 72,
    backgroundColor: `${Colors.white}F2`,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: `${Colors.white}80`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    ...Shadows.nav,
    ...Platform.select({
      ios: {
        shadowColor: Colors.textDark,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 25,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tabBarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 48,
    height: 48,
    marginHorizontal: 'auto',
  },
  tabGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}33`,
    opacity: 0.5,
  },
  tabIconActive: {
    transform: [{ scale: 1.1 }],
  },
  tabDot: {
    position: 'absolute',
    bottom: -8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
});
