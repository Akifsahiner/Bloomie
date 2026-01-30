// Bloomie - Export Screen
// Export logs as CSV or PDF

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAppStore } from '../stores/useAppStore';
import { exportToCSV, exportToPDF, shareExport } from '../services/export';

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { recentLogs, nurtures } = useAppStore();
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month'>('all');
  const [selectedNurtures, setSelectedNurtures] = useState<string[]>([]);

  const handleExport = async () => {
    if (recentLogs.length === 0) {
      Alert.alert('No Data', 'There are no logs to export.');
      return;
    }

    setIsExporting(true);
    
    try {
      // Calculate date range
      let dateRangeObj: { start: Date; end: Date } | undefined;
      if (dateRange !== 'all') {
        const end = endOfDay(new Date());
        const start = startOfDay(
          dateRange === 'week' ? subDays(end, 7) : subDays(end, 30)
        );
        dateRangeObj = { start, end };
      }

      // Export
      const fileUri = exportFormat === 'csv'
        ? await exportToCSV({
            logs: recentLogs,
            nurtures,
            format: 'csv',
            dateRange: dateRangeObj,
            nurtureIds: selectedNurtures.length > 0 ? selectedNurtures : undefined,
          })
        : await exportToPDF({
            logs: recentLogs,
            nurtures,
            format: 'pdf',
            dateRange: dateRangeObj,
            nurtureIds: selectedNurtures.length > 0 ? selectedNurtures : undefined,
          });

      // Share
      await shareExport(fileUri);
      
      Alert.alert('Success', 'Export completed and ready to share!');
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', error.message || 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleNurture = (nurtureId: string) => {
    setSelectedNurtures(prev =>
      prev.includes(nurtureId)
        ? prev.filter(id => id !== nurtureId)
        : [...prev, nurtureId]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={Colors.charcoal}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Format Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Format</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[
                styles.formatOption,
                exportFormat === 'csv' && styles.formatOptionSelected,
              ]}
              onPress={() => setExportFormat('csv')}
            >
              <MaterialCommunityIcons
                name="file-excel"
                size={24}
                color={exportFormat === 'csv' ? Colors.white : Colors.gray[500]}
              />
              <Text
                style={[
                  styles.formatOptionText,
                  exportFormat === 'csv' && styles.formatOptionTextSelected,
                ]}
              >
                CSV
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.formatOption,
                exportFormat === 'pdf' && styles.formatOptionSelected,
              ]}
              onPress={() => setExportFormat('pdf')}
            >
              <MaterialCommunityIcons
                name="file-document"
                size={24}
                color={exportFormat === 'pdf' ? Colors.white : Colors.gray[500]}
              />
              <Text
                style={[
                  styles.formatOptionText,
                  exportFormat === 'pdf' && styles.formatOptionTextSelected,
                ]}
              >
                PDF
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <View style={styles.optionsRow}>
            {(['all', 'week', 'month'] as const).map(range => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.rangeChip,
                  dateRange === range && styles.rangeChipSelected,
                ]}
                onPress={() => setDateRange(range)}
              >
                <Text
                  style={[
                    styles.rangeChipText,
                    dateRange === range && styles.rangeChipTextSelected,
                  ]}
                >
                  {range === 'all' ? 'All Time' : range === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nurture Selection */}
        {nurtures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Nurtures {selectedNurtures.length > 0 && `(${selectedNurtures.length} selected)`}
            </Text>
            <View style={styles.nurturesList}>
              {nurtures.map(nurture => (
                <TouchableOpacity
                  key={nurture.id}
                  style={[
                    styles.nurtureOption,
                    selectedNurtures.includes(nurture.id) && styles.nurtureOptionSelected,
                  ]}
                  onPress={() => toggleNurture(nurture.id)}
                >
                  <MaterialCommunityIcons
                    name={selectedNurtures.includes(nurture.id) ? 'check-circle' : 'circle-outline'}
                    size={20}
                    color={selectedNurtures.includes(nurture.id) ? Colors.terracotta[500] : Colors.gray[400]}
                  />
                  <Text
                    style={[
                      styles.nurtureOptionText,
                      selectedNurtures.includes(nurture.id) && styles.nurtureOptionTextSelected,
                    ]}
                  >
                    {nurture.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="download"
                size={20}
                color={Colors.white}
              />
              <Text style={styles.exportButtonText}>
                Export as {exportFormat.toUpperCase()}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formatOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    ...Shadows.sm,
  },
  formatOptionSelected: {
    backgroundColor: Colors.terracotta[500],
    borderColor: Colors.terracotta[500],
  },
  formatOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[500],
    marginTop: 8,
  },
  formatOptionTextSelected: {
    color: Colors.white,
  },
  rangeChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  rangeChipSelected: {
    backgroundColor: Colors.terracotta[500],
    borderColor: Colors.terracotta[500],
  },
  rangeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  rangeChipTextSelected: {
    color: Colors.white,
  },
  nurturesList: {
    gap: 8,
  },
  nurtureOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  nurtureOptionSelected: {
    backgroundColor: Colors.terracotta[50],
    borderColor: Colors.terracotta[300],
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
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.terracotta[500],
    ...Shadows.md,
    marginTop: 8,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});
