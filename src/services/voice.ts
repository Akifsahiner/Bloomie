// Bloomie - Voice Service (Speech Recognition & Commands)

import { Audio } from 'expo-av';
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { supabase } from './supabase';
import type { Nurture } from '../types';

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface ParsedVoiceCommand {
  intent: 'log' | 'reminder' | 'question' | 'photo' | 'unknown';
  nurtureName?: string;
  nurtureId?: string;
  action?: string;
  time?: string;
  reminderHours?: number;
  question?: string;
}

// Time phrases to hours mapping (supports both English and Turkish)
const TIME_PHRASES: Record<string, number> = {
  // English - Hours
  'half hour': 0.5,
  'half an hour': 0.5,
  'one hour': 1,
  '1 hour': 1,
  '2 hours': 2,
  'two hours': 2,
  '3 hours': 3,
  'three hours': 3,
  '4 hours': 4,
  'four hours': 4,
  '5 hours': 5,
  'five hours': 5,
  '6 hours': 6,
  'six hours': 6,
  '8 hours': 8,
  'eight hours': 8,
  '12 hours': 12,
  'twelve hours': 12,
  // English - Days
  'tomorrow': 24,
  'next day': 24,
  '2 days': 48,
  'two days': 48,
  '3 days': 72,
  'three days': 72,
  'a week': 168,
  'one week': 168,
  '1 week': 168,
  // Turkish fallback
  'yarım saat': 0.5,
  'bir saat': 1,
  'yarın': 24,
};

let recording: Audio.Recording | null = null;

/**
 * Request microphone permission
 */
async function requestPermission(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Microphone permission is required for voice commands.');
    return false;
  }
  return true;
}

/**
 * Start recording audio
 */
async function startRecording(): Promise<boolean> {
  try {
    const hasPermission = await requestPermission();
    if (!hasPermission) return false;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    recording = newRecording;
    return true;
  } catch (error) {
    console.error('Start recording error:', error);
    return false;
  }
}

/**
 * Stop recording and return URI
 */
async function stopRecording(): Promise<string | null> {
  try {
    if (!recording) return null;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;
    return uri;
  } catch (error) {
    console.error('Stop recording error:', error);
    return null;
  }
}

/**
 * Cancel recording
 */
async function cancelRecording(): Promise<void> {
  try {
    if (recording) {
      await recording.stopAndUnloadAsync();
      recording = null;
    }
  } catch (error) {
    console.error('Cancel recording error:', error);
  }
}

/**
 * Send audio to OpenAI Whisper for transcription (via Supabase Edge Function)
 */
async function transcribeAudio(uri: string): Promise<string> {
  try {
    // Read audio file as base64 using legacy API
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Get file extension
    const extension = uri.split('.').pop() || 'm4a';
    const format = extension === 'm4a' ? 'm4a' : extension === 'mp3' ? 'mp3' : 'wav';

    // Call Whisper Edge Function
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: {
        audioBase64: base64,
        audioFormat: format,
      },
    });

    if (error) throw error;

    if (data.success && data.transcript) {
      return data.transcript;
    }

    throw new Error('No transcript returned');
  } catch (error) {
    console.error('Transcribe audio error:', error);
    throw error;
  }
}

/**
 * Parse voice command locally
 */
