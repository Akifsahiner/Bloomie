// Bloomie - Analyze Photo Edge Function (GPT-4 Vision)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

interface AnalyzePhotoRequest {
  image: string; // Base64 encoded image
  nurture: {
    name: string;
    type: 'baby' | 'pet' | 'plant';
    metadata?: any;
  };
  context?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image, nurture, context }: AnalyzePhotoRequest = await req.json();

    if (!image || !nurture) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image and nurture data required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build prompt based on nurture type
    let systemPrompt = '';
    let userPrompt = '';

    if (nurture.type === 'plant') {
      systemPrompt = `You are a plant expert. You will THOROUGHLY analyze the user's plant photo.
Respond in English. Be VERY CAREFUL and evaluate:
- Plant's overall health status
- Leaf color and condition (green, yellow, brown, pale, dull, shiny)
- Leaf shape (normal, curling, drooping, dried)
- Stem condition (sturdy, weak, leaning)
- Soil condition (appears dry/moist, color)
- Possible issues (overwatering/underwatering, lack of light, disease, pests, root rot)
- DISEASE SYMPTOMS (yellow leaves, brown spots, leaf drop, wilting, drying)

IMPORTANT: If the plant looks unhealthy (yellow leaves, drying, wilting etc.) you MUST mention it and set urgency to "high".

Respond in JSON format:
{
  "description": "Detailed description of the plant's condition (clearly state if unhealthy)",
  "healthScore": 1-10 score (if unhealthy, should be below 4),
  "issues": ["list of detected issues (clearly state if unhealthy)"],
  "recommendations": ["list of recommendations (urgent care advice if unhealthy)"],
  "suggestedActions": [
    {"action": "action to take (e.g.: Water immediately, Move to light, Take to vet)", "urgency": "low/medium/high", "reminderTime": "hours (optional)"}
  ]
}`;
      userPrompt = `Photo of my plant named ${nurture.name}. ${context ? `Additional info: ${context}` : ''} Analyze the photo THOROUGHLY. Clearly state if it looks unhealthy.`;
    } 
    else if (nurture.type === 'pet') {
      const species = nurture.metadata?.species || 'pet';
      systemPrompt = `You are a veterinarian and animal behavior expert. You will THOROUGHLY analyze the user's ${species} photo.
Respond in English. Be VERY CAREFUL and evaluate:
- Animal's general appearance and health status (eyes, nose, ears, fur condition)
- Body condition (thin, normal, overweight)
- Fur/skin condition (dull, shiny, shedding, wounds, redness)
- Eye condition (open, closed, red, discharge)
- Nose condition (dry, moist, discharge)
- Behavioral signs (stress, happiness, lethargy, anxiety)
- ILLNESS SYMPTOMS (lethargy, loss of appetite, fur loss, wounds, redness, discharge, weakness)

IMPORTANT: If the pet looks sick (eyes closed, dull fur, thin, lethargic, wounds etc.) you MUST mention it and set urgency to "high".

Respond in JSON format:
{
  "description": "Detailed description of the animal's condition (clearly state if sick)",
  "healthScore": 1-10 score (if sick, should be below 4),
  "mood": "happy/calm/anxious/tired/playful/sick",
  "issues": ["issues to watch for (clearly state if sick)"],
  "recommendations": ["care recommendations (recommend vet visit if sick)"],
  "suggestedActions": [
    {"action": "action to take", "urgency": "low/medium/high", "reminderTime": "hours (optional)"}
  ]
}`;
      userPrompt = `My ${species} named ${nurture.name}. ${context ? `Additional info: ${context}` : ''} Analyze the photo THOROUGHLY. Clearly state if it looks sick.`;
    }
    else if (nurture.type === 'baby') {
      systemPrompt = `You are a child development expert. You will analyze the baby's photo.
Respond in English. Be safe and positive. Evaluate:
- Baby's general condition and happiness
- Position and whether they look comfortable
- Visible developmental signs

IMPORTANT: Do not make medical diagnoses, only general observations.

Respond in JSON format:
{
  "description": "Cute and positive description about the baby",
  "mood": "happy/calm/sleepy/playful/fussy",
  "issues": [],
  "recommendations": ["general care recommendations"],
  "suggestedActions": [{"action": "suggestion", "urgency": "low"}]
}`;
      userPrompt = `Photo of my baby ${nurture.name}. ${context ? `Additional info: ${context}` : ''} Analyze it.`;
    }

    // Call OpenAI Vision API
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
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI error:', error);
      throw new Error('Failed to analyze image');
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content || '';

    // Parse JSON from response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      // If parsing fails, create structured response from text
      analysis = {
        description: content.slice(0, 200),
        issues: [],
        recommendations: [content.slice(0, 300)],
        suggestedActions: [],
      };
    }

    return new Response(
      JSON.stringify({ success: true, data: analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Analyze photo error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

