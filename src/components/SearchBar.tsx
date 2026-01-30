// Bloomie - Search Bar Component
// Reusable search bar with filter options

import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onFilterPress?: () => void;
  showFilter?: boolean;
  autoFocus?: boolean;
}

export default function SearchBar({
  placeholder = 'Search...',
  value,
  onChangeText,
  onFilterPress,
  showFilter = false,
  autoFocus = false,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, isFocused && styles.searchContainerFocused]}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={isFocused ? Colors.terracotta[500] : Colors.gray[400]}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.gray[400]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus={autoFocus}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            style={styles.clearButton}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={Colors.gray[400]}
            />
          </TouchableOpacity>
        )}
      </View>
      {showFilter && onFilterPress && (
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={20}
            color={Colors.terracotta[500]}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    ...Shadows.sm,
  },
  searchContainerFocused: {
    borderColor: Colors.terracotta[300],
    borderWidth: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.charcoal,
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[200],
    ...Shadows.sm,
  },
});