export function parseVoiceCommandLocally(
  transcript: string,
  nurtures: Nurture[]
): ParsedVoiceCommand {
  const lowerText = transcript.toLowerCase().trim();
  
  // Find mentioned nurture
  let matchedNurture: Nurture | undefined;
  for (const nurture of nurtures) {
    if (lowerText.includes(nurture.name.toLowerCase())) {
      matchedNurture = nurture;
      break;
    }
  }

  // Detect intent
  let intent: ParsedVoiceCommand['intent'] = 'log';
  
  const hasReminderKeyword = 
    lowerText.includes('remind') || 
    lowerText.includes('later') ||
    lowerText.includes('notify') ||
    lowerText.includes('alert') ||
    lowerText.includes('in ') ||
    // Turkish fallback
    lowerText.includes('hatırlat');
  
  const hasQuestionKeyword = 
    lowerText.includes('?') ||
    lowerText.includes('how') ||
    lowerText.includes('why') ||
    lowerText.includes('when') ||
    lowerText.includes('what') ||
    lowerText.includes('should');

  const hasPhotoKeyword =
    lowerText.includes('photo') ||
    lowerText.includes('picture') ||
    lowerText.includes('image') ||
    lowerText.includes('analyze') ||
    lowerText.includes('look at') ||
    lowerText.includes('camera');

  if (hasReminderKeyword) {
    intent = 'reminder';
  } else if (hasQuestionKeyword) {
    intent = 'question';
  } else if (hasPhotoKeyword) {
    intent = 'photo';
  }

  // Extract time for reminders
  let reminderHours: number | undefined;
  if (intent === 'reminder') {
    for (const [phrase, hours] of Object.entries(TIME_PHRASES)) {
      if (lowerText.includes(phrase)) {
        reminderHours = hours;
        break;
      }
    }
    if (!reminderHours) reminderHours = 1;
  }

  let action = transcript;
  if (matchedNurture) {
    action = action.replace(new RegExp(matchedNurture.name, 'gi'), '').trim();
  }
  for (const phrase of Object.keys(TIME_PHRASES)) {
    action = action.replace(new RegExp(phrase, 'gi'), '').trim();
  }
  action = action
    .replace(/remind me/gi, '')
    .replace(/remind/gi, '')
    .replace(/please/gi, '')
    .replace(/later/gi, '')
    .replace(/to/gi, '')
    .replace(/about/gi, '')
    .trim();

  action = action.replace(/\s+/g, ' ').trim();
  if (action.endsWith(',')) action = action.slice(0, -1).trim();

  return {
    intent,
    nurtureName: matchedNurture?.name,
    nurtureId: matchedNurture?.id,
    action: action || transcript,
    reminderHours,
    question: intent === 'question' ? transcript : undefined,
  };
}

/**
 * Parse voice command using AI
 */
export async function parseVoiceCommandWithAI(
  transcript: string,
  nurtures: Nurture[]
): Promise<ParsedVoiceCommand> {
  try {
    const { data, error } = await supabase.functions.invoke('parse-voice-command', {
      body: {
        text: transcript,
        nurtures: nurtures.map(n => ({ id: n.id, name: n.name, type: n.type })),
      },
    });

    if (error) throw error;

    return data.data as ParsedVoiceCommand;
  } catch (error) {
    console.error('AI voice command parse error:', error);
    return parseVoiceCommandLocally(transcript, nurtures);
  }
}

/**
 * Generate response
 */
export function generateVoiceResponse(
  command: ParsedVoiceCommand,
  success: boolean
): string {
  if (!success) {
    return 'Something went wrong, can you try again?';
  }

  const nurturePart = command.nurtureName ? ` for ${command.nurtureName}` : '';

  switch (command.intent) {
    case 'log':
      return `Got it! Logged "${command.action}"${nurturePart}. 📝`;
    case 'reminder':
      const timeText = command.reminderHours 
        ? command.reminderHours < 1 
          ? `${Math.round(command.reminderHours * 60)} minutes` 
          : command.reminderHours < 24 
            ? `${command.reminderHours} hours`
            : `${Math.round(command.reminderHours / 24)} days`
        : 'soon';
      return `Got it! I'll remind you${nurturePart} in ${timeText}. ⏰`;
    case 'question':
      return 'Looking into your question...';
    case 'photo':
      return 'Opening camera for photo analysis! 📷';
    default:
      return `Saved${nurturePart}! 💚`;
  }
}

/**
 * Clean text for TTS (remove emojis and special characters)
 */
