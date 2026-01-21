// Bloomie - Supabase Edge Function for AI Insights Generation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InsightRequest {
  nurture: {
    name: string
    type: 'baby' | 'pet' | 'plant'
  }
  logs: Array<{
    created_at: string
    parsed_action: string
    parsed_amount?: string
    parsed_notes?: string
    mood?: string
  }>
}

const SYSTEM_PROMPT = `You are Bloomie's AI analyst. Analyze care patterns and provide helpful insights.

Based on the care logs provided, identify:
1. PATTERNS: Recurring behaviors or optimal times (e.g., "Leo sleeps best after 8pm feeds", "Max is most active in mornings")
2. SUGGESTIONS: Tips for better care based on observed patterns
3. CONCERNS: Any potential issues to watch (be gentle and not alarming)

Be warm, supportive, encouraging, and concise. Use friendly language with occasional emojis.

Response format (JSON only):
{
  "patterns": ["pattern 1", "pattern 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "concerns": ["concern if any"] or [],
  "summary": "A brief encouraging summary of the overall care quality"
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const { nurture, logs }: InsightRequest = await req.json()

    if (!logs || logs.length < 3) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            patterns: [],
            suggestions: ['Keep logging to discover patterns! 🌱'],
            concerns: [],
            summary: 'Just getting started! Keep logging your moments and I\'ll help you find patterns. 💚',
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const logsText = logs.slice(0, 30).map(log => 
      `${log.created_at}: ${log.parsed_action} ${log.parsed_amount || ''} ${log.mood ? `(${log.mood})` : ''} - ${log.parsed_notes || ''}`
    ).join('\n')

    const userMessage = `
Nurture: ${nurture.name} (${nurture.type})

Recent care logs (newest first):
${logsText}

Analyze these logs and provide insights.`

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 800,
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'OpenAI API error')
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''

    let result
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found')
      }
    } catch {
      result = {
        patterns: [],
        suggestions: ['Keep logging to discover patterns!'],
        concerns: [],
        summary: 'Analysis in progress...',
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

