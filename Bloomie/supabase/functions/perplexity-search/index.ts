// Bloomie - Perplexity API Edge Function
// Uses Sonar model for cost-effective web-grounded answers
// IMPORTANT: Set PERPLEXITY_API_KEY in Supabase secrets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')!;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Use the basic Sonar model for cost efficiency
// sonar: $1/M input, $5/M output (most economical)
const MODEL = 'sonar';

interface PerplexityRequest {
  query: string;
  nurtureType?: 'plant' | 'pet' | 'baby';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!PERPLEXITY_API_KEY) {
      throw new Error('Perplexity API key not configured');
    }

    const { query, nurtureType }: PerplexityRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build system prompt based on nurture type for better focused answers
    let systemPrompt = `You are a helpful care assistant. Provide concise, accurate, and actionable advice.`;
    
    if (nurtureType === 'plant') {
      systemPrompt = `You are an expert botanist and houseplant care specialist. Provide concise, practical advice about plant care, diseases, pests, and treatments. Focus on actionable steps.`;
    } else if (nurtureType === 'pet') {
      systemPrompt = `You are a veterinary care advisor. Provide helpful pet care information. For serious health concerns, always recommend consulting a veterinarian. Keep advice practical and safe.`;
    } else if (nurtureType === 'baby') {
      systemPrompt = `You are a parenting and infant care advisor. Provide supportive, evidence-based baby care information. For health concerns, always recommend consulting a pediatrician. Be reassuring but accurate.`;
    }

    // Add instruction to keep response concise (saves tokens = saves money)
    systemPrompt += `\n\nIMPORTANT: Keep your response concise (2-3 paragraphs max). Focus on the most relevant and actionable information.`;

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        max_tokens: 500, // Limit output tokens for cost control
        temperature: 0.2, // Lower temperature for more focused answers
        return_citations: true, // Get sources
        return_related_questions: false, // Don't need these, saves tokens
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    return new Response(
      JSON.stringify({
        success: true,
        answer,
        sources: citations.slice(0, 3), // Only return top 3 sources
        model: MODEL,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Perplexity search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
