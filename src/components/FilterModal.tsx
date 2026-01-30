// Bloomie - Filter Modal Component
// Filter logs by date range, nurture type, and activity type

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import type { NurtureType } from '../types';

interface FilterOptions {
  nurtureTypes: NurtureType[];
  dateRange: 'all' | 'today' | 'week' | 'month';
  nurtureIds: string[];
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  nurtures: Array<{ id: string; name: string; type: NurtureType }>;
  initialFilters?: FilterOptions;
}

export default function FilterModal({
  visible,
  onClose,
  onApply,
  nurtures,
  initialFilters,
}: FilterModalProps) {
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<FilterOptions>(
    initialFilters || {
      nurtureTypes: [],
      dateRange: 'all',
      nurtureIds: [],
    }
  );

  const toggleNurtureType = (type: NurtureType) => {
    setFilters(prev => ({
      ...prev,
      nurtureTypes: prev.nurtureTypes.includes(type)
        ? prev.nurtureTypes.filter(t => t !== type)
        : [...prev.nurtureTypes, type],
    }));
  };

  const toggleNurture = (id: string) => {
    setFilters(prev => ({
      ...prev,
      nurtureIds: prev.nurtureIds.includes(id)
        ? prev.nurtureIds.filter(i => i !== id)
        : [...prev.nurtureIds, id],
    }));
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      nurtureTypes: [],
      dateRange: 'all',
      nurtureIds: [],
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Filter</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={Colors.charcoal}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Date Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date Range</Text>
              <View style={styles.optionsRow}>
                {(['all', 'today', 'week', 'month'] as const).map(range => (
                  <TouchableOpacity
                    key={range}
                    style={[
                      styles.optionChip,
                      filters.dateRange === range && styles.optionChipSelected,
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, dateRange: range }))}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        filters.dateRange === range && styles.optionChipTextSelected,
                      ]}
                    >
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Nurture Types */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Type</Text>
              <View style={styles.optionsRow}>
                {(['baby', 'pet', 'plant'] as NurtureType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionChip,
                      filters.nurtureTypes.includes(type) && styles.optionChipSelected,
                    ]}
                    onPress={() => toggleNurtureType(type)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        filters.nurtureTypes.includes(type) && styles.optionChipTextSelected,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Specific Nurtures */}
            {nurtures.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Specific Nurtures</Text>
                <View style={styles.nurturesList}>
                  {nurtures.map(nurture => (
                    <TouchableOpacity
                      key={nurture.id}
                      style={[
                        styles.nurtureOption,
                        filters.nurtureIds.includes(nurture.id) && styles.nurtureOptionSelected,
                      ]}
                      onPress={() => toggleNurture(nurture.id)}
                    >
                      <MaterialCommunityIcons
                        name={filters.nurtureIds.includes(nurture.id) ? 'check-circle' : 'circle-outline'}
                        size={20}
                        color={filters.nurtureIds.includes(nurture.id) ? Colors.terracotta[500] : Colors.gray[400]}
                      />
                      <Text
                        style={[
                          styles.nurtureOptionText,
                          filters.nurtureIds.includes(nurture.id) && styles.nurtureOptionTextSelected,
                        ]}
                      >
                        {nurture.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    maxHeight: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.charcoal,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[100],
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  optionChipSelected: {
    backgroundColor: Colors.terracotta[500],
    borderColor: Colors.terracotta[500],
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  optionChipTextSelected: {
    color: Colors.white,
  },
  nurturesList: {
    gap: 8,
  },
  nurtureOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray[50],
  },
  nurtureOptionSelected: {
    backgroundColor: Colors.terracotta[50],
  },
  nurtureOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.charcoal,
  },
  nurtureOptionTextSelected: {
    color: Colors.terracotta[700],
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.xl,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.terracotta[500],
    alignItems: 'center',
    ...Shadows.sm,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});
