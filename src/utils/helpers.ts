// Bloomie - Utility Helper Functions

import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';

/**
 * Format a date to a relative time string (English)
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMins < 1) {
    return 'Just now';
  }
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  
  if (diffHours < 24 && isToday(date)) {
    return `${diffHours}h ago`;
  }
  
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  
  // For older dates
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  
  return format(date, 'MMM d');
}

/**
 * Format a date for display in headers
 */
export function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return 'Today';
  }
  
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  
  return format(date, 'EEEE, MMMM d');
}

/**
 * Get greeting based on time of day (English)
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
}

/**
 * Get weather-appropriate icon name
 */
export function getTimeOfDayIcon(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 18) return 'white-balance-sunny';
  return 'moon-waning-crescent';
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parse mood emoji to mood type
 */
export function getMoodEmoji(mood?: string): string {
  switch (mood) {
    case 'happy': return '😊';
    case 'sad': return '😢';
    case 'tired': return '😴';
    case 'energetic': return '⚡';
    case 'neutral':
    default: return '😐';
  }
}

/**
 * Get nurture type icon
 */
export function getNurtureIcon(type: string): string {
  switch (type) {
    case 'baby': return 'baby-face';
    case 'pet': return 'paw';
    case 'plant': return 'flower';
    default: return 'heart';
  }
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Check if string is valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Get initials from name
 */
export function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

