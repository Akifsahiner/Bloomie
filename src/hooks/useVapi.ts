// Bloomie - Vapi Voice Assistant Hook
// Realtime, interruptible voice assistant via @vapi-ai/react-native
// NOTE: @vapi-ai/react-native package not available on npm yet - using fallback

import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

// Try to import Vapi, fallback to null if not available
let Vapi: any = null;
try {
  // @ts-ignore - Package may not be available
  Vapi = require('@vapi-ai/react-native').default;
} catch (error) {
  console.warn('@vapi-ai/react-native not available, using fallback');
  Vapi = null;
}

type VapiCallState = 'idle' | 'connecting' | 'in-call';

interface UseVapiOptions {
  assistantId: string;
}

interface UseVapiResult {
  state: VapiCallState;
  isUserSpeaking: boolean;
  isAssistantSpeaking: boolean;
  lastText: string;
  start: () => Promise<void>;
  stop: () => void;
}

// We keep a single Vapi instance for the whole app
let vapiInstance: Vapi | null = null;

function getVapiInstance(publicKey: string): Vapi | null {
  if (!Vapi) {
    return null; // Package not available
  }
  if (!vapiInstance) {
    vapiInstance = new Vapi(publicKey);
  }
  return vapiInstance;
}

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    // iOS will prompt automatically when Vapi starts audio
    return true;
  }

  const hasPermission = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );

  if (hasPermission) return true;

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );

  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    Alert.alert(
      'Microphone permission required',
      'Bloomie needs microphone access for real-time voice conversations.',
    );
    return false;
  }

  return true;
}

export function useVapi({ assistantId }: UseVapiOptions): UseVapiResult {
  const [state, setState] = useState<VapiCallState>('idle');
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [lastText, setLastText] = useState('');

  const vapiRef = useRef<Vapi | null>(null);

  // Read public key from Expo env (configure in .env as EXPO_PUBLIC_VAPI_PUBLIC_KEY)
  const publicKey = useMemo(
    () => process.env.EXPO_PUBLIC_VAPI_PUBLIC_KEY,
    [],
  );

  useEffect(() => {
    if (!publicKey) {
      console.warn(
        '[Vapi] Missing EXPO_PUBLIC_VAPI_PUBLIC_KEY. Voice assistant will be disabled.',
      );
      return;
    }

    const vapi = getVapiInstance(publicKey);
    if (!vapi) {
      console.warn('[Vapi] Package not available. Voice assistant will be disabled.');
      return;
    }
    
    vapiRef.current = vapi;

    const handleCallStart = () => {
      setState('in-call');
      setIsUserSpeaking(false);
      setIsAssistantSpeaking(false);
    };

    const handleCallEnd = () => {
      setState('idle');
      setIsUserSpeaking(false);
      setIsAssistantSpeaking(false);
      setLastText('');
    };

    const handleSpeechUpdate = (payload: any) => {
      const role = payload?.role as 'user' | 'assistant' | undefined;
      const text =
        payload?.text ||
        payload?.transcript ||
        payload?.content ||
        '';

      if (text) {
        setLastText(text);
      }

      if (role === 'user') {
        setIsUserSpeaking(true);
        setIsAssistantSpeaking(false);
      } else if (role === 'assistant') {
        setIsUserSpeaking(false);
        setIsAssistantSpeaking(true);
      } else {
        setIsUserSpeaking(false);
        setIsAssistantSpeaking(false);
      }
    };

    const handleError = (err: any) => {
      console.error('[Vapi] Error:', err);
      Alert.alert('Voice error', 'Something went wrong with the voice assistant. Please try again.');
      setState('idle');
      setIsUserSpeaking(false);
      setIsAssistantSpeaking(false);
    };

    vapi.on('call-start', handleCallStart);
    vapi.on('call-end', handleCallEnd);
    vapi.on('speech-update', handleSpeechUpdate);
    vapi.on('error', handleError);

    // NOTE: Interruption (user can cut off assistant) is configured
    // on the Vapi assistant itself in the Vapi dashboard. Make sure it is enabled there.

    return () => {
      if (vapi) {
        vapi.off('call-start', handleCallStart);
        vapi.off('call-end', handleCallEnd);
        vapi.off('speech-update', handleSpeechUpdate);
        vapi.off('error', handleError);
      }
    };
  }, [publicKey]);

  const start = async () => {
    if (!publicKey || !vapiRef.current || state === 'in-call' || state === 'connecting') {
      return;
    }

    const micOk = await ensureMicPermission();
    if (!micOk) return;

    try {
      setState('connecting');
      // Start a realtime voice call to the configured assistant
      // This uses Vapi's own audio pipeline – no local STT/TTS.
      await vapiRef.current.start(assistantId);
    } catch (error) {
      console.error('[Vapi] start() error:', error);
      Alert.alert('Voice error', 'Could not start the voice assistant. Please try again.');
      setState('idle');
    }
  };

  const stop = () => {
    if (!vapiRef.current) return;
    try {
      vapiRef.current.stop();
    } catch (error) {
      console.error('[Vapi] stop() error:', error);
    }
  };

  return {
    state,
    isUserSpeaking,
    isAssistantSpeaking,
    lastText,
    start,
    stop,
  };
}

export default useVapi;

