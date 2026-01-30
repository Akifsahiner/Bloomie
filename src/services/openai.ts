// Bloomie - OpenAI Service (via Supabase Edge Functions)
// IMPORTANT: All OpenAI calls go through Supabase Edge Functions for security

import { supabase } from './supabase';
import type { AIParseResult, LogEntry, Nurture } from '../types';

// Parse user's natural language input via Edge Function
export async function parseUserInput(
  input: string,
  nurtures: Nurture[]
): Promise<AIParseResult> {
  try {
    const { data, error } = await supabase.functions.invoke('parse-journal', {
      body: {
        text: input,
        nurtures: nurtures.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
        })),
      },
    });

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error || 'Failed to parse input');
    }

    return data.data as AIParseResult;
  } catch (error) {
    console.error('Parse error:', error);
    // Return a basic parse if AI fails
    return {
      action: input.split(' ').slice(0, 3).join(' '),
      notes: input,
    };
  }
}

// Generate insights from log entries via Edge Function
export async function generateInsights(
  nurture: Nurture,
  logs: LogEntry[]
): Promise<{
  patterns: string[];
  suggestions: string[];
  concerns: string[];
  summary: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-insights', {
      body: {
        nurture: {
          name: nurture.name,
          type: nurture.type,
        },
        logs: logs.slice(0, 30).map(log => ({
          created_at: log.created_at,
          parsed_action: log.parsed_action,
          parsed_amount: log.parsed_amount,
          parsed_notes: log.parsed_notes,
          mood: log.mood,
        })),
      },
    });

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate insights');
    }

    return data.data;
  } catch (error) {
    console.error('Insights error:', error);
    return {
      patterns: [],
      suggestions: ['Keep logging to discover patterns! 🌱'],
      concerns: [],
      summary: 'Unable to generate insights at this time.',
    };
  }
}

// Smart reminder suggestions based on action
export function getSuggestedReminderTime(action: string, nurtureType: string): Date | null {
  const now = new Date();
  const actionLower = action.toLowerCase();

  // Baby reminders
  if (nurtureType === 'baby') {
    if (actionLower.includes('feed') || actionLower.includes('bottle') || actionLower.includes('breast') || actionLower.includes('nurse')) {
      return new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours
    }
    if (actionLower.includes('diaper') || actionLower.includes('change')) {
      return new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
    }
    if (actionLower.includes('nap') || actionLower.includes('sleep')) {
      return new Date(now.getTime() + 2.5 * 60 * 60 * 1000); // 2.5 hours
    }
    if (actionLower.includes('medicine') || actionLower.includes('vitamin')) {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day
    }
  }

  // Pet reminders
  if (nurtureType === 'pet') {
    if (actionLower.includes('walk')) {
      return new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours
    }
    if (actionLower.includes('feed') || actionLower.includes('food') || actionLower.includes('meal')) {
      return new Date(now.getTime() + 10 * 60 * 60 * 1000); // 10 hours
    }
    if (actionLower.includes('medicine') || actionLower.includes('pill') || actionLower.includes('meds')) {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day
    }
    if (actionLower.includes('parasite') || actionLower.includes('flea') || actionLower.includes('tick')) {
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }

  // Plant reminders
  if (nurtureType === 'plant') {
    if (actionLower.includes('water')) {
      return new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000); // 6 days
    }
    if (actionLower.includes('fertilize') || actionLower.includes('feed')) {
      return new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000); // 3 weeks
    }
    if (actionLower.includes('repot') || actionLower.includes('transplant')) {
      return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months
    }
    if (actionLower.includes('prune') || actionLower.includes('trim')) {
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }

  return null;
}

// Generate friendly notification text
export function generateNotificationText(
  nurtureName: string,
  nurtureType: string,
  action: string
): { title: string; body: string } {
  const actionLower = action.toLowerCase();
  const emoji = nurtureType === 'baby' ? '👶' : nurtureType === 'pet' ? '🐾' : '🌱';

  const templates: Record<string, { title: string; body: string }> = {
    water: {
      title: `${emoji} Time to water ${nurtureName}!`,
      body: `Your plant friend is getting thirsty 💧`,
    },
    feed: {
      title: `${emoji} Feeding time for ${nurtureName}!`,
      body: `It's been a while since the last meal`,
    },
    walk: {
      title: `${emoji} ${nurtureName} wants a walk!`,
      body: `Time for some outdoor adventure 🌳`,
    },
    medicine: {
      title: `${emoji} Medicine reminder for ${nurtureName}`,
      body: `Don't forget today's dose! 💊`,
    },
    diaper: {
      title: `${emoji} Diaper check time!`,
      body: `Time to check on ${nurtureName}`,
    },
    nap: {
      title: `${emoji} Nap time soon?`,
      body: `${nurtureName} might be getting sleepy 😴`,
    },
    default: {
      title: `${emoji} ${nurtureName} needs attention`,
      body: `Time to check in on your little one!`,
    },
  };

  for (const [key, value] of Object.entries(templates)) {
    if (actionLower.includes(key)) {
      return value;
    }
  }

  return templates.default;
}
