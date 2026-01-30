// Bloomie - Export Service
// Export logs as PDF or CSV

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import type { LogEntry, Nurture } from '../types';

interface ExportOptions {
  logs: LogEntry[];
  nurtures: Nurture[];
  format: 'csv' | 'pdf';
  dateRange?: { start: Date; end: Date };
  nurtureIds?: string[];
}

/**
 * Export logs as CSV
 */
export async function exportToCSV(options: ExportOptions): Promise<string> {
  const { logs, nurtures, dateRange, nurtureIds } = options;
  
  // Filter logs
  let filteredLogs = [...logs];
  
  if (dateRange) {
    filteredLogs = filteredLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= dateRange.start && logDate <= dateRange.end;
    });
  }
  
  if (nurtureIds && nurtureIds.length > 0) {
    filteredLogs = filteredLogs.filter(log => nurtureIds.includes(log.nurture_id));
  }
  
  // Sort by date
  filteredLogs.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  // Build CSV
  const headers = ['Date', 'Time', 'Nurture', 'Type', 'Action', 'Notes', 'Photos'];
  const rows = filteredLogs.map(log => {
    const nurture = nurtures.find(n => n.id === log.nurture_id);
    const logDate = new Date(log.created_at);
    
    return [
      format(logDate, 'yyyy-MM-dd'),
      format(logDate, 'HH:mm'),
      nurture?.name || 'Unknown',
      nurture?.type || 'unknown',
      log.parsed_action || '',
      `"${(log.parsed_notes || log.raw_input || '').replace(/"/g, '""')}"`,
      log.photo_urls?.length || 0,
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  
  // Save to file
  const fileName = `bloomie-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  
  return fileUri;
}

/**
 * Export logs as PDF (simplified - using text format for now)
 * Note: For full PDF support, you'd need a library like react-native-pdf or expo-print
 */
export async function exportToPDF(options: ExportOptions): Promise<string> {
  const { logs, nurtures, dateRange, nurtureIds } = options;
  
  // Filter logs (same as CSV)
  let filteredLogs = [...logs];
  
  if (dateRange) {
    filteredLogs = filteredLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= dateRange.start && logDate <= dateRange.end;
    });
  }
  
  if (nurtureIds && nurtureIds.length > 0) {
    filteredLogs = filteredLogs.filter(log => nurtureIds.includes(log.nurture_id));
  }
  
  // Sort by date
  filteredLogs.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  // Build PDF-like text content
  const pdfContent = [
    'Bloomie Care Journal Export',
    `Generated: ${format(new Date(), 'MMMM d, yyyy')}`,
    '',
    '='.repeat(50),
    '',
    ...filteredLogs.map(log => {
      const nurture = nurtures.find(n => n.id === log.nurture_id);
      const logDate = new Date(log.created_at);
      
      return [
        `Date: ${format(logDate, 'MMMM d, yyyy • h:mm a')}`,
        `Nurture: ${nurture?.name || 'Unknown'} (${nurture?.type || 'unknown'})`,
        `Action: ${log.parsed_action || 'N/A'}`,
        `Notes: ${log.parsed_notes || log.raw_input || 'N/A'}`,
        log.photo_urls && log.photo_urls.length > 0 
          ? `Photos: ${log.photo_urls.length}` 
          : '',
        '',
        '-'.repeat(50),
        '',
      ].join('\n');
    }),
  ].join('\n');
  
  // Save as text file (PDF would require additional library)
  const fileName = `bloomie-export-${format(new Date(), 'yyyy-MM-dd')}.txt`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  
  await FileSystem.writeAsStringAsync(fileUri, pdfContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  
  return fileUri;
}

/**
 * Share exported file
 */
export async function shareExport(fileUri: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri);
  } else {
    throw new Error('Sharing is not available on this device');
  }
}
