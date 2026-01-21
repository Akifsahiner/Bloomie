// Bloomie - Parse Voice Command Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

interface ParseVoiceRequest {
  text: string;
  nurtures: Array<{
    id: string;
    name: string;
    type: 'baby' | 'pet' | 'plant';
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, nurtures }: ParseVoiceRequest = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ success: false, error: 'Text required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const nurtureList = nurtures.map(n => `- ${n.name} (${n.type})`).join('\n');

    const systemPrompt = `You are the Bloomie assistant. Analyze the user's voice command and return output in JSON format.

User's tracked items:
${nurtureList || 'No entries yet'}

Categorize commands as:
1. "log" - Recording an activity/event (e.g., "I fed Max", "watered my plant")
2. "reminder" - Setting a reminder (e.g., "remind me in 3 hours", "remind me to walk Buddy tomorrow")
3. "question" - Asking a question (e.g., "why are my plant's leaves turning yellow?")
4. "photo" - Requesting photo analysis (e.g., "look at my plant", "analyze its photo")

Convert time expressions to hours:
- "half an hour" = 0.5
- "1 hour" / "an hour" = 1
- "2 hours" = 2
- "tomorrow" = 24
- "3 days" = 72
- "1 week" = 168

JSON format:
{
  "intent": "log" | "reminder" | "question" | "photo",
  "nurtureName": "matched name or null",
  "nurtureId": "matched id or null",
  "action": "description of action done/to do",
  "reminderHours": number or null,
  "question": "question text or null"
}

Return only JSON, no explanation.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error');
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content || '';

    let parsed;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // Fallback
      parsed = {
        intent: 'log',
        action: text,
      };
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Parse voice command error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

