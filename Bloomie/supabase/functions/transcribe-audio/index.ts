// Bloomie - Whisper API Transcription Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

interface TranscribeRequest {
  audioBase64: string;
  audioFormat?: string; // 'm4a', 'mp3', 'wav', etc.
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const { audioBase64, audioFormat = 'm4a' }: TranscribeRequest = await req.json()

    if (!audioBase64) {
      throw new Error('Audio data is required')
    }

    // Convert base64 to binary
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create a File/Blob for Whisper API
    const audioBlob = new Blob([bytes], { type: `audio/${audioFormat}` });
    
    // Create FormData with File
    const audioFile = new File([audioBlob], `audio.${audioFormat}`, {
      type: `audio/${audioFormat}`,
    })

    // Call OpenAI Whisper API - auto-detect language
    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('model', 'whisper-1')
    // Don't specify language - let Whisper auto-detect
    formData.append('response_format', 'json')

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error('Whisper API error:', whisperResponse.status, errorText)
      throw new Error(`Whisper API error: ${whisperResponse.status}`)
    }

    const whisperData = await whisperResponse.json()
    const transcript = whisperData.text || ''

    return new Response(
      JSON.stringify({
        success: true,
        transcript,
        language: whisperData.language || 'auto',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Transcribe audio error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

