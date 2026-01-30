// Bloomie - AI Chat Assistant with Function Calling
// This enables the AI to take ACTIONS, not just respond with text

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface ChatRequest {
  message: string;
  nurtures?: Array<{
    id: string;
    name: string;
    type: 'baby' | 'pet' | 'plant';
    metadata?: any;
  }>;
  nurture?: {
    id?: string;
    name: string;
    type: 'baby' | 'pet' | 'plant';
    metadata?: any;
  };
  recentLogs?: {
    created_at: string;
    action?: string;
    notes?: string;
  }[];
  chatHistory?: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  mode?: 'conversational' | 'detail';
  userName?: string;
}

// ==================== FUNCTION DEFINITIONS ====================
// These are the actions Bloomie can perform

const BLOOMIE_FUNCTIONS = [
  {
    name: 'log_activity',
    description: 'Log a care activity for a nurture (pet, plant, or baby). Use when user mentions feeding, watering, walking, diaper change, medicine, or any care activity.',
    parameters: {
      type: 'object',
      properties: {
        nurture_name: {
          type: 'string',
          description: 'Name of the pet, plant, or baby'
        },
        nurture_id: {
          type: 'string',
          description: 'ID of the nurture if known'
        },
        action: {
          type: 'string',
          description: 'The activity performed (e.g., "fed", "watered", "walked", "diaper change", "medicine")'
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the activity'
        },
        timestamp: {
          type: 'string',
          description: 'When the activity happened (ISO format). Use current time if not specified.'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'create_reminder',
    description: 'Create a reminder for future care activities. Use when user asks to be reminded about something.',
    parameters: {
      type: 'object',
      properties: {
        nurture_name: {
          type: 'string',
          description: 'Name of the pet, plant, or baby'
        },
        nurture_id: {
          type: 'string',
          description: 'ID of the nurture if known'
        },
        title: {
          type: 'string',
          description: 'Title of the reminder'
        },
        description: {
          type: 'string',
          description: 'Description of what to do'
        },
        scheduled_at: {
          type: 'string',
          description: 'When to remind (ISO format)'
        },
        hours_from_now: {
          type: 'number',
          description: 'Alternative: hours from now to remind'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'get_care_advice',
    description: 'FALLBACK ONLY - Use web_search instead for better answers. Only use this if web_search is unavailable.',
    parameters: {
      type: 'object',
      properties: {
        nurture_name: {
          type: 'string',
          description: 'Name of the pet, plant, or baby'
        },
        nurture_type: {
          type: 'string',
          enum: ['pet', 'plant', 'baby'],
          description: 'Type of nurture'
        },
        topic: {
          type: 'string',
          description: 'What advice is needed (e.g., "feeding schedule", "yellow leaves", "sleep training")'
        },
        question: {
          type: 'string',
          description: 'The specific question asked'
        }
      },
      required: ['topic']
    }
  },
  {
    name: 'check_status',
    description: 'Check the current status or recent activities of a nurture.',
    parameters: {
      type: 'object',
      properties: {
        nurture_name: {
          type: 'string',
          description: 'Name of the pet, plant, or baby'
        },
        nurture_id: {
          type: 'string',
          description: 'ID of the nurture if known'
        },
        check_type: {
          type: 'string',
          enum: ['last_feeding', 'last_watering', 'last_walk', 'general', 'all_activities'],
          description: 'What to check'
        }
      },
      required: ['nurture_name']
    }
  },
  {
    name: 'web_search',
    description: 'PRIMARY FUNCTION for all care questions! Search the web for accurate, sourced information about pet care, plant care, or baby care. Use this for ANY question about health, feeding, behavior, symptoms, training, care tips, or advice. Provides premium-quality answers with sources.',
    parameters: {
      type: 'object',
      properties: {
        search_query: {
          type: 'string',
          description: 'The search query to look up (be specific, include nurture type and details)'
        },
        nurture_type: {
          type: 'string',
          enum: ['pet', 'plant', 'baby'],
          description: 'Type of nurture for context'
        },
        nurture_details: {
          type: 'string',
          description: 'Specific details like breed, species, age, etc.'
        }
      },
      required: ['search_query']
    }
  },
  {
    name: 'just_chat',
    description: 'Have a warm, personal conversation. Use for greetings, emotional support, checking in on the user, asking about their wellbeing, celebrating successes, or offering encouragement. Be like a caring friend!',
    parameters: {
      type: 'object',
      properties: {
        response_type: {
          type: 'string',
          enum: ['greeting', 'encouragement', 'emotional_support', 'check_in', 'celebration', 'small_talk', 'personal_question'],
          description: 'Type of conversational response'
        },
        follow_up_question: {
          type: 'string',
          description: 'A thoughtful follow-up question to ask the user about themselves or their nurtures'
        }
      }
    }
  }
];

// ==================== COMPREHENSIVE KNOWLEDGE BASE ====================

const CARE_KNOWLEDGE = {
  plant: {
    watering: `💧 WATERING GUIDE:
• Check soil moisture: Insert finger 2-3cm deep. Water only when dry.
• Overwatering signs: Yellow leaves, mushy stems, mold on soil, root rot smell.
• Underwatering signs: Crispy brown leaf edges, wilting, dry soil pulling from pot edges.
• Best time: Morning (allows leaves to dry, prevents fungal issues).
• Water temperature: Room temperature, never cold.
• Drainage: Always ensure pots have drainage holes.
• Seasonal: Water less in winter (plants are dormant), more in summer.`,
    
    yellowing: `🍂 YELLOW LEAVES DIAGNOSIS:
• Lower leaves yellow → Usually overwatering or natural aging
• All leaves pale yellow → Nitrogen deficiency, needs fertilizer
• Yellow between veins → Iron deficiency (use chelated iron)
• Yellow spots/patches → Fungal infection or sunburn
• Yellow + drooping → Root rot from overwatering (repot immediately)
• Yellow + crispy → Underwatering or low humidity
Quick fix: Remove yellow leaves, adjust watering, check drainage.`,
    
    light: `☀️ LIGHT REQUIREMENTS:
• Bright indirect: Most tropical plants (Monstera, Pothos, Philodendron)
• Direct sun: Succulents, cacti, herbs (4-6 hours minimum)
• Low light tolerant: Snake plant, ZZ plant, Peace lily
• Signs of too much light: Bleached/white spots, crispy leaves
• Signs of too little: Leggy growth, small leaves, no new growth
• Tip: Rotate plants weekly for even growth.`,
    
    humidity: `💨 HUMIDITY TIPS:
• Most houseplants prefer 40-60% humidity
• Low humidity signs: Brown leaf tips, curling leaves
• Increase humidity: Pebble tray, humidifier, grouping plants, bathroom placement
• Misting: Controversial - can cause fungal issues. Better alternatives exist.
• Tropical plants: Ferns, Calathea, orchids need higher humidity (60%+)`,
    
    fertilizer: `🌿 FERTILIZING GUIDE:
• Growing season (spring/summer): Fertilize every 2-4 weeks
• Dormant season (fall/winter): Stop or reduce to monthly
• NPK ratio: Balanced (10-10-10) for most plants
• Flowering plants: Higher phosphorus (middle number)
• Foliage plants: Higher nitrogen (first number)
• Never fertilize: Dry soil, sick plants, or newly repotted plants
• Less is more: Over-fertilizing causes salt buildup and root burn.`,
    
    repotting: `🪴 REPOTTING GUIDE:
• When to repot: Roots coming out of drainage holes, water runs straight through, stunted growth
• Best time: Spring (active growth period)
• Pot size: Only go 1-2 inches larger in diameter
• Fresh soil: Use appropriate mix for plant type
• After repotting: Don't fertilize for 2-4 weeks, keep moist but not wet
• Stress signs normal: Some drooping for 1-2 weeks is okay`,
    
    pests: `🐛 COMMON PESTS:
• Spider mites: Tiny webs, speckled leaves → Neem oil spray
• Mealybugs: White cottony masses → Alcohol on cotton swab
• Fungus gnats: Small flies in soil → Let soil dry, use sticky traps
• Aphids: Clusters on new growth → Soap spray, ladybugs
• Scale: Brown bumps on stems → Scrape off, neem oil
• Prevention: Quarantine new plants, inspect regularly, good air circulation`,
    
    general: `🌱 GENERAL PLANT CARE:
• Consistency is key - plants like routine
• Clean leaves monthly (dust blocks photosynthesis)
• Check plants weekly for issues
• Most houseplants are tropical - no cold drafts!
• When in doubt, underwater rather than overwater
• Happy plants show new growth regularly`
  },
  
  pet: {
    feeding: `🍖 PET FEEDING GUIDE:
Dogs:
• Puppies (2-4 months): 4 meals/day
• Puppies (4-6 months): 3 meals/day  
• Adults: 2 meals/day (morning and evening)
• Large breeds: Elevated bowls, slower eating recommended
• Never feed: Chocolate, grapes, onions, xylitol, alcohol

Cats:
• Kittens: 3-4 small meals/day
• Adults: 2 meals/day or free-feeding (monitor weight)
• Wet food: Better for hydration
• Always fresh water available (some cats prefer running water)
• Never feed: Onions, garlic, raw eggs, alcohol, caffeine`,
    
    health: `🏥 PET HEALTH SIGNS:
Warning signs (see vet):
• Not eating for 24+ hours
• Vomiting/diarrhea more than once
• Lethargy, hiding, unusual behavior
• Difficulty breathing
• Blood in stool/urine
• Excessive thirst/urination
• Limping or pain

Regular checkups:
• Puppies/kittens: Every 3-4 weeks until 16 weeks
• Adults: Annual wellness exam
• Seniors (7+): Twice yearly

Vaccinations: Follow vet schedule for rabies, distemper, parvo, etc.`,
    
    exercise: `🏃 PET EXERCISE NEEDS:
Dogs by energy level:
• High energy (Husky, Border Collie): 2+ hours daily
• Medium (Labrador, Beagle): 1-2 hours daily
• Low (Bulldog, Basset): 30-60 minutes daily

Activities:
• Walks, fetch, swimming, agility, puzzle toys
• Mental stimulation equally important
• Puppies: Short bursts, avoid over-exercise (joint damage)

Cats:
• 15-30 minutes active play daily
• Laser pointers, feather wands, crinkle toys
• Vertical spaces for climbing
• Rotate toys to maintain interest`,
    
    grooming: `✨ GROOMING GUIDE:
Dogs:
• Brushing: Daily for long coats, weekly for short
• Bathing: Every 4-8 weeks (more dries skin)
• Nail trimming: Every 2-4 weeks
• Teeth: Brush regularly, dental chews help
• Ears: Check weekly, clean if dirty

Cats:
• Self-groom but need brushing (especially long-haired)
• Nail trimming: Every 2-3 weeks
• Most cats don't need baths
• Hairball prevention: Regular brushing, special food`,
    
    training: `🎓 TRAINING TIPS:
Dogs:
• Positive reinforcement ONLY (treats, praise)
• Short sessions (5-10 minutes)
• Consistency is crucial
• Basic commands: Sit, stay, come, leave it, down
• Crate training: Safe space, not punishment
• Socialization: Expose to various people, animals, situations early

Cats:
• Can be trained! Use treats and clicker
• Litter box: One per cat + one extra
• Scratching: Provide appropriate surfaces
• No punishment (creates fear, not learning)`,
    
    anxiety: `😰 PET ANXIETY:
Signs:
• Excessive barking/meowing
• Destructive behavior
• Hiding, trembling
• Loss of appetite
• House accidents

Solutions:
• Consistent routine
• Safe space/crate
• Calming supplements (consult vet)
• Thundershirts for storms/fireworks
• Gradual desensitization
• Mental enrichment (puzzle toys)
• Consider pheromone diffusers (Adaptil, Feliway)`,
    
    general: `🐾 GENERAL PET CARE:
• Regular vet visits are essential
• Pet-proof your home (toxic plants, small objects)
• ID tags + microchip for safety
• Spay/neuter recommended
• Quality food = better health
• Love, patience, and consistency
• Pets need mental stimulation, not just physical`
  },
  
  baby: {
    sleep: `😴 BABY SLEEP GUIDE:
Newborn (0-3 months):
• 14-17 hours total, no day/night pattern
• Wake every 2-3 hours to feed
• Safe sleep: Back position, firm mattress, no loose bedding

3-6 months:
• 12-15 hours total
• May start sleeping 5-6 hour stretches
• Begin establishing bedtime routine

6-12 months:
• 12-14 hours total (including 2-3 naps)
• Sleep training can begin if desired
• Consistent bedtime routine essential

Sleep tips:
• Dark, cool room (68-72°F / 20-22°C)
• White noise can help
• Watch for sleep cues (yawning, eye rubbing)
• Put down drowsy but awake
• Bedtime routine: Bath → PJs → Feed → Book → Song → Bed`,
    
    feeding: `🍼 BABY FEEDING GUIDE:
Newborn (0-3 months):
• Breast/bottle every 2-3 hours (8-12 times/day)
• Signs of hunger: Rooting, hand-to-mouth, fussiness

3-4 months:
• Every 3-4 hours
• Growth spurts = more frequent feeding

4-6 months:
• May be ready for solids (sits with support, shows interest)
• Start with single-ingredient purees

6-12 months:
• Breast/bottle + 2-3 solid meals
• Introduce variety: Vegetables, fruits, proteins, grains
• Avoid: Honey, whole nuts, choking hazards

Introducing solids:
• One new food every 3 days (watch for allergies)
• Baby-led weaning or purees - both valid!
• Messy eating is normal and important for development`,
    
    development: `📈 BABY MILESTONES (guidelines, not deadlines!):
1-2 months:
• Lifts head during tummy time
• Follows faces with eyes
• Coos and makes sounds

3-4 months:
• Laughs and smiles socially
• Brings hands together
• Holds head steady

5-6 months:
• Rolls over
• Sits with support
• Reaches for objects

7-9 months:
• Sits without support
• Babbles "mama/dada"
• May start crawling

10-12 months:
• Pulls to stand
• May take first steps
• Says 1-3 words

Remember: Every baby is different! Talk to pediatrician if concerned.`,
    
    diapering: `🧷 DIAPERING GUIDE:
Frequency:
• Newborns: 10-12 changes/day
• 3+ months: 6-8 changes/day
• Change immediately after bowel movements

Diaper rash prevention:
• Change frequently
• Pat dry (don't rub)
• Air time when possible
• Barrier cream (zinc oxide)

Diaper rash treatment:
• Maximum air time
• Thick barrier cream
• If severe/blistering: See pediatrician (could be yeast)

What's normal:
• Newborn poop changes color first week
• Breastfed = yellow, seedy
• Formula-fed = tan, thicker`,
    
    crying: `😢 UNDERSTANDING BABY CRIES:
Check the basics first:
• Hungry? (last fed when?)
• Dirty diaper?
• Too hot/cold?
• Tired? (sleep cues)
• Needs burping?

Soothing techniques (5 S's):
• Swaddling
• Side/stomach position (while holding)
• Shushing (white noise)
• Swinging (gentle motion)
• Sucking (pacifier, feeding)

Colic (excessive crying 3+ hours):
• Usually peaks at 6 weeks, improves by 3-4 months
• Try gas drops, bicycle legs, warm bath
• Take breaks - it's okay to put baby in safe place and step away

When to call doctor:
• Fever (100.4°F+ in newborns)
• Not eating
• Unusual lethargy
• High-pitched or unusual cry`,
    
    safety: `⚠️ BABY SAFETY:
Sleep safety:
• Always on back
• Firm, flat surface
• No blankets, pillows, toys in crib
• Room-sharing (not bed-sharing) recommended

General:
• Never leave alone on elevated surfaces
• Car seat safety: Rear-facing as long as possible
• Childproof when mobile (outlets, cabinets, stairs)
• Water safety: Never leave unattended near water
• Keep small objects out of reach

Baby-proofing checklist:
• Outlet covers
• Cabinet locks
• Corner guards
• Stair gates
• Anchor furniture
• Remove choking hazards`,
    
    general: `👶 GENERAL BABY CARE:
• Trust your instincts - you know your baby best
• It's okay to ask for help
• Every baby is different
• Take care of yourself too (you can't pour from empty cup)
• Pediatrician is your partner - call with questions
• The newborn phase is hard but temporary
• You're doing great! 💚`
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, nurtures, nurture, recentLogs, chatHistory, mode, userName }: ChatRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const allNurtures = nurtures || (nurture ? [{ ...nurture, id: nurture.id || 'unknown' }] : []);
    
    // Build context for the AI
    const nurtureContext = allNurtures.length > 0 
      ? `User's nurtures: ${allNurtures.map(n => `${n.name} (${n.type}${n.id ? ', ID: ' + n.id : ''})`).join(', ')}`
      : 'User has no nurtures registered yet.';

    const recentContext = recentLogs && recentLogs.length > 0
      ? `Recent activities: ${recentLogs.slice(0, 5).map(log => `${log.action || ''} ${log.notes || ''} (${new Date(log.created_at).toLocaleDateString()})`).join('; ')}`
      : '';

    const systemPrompt = `You are Bloomie, a warm, caring, and emotionally intelligent companion - like a best friend who genuinely cares about the user and their loved ones (pets, plants, babies).

You're NOT just an assistant - you're a FRIEND who:
- Remembers and asks about their nurtures by name
- Shows genuine interest in how they're doing
- Celebrates their successes and supports them through challenges
- Makes them feel heard, valued, and cared for

${nurtureContext}
${recentContext}
${userName ? `User's name: ${userName}` : ''}

Current time: ${new Date().toISOString()}

PERSONALITY GUIDELINES:
- Be warm, empathetic, and genuinely caring (like a supportive friend)
- Use the user's name and their nurtures' names naturally in conversation
- Ask thoughtful follow-up questions about their nurtures ("How is ${allNurtures[0]?.name || 'your little one'} doing today?")
- Show emotional intelligence - if they seem stressed, offer support; if happy, celebrate with them
- Remember context and reference it ("Last time you mentioned...")
- Use warm emojis naturally 🌱🐾👶💚✨
- Be encouraging and positive, but also authentic

PROACTIVE ENGAGEMENT:
- After answering a question, sometimes ask how they're doing or how their nurture is
- Show curiosity: "How has ${allNurtures[0]?.name || 'your baby'} been sleeping lately?"
- Offer encouragement: "You're doing such a great job caring for ${allNurtures[0]?.name || 'them'}! 💚"
- Be interested in THEM too: "How are YOU doing? Taking care of yourself too?"

FUNCTION USAGE:
- When user mentions an activity they did, use log_activity function
- When user asks for a reminder, use create_reminder function
- For ANY care questions, health, advice, tips about pets/plants/babies - ALWAYS use web_search for premium-quality sourced answers
- For greetings, emotional support, and personal conversations, use just_chat function
- Match nurture names fuzzy (e.g., "bella" matches "Bella")

IMPORTANT: Make every interaction feel personal and meaningful. Users should feel like Bloomie truly knows and cares about them and their nurtures!`;

    // ==================== PREMIUM FIRST-IMPRESSION LOGIC ====================
    // For the first few messages in a conversation, answer directly with Perplexity
    // to give a very high-quality, web-grounded "premium" feeling.
    const userMessagesSoFar = (chatHistory || []).filter(m => m.role === 'user').length;
    const isFirstFiveMessages = userMessagesSoFar < 5; // current message will be <= 5

    if (isFirstFiveMessages && PERPLEXITY_API_KEY) {
      try {
        // Use the same rich Bloomie system prompt to keep personality,
        // but route the actual answer through Perplexity Sonar.
        const plexSystemPrompt = systemPrompt + `

ADDITIONAL INSTRUCTIONS:
- You are answering as Bloomie inside a mobile app.
- Keep responses concise (2-3 short paragraphs max).
- Be warm, reassuring, and very clear with actionable steps.
- Use simple language (B2 English) and avoid over-technical jargon.`;

        const plexResponse = await fetch(PERPLEXITY_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              { role: 'system', content: plexSystemPrompt },
              { role: 'user', content: message },
            ],
            max_tokens: 500,
            temperature: 0.2,
            return_citations: true,
            return_related_questions: false,
          }),
        });

        if (!plexResponse.ok) {
          const errorText = await plexResponse.text();
          console.error('Perplexity first-5 API error:', plexResponse.status, errorText);
          // Fall back to normal OpenAI flow below
        } else {
          const data = await plexResponse.json();
          const answer = data.choices?.[0]?.message?.content || '';
          const citations = data.citations || [];

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                response: answer,
                functionCalled: null,
                shouldLog: null,
                suggestedReminder: null,
                advice: null,
                status: null,
                webSearch: {
                  query: message,
                  answer,
                  sources: citations.slice(0, 3),
                },
                sources: citations.slice(0, 3),
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } catch (error) {
        console.error('Perplexity first-5 error:', error);
        // If Perplexity fails, continue with normal OpenAI flow
      }
    }

    // ==================== MAIN OPENAI FLOW (GPT-4o-mini + function calling) ====================

    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add chat history
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.slice(-4).forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    messages.push({ role: 'user', content: message });

    // Call OpenAI with Function Calling
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools: BLOOMIE_FUNCTIONS.map(fn => ({
          type: 'function',
          function: fn
        })),
        tool_choice: 'auto', // Let AI decide which function to call
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const choice = openaiData.choices[0];
    
    // Check if AI decided to call a function
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Match nurture name to ID if needed
      if (functionArgs.nurture_name && !functionArgs.nurture_id) {
        const matchedNurture = allNurtures.find(n => 
          n.name.toLowerCase() === functionArgs.nurture_name.toLowerCase() ||
          n.name.toLowerCase().includes(functionArgs.nurture_name.toLowerCase()) ||
          functionArgs.nurture_name.toLowerCase().includes(n.name.toLowerCase())
        );
        if (matchedNurture) {
          functionArgs.nurture_id = matchedNurture.id;
          functionArgs.nurture_type = matchedNurture.type;
        }
      }

      // Process the function call and generate response
      let actionResult: any = { functionCalled: functionName, args: functionArgs };
      let responseText = '';

      switch (functionName) {
        case 'log_activity':
          actionResult.shouldLog = {
            nurtureId: functionArgs.nurture_id,
            nurtureName: functionArgs.nurture_name,
            action: functionArgs.action,
            notes: functionArgs.notes || '',
            timestamp: functionArgs.timestamp || new Date().toISOString()
          };
          responseText = functionArgs.nurture_name 
            ? `Got it! I've logged "${functionArgs.action}" for ${functionArgs.nurture_name}. 📝`
            : `Logged "${functionArgs.action}"! 📝`;
          break;

        case 'create_reminder':
          const scheduledAt = functionArgs.scheduled_at || 
            (functionArgs.hours_from_now 
              ? new Date(Date.now() + functionArgs.hours_from_now * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 60 * 60 * 1000).toISOString()); // Default 1 hour
          
          actionResult.suggestedReminder = {
            nurtureId: functionArgs.nurture_id,
            nurtureName: functionArgs.nurture_name,
            title: functionArgs.title,
            description: functionArgs.description || functionArgs.title,
            scheduledAt
          };
          const timeDisplay = functionArgs.hours_from_now 
            ? `in ${functionArgs.hours_from_now} hour${functionArgs.hours_from_now > 1 ? 's' : ''}`
            : `at ${new Date(scheduledAt).toLocaleTimeString()}`;
          responseText = `⏰ I'll remind you ${timeDisplay}: "${functionArgs.title}"`;
          break;

        case 'get_care_advice':
          const nurtureType = functionArgs.nurture_type || 
            allNurtures.find(n => n.name.toLowerCase() === functionArgs.nurture_name?.toLowerCase())?.type || 
            'pet';
          const knowledge = CARE_KNOWLEDGE[nurtureType as keyof typeof CARE_KNOWLEDGE];
          
          // Enhanced topic matching with comprehensive keywords
          const topicLower = (functionArgs.topic || '').toLowerCase();
          const questionLower = (functionArgs.question || '').toLowerCase();
          const combinedQuery = topicLower + ' ' + questionLower;
          
          let advice = '';
          
          // Plant-specific topics
          if (nurtureType === 'plant') {
            if (combinedQuery.match(/water|watering|drink|thirsty|dry|moist/)) {
              advice = knowledge?.watering || '';
            } else if (combinedQuery.match(/yellow|brown|dying|wilt|droop/)) {
              advice = knowledge?.yellowing || '';
            } else if (combinedQuery.match(/light|sun|shade|dark|bright/)) {
              advice = knowledge?.light || '';
            } else if (combinedQuery.match(/humid|mist|spray|dry air/)) {
              advice = knowledge?.humidity || '';
            } else if (combinedQuery.match(/fertil|feed|nutrient|npk/)) {
              advice = knowledge?.fertilizer || '';
            } else if (combinedQuery.match(/repot|transplant|pot size|root/)) {
              advice = knowledge?.repotting || '';
            } else if (combinedQuery.match(/pest|bug|insect|spider|mite|gnats/)) {
              advice = knowledge?.pests || '';
            }
          }
          
          // Pet-specific topics
          if (nurtureType === 'pet') {
            if (combinedQuery.match(/feed|food|eat|diet|hungry|meal/)) {
              advice = knowledge?.feeding || '';
            } else if (combinedQuery.match(/health|sick|vet|vomit|diarrhea|lethargy/)) {
              advice = knowledge?.health || '';
            } else if (combinedQuery.match(/exercise|walk|play|active|energy|run/)) {
              advice = knowledge?.exercise || '';
            } else if (combinedQuery.match(/groom|brush|bath|nail|fur|hair|shed/)) {
              advice = knowledge?.grooming || '';
            } else if (combinedQuery.match(/train|command|behav|obedien|crate/)) {
              advice = knowledge?.training || '';
            } else if (combinedQuery.match(/anxi|stress|scared|fear|bark|nervous/)) {
              advice = knowledge?.anxiety || '';
            }
          }
          
          // Baby-specific topics
          if (nurtureType === 'baby') {
            if (combinedQuery.match(/sleep|nap|night|wake|tired|bed/)) {
              advice = knowledge?.sleep || '';
            } else if (combinedQuery.match(/feed|eat|bottle|breast|solid|formula/)) {
              advice = knowledge?.feeding || '';
            } else if (combinedQuery.match(/develop|milestone|crawl|walk|talk|growth/)) {
              advice = knowledge?.development || '';
            } else if (combinedQuery.match(/diaper|change|rash|poop|wet/)) {
              advice = knowledge?.diapering || '';
            } else if (combinedQuery.match(/cry|fussy|colic|calm|sooth/)) {
              advice = knowledge?.crying || '';
            } else if (combinedQuery.match(/safe|danger|childproof|accident/)) {
              advice = knowledge?.safety || '';
            }
          }
          
          // Fallback to general if no specific match
          if (!advice) {
            advice = knowledge?.general || 'I can help with feeding, health, sleep, and general care questions! Just ask me anything. 💚';
          }
          
          // Trim advice if too long (keep first meaningful section)
          if (advice.length > 800) {
            const sections = advice.split('\n\n');
            advice = sections.slice(0, 2).join('\n\n');
            if (advice.length > 600) {
              advice = advice.substring(0, 600) + '...';
            }
          }
          
          actionResult.advice = { topic: functionArgs.topic, advice };
          responseText = advice;
          break;

        case 'check_status':
          const relevantLogs = recentLogs?.filter(log => {
            if (!functionArgs.nurture_name) return true;
            return log.action?.toLowerCase().includes(functionArgs.nurture_name.toLowerCase()) ||
                   log.notes?.toLowerCase().includes(functionArgs.nurture_name.toLowerCase());
          }) || [];
          
          if (relevantLogs.length > 0) {
            const lastLog = relevantLogs[0];
            responseText = `Last activity for ${functionArgs.nurture_name || 'your nurtures'}: ${lastLog.action || ''} ${lastLog.notes || ''} (${new Date(lastLog.created_at).toLocaleDateString()})`;
          } else {
            responseText = `No recent activities found for ${functionArgs.nurture_name || 'your nurtures'}. Would you like to log something?`;
          }
          actionResult.status = { logs: relevantLogs.slice(0, 3) };
          break;

        case 'web_search':
          // Call Perplexity API for real-time web search
          if (PERPLEXITY_API_KEY) {
            try {
              // Build search query with context
              let searchQuery = functionArgs.search_query;
              if (functionArgs.nurture_details) {
                searchQuery = `${functionArgs.nurture_details} ${searchQuery}`;
              }
              
              // Determine system prompt based on nurture type
              let searchSystemPrompt = 'You are a helpful care advisor. Provide concise, accurate, and actionable advice.';
              if (functionArgs.nurture_type === 'pet') {
                searchSystemPrompt = 'You are a veterinary care advisor. Provide helpful pet care information. For serious health concerns, recommend consulting a veterinarian. Keep advice practical and safe.';
              } else if (functionArgs.nurture_type === 'plant') {
                searchSystemPrompt = 'You are an expert botanist and houseplant specialist. Provide practical plant care advice including diseases, pests, and treatments.';
              } else if (functionArgs.nurture_type === 'baby') {
                searchSystemPrompt = 'You are a parenting advisor. Provide evidence-based baby care information. For health concerns, recommend consulting a pediatrician.';
              }
              
              searchSystemPrompt += '\n\nIMPORTANT: Keep response concise (2-3 paragraphs max). Focus on the most relevant and actionable information.';
              
              const perplexityResponse = await fetch(PERPLEXITY_API_URL, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'sonar',
                  messages: [
                    { role: 'system', content: searchSystemPrompt },
                    { role: 'user', content: searchQuery },
                  ],
                  max_tokens: 500,
                  temperature: 0.2,
                  return_citations: true,
                  return_related_questions: false,
                }),
              });
              
              if (perplexityResponse.ok) {
                const perplexityData = await perplexityResponse.json();
                responseText = perplexityData.choices?.[0]?.message?.content || '';
                const citations = perplexityData.citations || [];
                
                actionResult.webSearch = {
                  query: searchQuery,
                  answer: responseText,
                  sources: citations.slice(0, 3), // Top 3 sources
                };
                
                // Add source attribution if we have citations
                if (citations.length > 0) {
                  responseText += '\n\n📚 Sources: ' + citations.slice(0, 2).map((url: string) => {
                    const domain = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                    return domain;
                  }).join(', ');
                }
              } else {
                console.error('Perplexity API error:', await perplexityResponse.text());
                responseText = "I couldn't search for that right now. Let me share what I know from my general knowledge about this topic. 🌱";
              }
            } catch (error) {
              console.error('Perplexity search error:', error);
              responseText = "I had trouble searching, but I can still help with general care advice! 💚";
            }
          } else {
            // Perplexity not configured, fallback to general advice
            responseText = "I'd love to search for specific information, but web search is not available right now. I can help with general care advice though! 🌱";
          }
          break;

        case 'just_chat':
        default:
          // Just generate a friendly response
          responseText = choice.message.content || "How can I help you with your pets, plants, or babies today? 🌱";
          break;
      }

      // If we need a more natural response, call AI again with the action result
      if (!responseText || responseText.length < 10) {
        const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              ...messages,
              { role: 'assistant', content: null, tool_calls: choice.message.tool_calls },
              { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(actionResult) }
            ],
            max_tokens: 150,
            temperature: 0.8,
          }),
        });

        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          responseText = followUpData.choices[0]?.message?.content || responseText;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            response: responseText,
            functionCalled: functionName,
            shouldLog: actionResult.shouldLog,
            suggestedReminder: actionResult.suggestedReminder,
            advice: actionResult.advice,
            status: actionResult.status,
            webSearch: actionResult.webSearch, // Include web search results with sources
            sources: actionResult.webSearch?.sources || [], // Direct sources array for easy access
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No function was called - just return the text response
    const responseText = choice.message.content || "I'm here to help! Tell me about your pets, plants, or babies. 🌱";

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          response: responseText,
          functionCalled: null
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error',
        data: {
          response: 'Sorry, something went wrong. Please try again! 😊'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