function cleanTextForTTS(text: string): string {
  return text
    // Remove all emojis
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]/gu, '')
    // Remove common emoji characters
    .replace(/[📝⏰📷💚⚠️✅❌🌱👶🐾🎉💧🍂☀️💨🌿🪴🐛🍖🏥🏃✨🎓😰😴🍼📈🧷😢👨‍👩‍👧💡🔮🎙️🚨🔧📱🖼️📦🌐📊🔒⚡🧪📅📞🆚🎯]/g, '')
    // Remove bullet points and special characters
    .replace(/[•→←↑↓]/g, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split text into speakable sentences for streaming-like experience
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // If no sentences found, return the whole text
  if (sentences.length === 0 && text.trim()) {
    return [text.trim()];
  }
  
  // Combine very short sentences with the next one for natural flow
  const combined: string[] = [];
  let buffer = '';
  
  for (const sentence of sentences) {
    if (buffer) {
      buffer += ' ' + sentence;
      if (buffer.length > 30) {
        combined.push(buffer);
        buffer = '';
      }
    } else if (sentence.length < 20 && combined.length < sentences.length - 1) {
      buffer = sentence;
    } else {
      combined.push(sentence);
    }
  }
  
  if (buffer) {
    if (combined.length > 0) {
      combined[combined.length - 1] += ' ' + buffer;
    } else {
      combined.push(buffer);
    }
  }
  
  return combined;
}

/**
 * Speak text using Text-to-Speech
 */
export async function speakText(
  text: string,
  options?: {
    language?: string;
    pitch?: number;
    rate?: number;
    volume?: number;
    onDone?: () => void;
    onError?: (error: any) => void;
    onSentenceStart?: (sentence: string, index: number) => void;
  }
): Promise<void> {
  try {
    const cleanText = cleanTextForTTS(text);

    if (!cleanText) {
      options?.onDone?.();
      return;
    }

    await Speech.speak(cleanText, {
      language: options?.language || 'en-US',
      pitch: options?.pitch || 1.0,
      rate: options?.rate || 0.95,
      volume: options?.volume || 1.0,
      onDone: options?.onDone,
      onError: options?.onError,
    });
  } catch (error) {
    console.error('Speak text error:', error);
    options?.onError?.(error);
  }
}

/**
 * Speak text sentence by sentence for streaming-like experience
 * This creates a more natural, conversational feel
 */
export async function speakStreaming(
  text: string,
  options?: {
    language?: string;
    pitch?: number;
    rate?: number;
    volume?: number;
    onSentenceStart?: (sentence: string, index: number, total: number) => void;
    onSentenceComplete?: (index: number, total: number) => void;
    onDone?: () => void;
    onError?: (error: any) => void;
  }
): Promise<void> {
  const cleanText = cleanTextForTTS(text);
  
  if (!cleanText) {
    options?.onDone?.();
    return;
  }

  const sentences = splitIntoSentences(cleanText);
  let currentIndex = 0;
  let isCancelled = false;

  const speakNextSentence = async () => {
    if (isCancelled || currentIndex >= sentences.length) {
      options?.onDone?.();
      return;
    }

    const sentence = sentences[currentIndex];
    options?.onSentenceStart?.(sentence, currentIndex, sentences.length);

    return new Promise<void>((resolve) => {
      Speech.speak(sentence, {
        language: options?.language || 'en-US',
        pitch: options?.pitch || 1.0,
        rate: options?.rate || 0.95,
        volume: options?.volume || 1.0,
        onDone: () => {
          options?.onSentenceComplete?.(currentIndex, sentences.length);
          currentIndex++;
          // Small pause between sentences for natural rhythm
          setTimeout(() => {
            speakNextSentence().then(resolve);
          }, 100);
        },
        onError: (error) => {
          console.error('Sentence speak error:', error);
          options?.onError?.(error);
          resolve();
        },
      });
    });
  };

  try {
    await speakNextSentence();
  } catch (error) {
    console.error('Streaming speak error:', error);
    options?.onError?.(error);
  }
}

/**
 * Stop speaking
 */
export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch (error) {
    console.error('Stop speaking error:', error);
  }
}

/**
 * Check if speech is currently speaking
 */
export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch (error) {
    return false;
  }
}

export const voiceService = {
  startRecording,
  stopRecording,
  cancelRecording,
  transcribeAudio,
  parseLocally: parseVoiceCommandLocally,
  parseWithAI: parseVoiceCommandWithAI,
  generateResponse: generateVoiceResponse,
  speak: speakText,
  speakStreaming,
  stopSpeaking,
  isSpeaking,
};

export default voiceService;
