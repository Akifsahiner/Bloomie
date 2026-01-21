// Bloomie - Chat Service (Function Calling Enabled)
// AI can now TAKE ACTIONS, not just respond with text

import { supabase } from './supabase';
import type { Nurture, LogEntry } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  nurtureId?: string;
  nurtureName?: string;
  // Function calling results
  functionCalled?: string;
  suggestedReminder?: {
    title: string;
    scheduledAt: string;
    nurtureId?: string;
    nurtureName?: string;
    description?: string;
  };
  shouldLog?: {
    nurtureId?: string;
    nurtureName?: string;
    action: string;
    notes?: string;
    timestamp?: string;
  };
}

export interface ChatResponse {
  response: string;
  text: string; // Alias for response for easier access
  functionCalled?: string | null;
  sources?: string[]; // Perplexity sources if available
  shouldLog?: {
    nurtureId?: string;
    nurtureName?: string;
    action: string;
    notes?: string;
    timestamp?: string;
  };
  suggestedReminder?: {
    title: string;
    scheduledAt: string;
    nurtureId?: string;
    nurtureName?: string;
    description?: string;
  };
  advice?: {
    topic: string;
    advice: string;
  };
  status?: {
    logs: any[];
  };
}

/**
 * Send a message to AI and get a response with potential actions
 * The AI can now:
 * - log_activity: Log a care activity
 * - create_reminder: Create a reminder
 * - get_care_advice: Provide care advice
 * - check_status: Check nurture status
 * - just_chat: Have a conversation
 */
export async function sendChatMessage(
  message: string,
  nurtures: Nurture[],
  recentLogs: LogEntry[],
  chatHistory: ChatMessage[],
  userName?: string
): Promise<ChatResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('chat-assistant', {
      body: {
        message,
        nurtures: nurtures.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          metadata: n.metadata,
        })),
        recentLogs: recentLogs.slice(0, 5).map(log => ({
          created_at: log.created_at,
          action: log.parsed_action || '',
          notes: log.parsed_notes || '',
        })),
        chatHistory: chatHistory.slice(-4).map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        mode: 'conversational',
        userName,
      },
    });

    if (error) {
      console.error('Supabase function error:', error);
      // Try to return error data if available
      if (error.data?.data?.response) {
        return error.data.data;
      }
      throw error;
    }

    if (!data.success) {
      console.error('Function returned error:', data.error);
      // If function returned error but has fallback response
      if (data.data?.response) {
        return data.data;
      }
      throw new Error(data.error || 'Failed to get response');
    }

    // Return the full response including function call results
    return {
      ...data.data,
      text: data.data.response, // Add text alias
    };
  } catch (error: any) {
    console.error('Chat error:', error);
    
    // Fallback response
    return {
      response: 'Sorry, I cannot respond right now. Please try again later! 😊',
      text: 'Sorry, I cannot respond right now. Please try again later! 😊',
      functionCalled: null,
    };
  }
}

/**
 * Get the action type from a function call result
 */
export function getActionType(response: ChatResponse): 'log' | 'reminder' | 'advice' | 'status' | 'chat' | 'search' | null {
  if (!response.functionCalled) return 'chat';
  
  switch (response.functionCalled) {
    case 'log_activity':
      return 'log';
    case 'create_reminder':
      return 'reminder';
    case 'get_care_advice':
      return 'advice';
    case 'check_status':
      return 'status';
    case 'web_search':
      return 'search';
    case 'just_chat':
    default:
      return 'chat';
  }
}

/**
 * Check if the response requires user confirmation
 */
export function requiresConfirmation(response: ChatResponse): boolean {
  // Log activities and reminders might need confirmation
  return response.functionCalled === 'log_activity' || response.functionCalled === 'create_reminder';
}
