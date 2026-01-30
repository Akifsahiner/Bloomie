// Bloomie - Supabase Edge Function for OpenAI Integration
// This function securely calls OpenAI API from the server-side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParseRequest {
  text: string
  nurtures: Array<{
    id: string
    name: string
    type: 'baby' | 'pet' | 'plant'
  }>
}

interface ParseResult {
  nurture_id?: string
  nurture_name?: string
  nurture_type?: string
  action: string
  amount?: string
  duration?: string
  mood?: string
  notes?: string
  suggested_reminder?: {
    title: string
    scheduled_at: string
    repeat_pattern?: string
  } | null
}

const SYSTEM_PROMPT = `You are Bloomie, a friendly care journal assistant. Parse user input about caring for babies, pets, or plants.

Extract the following from the user's message:
1. WHO: The name of the baby/pet/plant being cared for (match against provided nurtures list)
2. WHAT: The action taken (feeding, watering, walking, diaper change, nap, medicine, etc.)
3. AMOUNT: Any quantity mentioned (ml, minutes, grams, cups, etc.)
4. DURATION: Time spent on the activity
5. MOOD: Emotional state if mentioned (happy, tired, fussy, playful, etc.)
6. NOTES: Any additional observations

Also determine if a reminder should be suggested based on the action:
- Medicine/vitamins → suggest next dose (usually next day same time or as prescribed)
- Watering plants → suggest next watering (typically 5-7 days for most plants)
- Feeding baby → suggest next feeding (usually 2-4 hours)
- Walking pet → suggest next walk (usually 8 hours)
- Vet/Doctor visit → suggest follow-up

IMPORTANT: 
- Match nurture names case-insensitively
- If no nurture name is found in the text, try to infer from context (baby words → baby, walk/treat → pet, water/fertilize → plant)
- Return valid JSON only, no markdown

Response format:
{
  "nurture_name": "matched name from nurtures list or inferred",
  "nurture_type": "baby|pet|plant",
  "action": "main action (feeding, watering, walking, etc.)",
  "amount": "quantity if any",
  "duration": "time duration if any",
  "mood": "emotional state if mentioned",
  "notes": "cleaned up version of the full entry",
  "suggested_reminder": {
    "title": "Reminder title",
    "scheduled_at": "ISO 8601 datetime",
    "repeat_pattern": "daily|weekly|monthly or null"
  } or null
}`

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const { text, nurtures }: ParseRequest = await req.json()

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required')
    }

    // Build nurtures context
    const nurturesList = nurtures.length > 0
      ? nurtures.map(n => `- ${n.name} (${n.type})`).join('\n')
      : 'No nurtures configured yet'

    const userMessage = `
Available nurtures:
${nurturesList}

User entry: "${text}"

Parse this entry and return JSON.`

    // Call OpenAI API
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
        max_tokens: 500,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'OpenAI API error')
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''

    // Parse JSON from response
    let result: ParseResult
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      // Return a basic parse if AI fails
      result = {
        action: text.split(' ').slice(0, 3).join(' '),
        notes: text,
      }
    }

    // Match nurture from parsed name
    if (result.nurture_name && nurtures.length > 0) {
      const matched = nurtures.find(
        n => n.name.toLowerCase() === result.nurture_name?.toLowerCase()
      )
      if (matched) {
        result.nurture_id = matched.id
        result.nurture_type = matched.type
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

