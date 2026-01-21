// Bloomie - Settings Screen

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { authService } from '../services/supabase';
import { APP_VERSION } from '../constants/config';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

const SettingItem = ({ icon, title, subtitle, onPress, rightElement, danger }: SettingItemProps) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={danger ? Colors.error : Colors.terracotta[500]}
      />
    </View>
    <View style={styles.settingContent}>
      <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      )}
    </View>
    {rightElement || (
      onPress && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={Colors.gray[400]}
        />
      )
    )}
  </TouchableOpacity>
);

const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const { user, isPremium, logout, setIsPremium } = useAppStore();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
            } catch (error) {
              // Continue with local logout even if API fails
            }
            logout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Contact Support', 'Please email support@bloomie.app to delete your account.');
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Data export is available for Premium users.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Go Premium', onPress: () => navigation.navigate('Premium' as never) },
        ]
      );
      return;
    }
    Alert.alert('Export Data', 'Your data export will be emailed to you shortly.');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={Colors.charcoal}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.backButton} />
        </View>

        {/* Profile Card */}
        {user ? (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <MaterialCommunityIcons
                  name="star"
                  size={12}
                  color={Colors.white}
                />
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.signInCard}
            onPress={() => navigation.navigate('Auth' as never)}
            activeOpacity={0.8}
          >
            <View style={styles.signInAvatar}>
              <MaterialCommunityIcons
                name="account-outline"
                size={28}
                color={Colors.terracotta[500]}
              />
            </View>
            <View style={styles.signInContent}>
              <Text style={styles.signInTitle}>Sign in to Bloomie</Text>
              <Text style={styles.signInSubtitle}>
                Sync your data across devices
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={Colors.terracotta[500]}
            />
          </TouchableOpacity>
        )}

        {/* Premium Section */}
        {!isPremium && (
          <TouchableOpacity
            style={styles.premiumBanner}
            onPress={() => navigation.navigate('Premium' as never)}
            activeOpacity={0.8}
          >
            <View style={styles.premiumBannerContent}>
              <MaterialCommunityIcons
                name="star-circle"
                size={32}
                color={Colors.terracotta[500]}
              />
              <View style={styles.premiumBannerText}>
                <Text style={styles.premiumBannerTitle}>Upgrade to Premium</Text>
                <Text style={styles.premiumBannerSubtitle}>
                  Unlock AI insights, unlimited nurtures & more
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={Colors.terracotta[500]}
            />
          </TouchableOpacity>
        )}

        {/* Notifications */}
        <SettingSection title="Notifications">
          <SettingItem
            icon="bell-outline"
            title="Push Notifications"
            subtitle="Reminders and updates"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ 
                  false: Colors.gray[200], 
                  true: Colors.terracotta[300] 
                }}
                thumbColor={notificationsEnabled ? Colors.terracotta[500] : Colors.gray[400]}
              />
            }
          />
          <SettingItem
            icon="email-outline"
            title="Email Digest"
            subtitle="Weekly summary of your nurtures"
            onPress={() => {}}
          />
        </SettingSection>

        {/* Data & Privacy */}
        <SettingSection title="Data & Privacy">
          <SettingItem
            icon="download-outline"
            title="Export My Data"
            subtitle={isPremium ? 'Download as PDF or CSV' : 'Premium feature'}
            onPress={handleExportData}
          />
          <SettingItem
            icon="shield-check-outline"
            title="Privacy Policy"
            onPress={() => Linking.openURL('https://bloomie.app/privacy')}
          />
          <SettingItem
            icon="file-document-outline"
            title="Terms of Service"
            onPress={() => Linking.openURL('https://bloomie.app/terms')}
          />
        </SettingSection>

        {/* Support */}
        <SettingSection title="Support">
          <SettingItem
            icon="help-circle-outline"
            title="Help Center"
            onPress={() => Linking.openURL('https://bloomie.app/help')}
          />
          <SettingItem
            icon="message-outline"
            title="Contact Support"
            subtitle="We're here to help"
            onPress={() => Linking.openURL('mailto:support@bloomie.app')}
          />
          <SettingItem
            icon="star-outline"
            title="Rate Bloomie"
            subtitle="Share your experience"
            onPress={() => {}}
          />
        </SettingSection>

        {/* Account - Only show if logged in */}
        {user && (
          <SettingSection title="Account">
            <SettingItem
              icon="logout"
              title="Sign Out"
              onPress={handleLogout}
            />
            <SettingItem
              icon="delete-outline"
              title="Delete Account"
              danger
              onPress={handleDeleteAccount}
            />
          </SettingSection>
        )}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Bloomie v{APP_VERSION}</Text>
          <Text style={styles.appInfoText}>Made with 💚 for nurturers everywhere</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 24,
    ...Shadows.soft,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.terracotta[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.terracotta[600],
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.terracotta[500],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  signInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.terracotta[200],
    ...Shadows.soft,
  },
  signInAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.terracotta[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  signInContent: {
    flex: 1,
  },
  signInTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 4,
  },
  signInSubtitle: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.terracotta[50],
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.terracotta[100],
  },
  premiumBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  premiumBannerText: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 4,
  },
  premiumBannerSubtitle: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.terracotta[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingIconDanger: {
    backgroundColor: `${Colors.error}15`,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.charcoal,
  },
  settingTitleDanger: {
    color: Colors.error,
  },
  settingSubtitle: {
    fontSize: 13,
    color: Colors.gray[400],
    marginTop: 2,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 24,
  },
  appInfoText: {
    fontSize: 12,
    color: Colors.gray[400],
    marginBottom: 4,
  },
});

