// Bloomie - AI Proactive Health Alerts
// Analyzes care patterns and detects anomalies before problems occur

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface HealthAlertRequest {
  nurture: {
    id: string;
    name: string;
    type: 'plant' | 'pet' | 'baby';
    metadata?: any;
  };
  logs: Array<{
    created_at: string;
    parsed_action: string;
    parsed_amount?: string;
    parsed_notes?: string;
    mood?: string;
    health_score?: number;
  }>;
}

interface HealthAlert {
  id: string;
  nurtureId: string;
  nurtureName: string;
  type: 'urgent' | 'warning' | 'info';
  category: 'watering' | 'feeding' | 'health' | 'schedule' | 'veterinary' | 'medical';
  title: string;
  message: string;
  details: string;
  suggestedActions: string[];
  urgency: 'low' | 'medium' | 'high';
  detectedAt: string;
  data?: {
    expectedInterval?: number; // days/hours
    actualInterval?: number;
    lastActivity?: string;
    trend?: 'improving' | 'declining' | 'stable';
  };
}

const SYSTEM_PROMPT = `You are Bloomie, an expert AI health monitoring system. Your job is to analyze care patterns and proactively detect potential health issues BEFORE they become serious problems.

Analyze the care logs and identify:
1. ANOMALIES: Activities that are overdue or irregular
2. TRENDS: Declining health patterns (e.g., less frequent feeding, irregular schedule)
3. MISSING ACTIVITIES: Critical care activities that haven't happened in expected timeframes
4. EARLY WARNING SIGNS: Subtle indicators of potential problems

For PLANTS:
- Watering frequency anomalies (usually every X days, but it's been Y days)
- Signs of overwatering/underwatering from patterns
- Missing fertilization if it's been too long
- Seasonal care adjustments needed
- Health score declining trends (if health_score is tracked)
- Yellowing leaves, wilting, or other symptoms mentioned in notes
- Light/humidity issues based on patterns

For PETS:
- Feeding schedule irregularities
- Missing walks/exercise (especially for dogs)
- Overdue veterinary appointments (check if mentioned in notes)
- Parasite treatment due dates
- Behavioral changes (from mood logs - if mood is consistently 'sad' or 'tired')
- Health score declining (if tracked)
- Symptoms mentioned in notes (vomiting, diarrhea, lethargy, etc.)
- Weight changes or appetite changes

For BABIES:
- Feeding schedule disruptions
- Sleep pattern changes
- Missing diaper changes (based on frequency)
- Developmental milestone concerns
- Health symptom patterns (fever, rash, unusual crying mentioned in notes)
- Health score declining (if tracked)
- Mood/behavior changes (if consistently 'sad' or 'tired')
- Feeding amount changes (if parsed_amount shows decline)

CRITICAL RULES:
- Only flag REAL concerns, not minor variations
- Be specific: "Usually fed every 4 hours, but it's been 6 hours"
- Provide actionable advice
- Use urgency levels: urgent (immediate action needed), warning (soon), info (monitor)
- Be warm and supportive, not alarming
- Consider health_score trends: If declining, flag it
- Consider mood trends: If consistently sad/tired, investigate
- Look for symptoms in notes: vomiting, diarrhea, fever, unusual behavior
- Predictive alerts: "Based on pattern, [activity] will be needed in X days"
- Veterinary/Medical alerts: If symptoms suggest, recommend professional care

Response format (JSON only):
{
  "alerts": [
    {
      "type": "urgent" | "warning" | "info",
      "category": "watering" | "feeding" | "health" | "schedule" | "veterinary" | "medical",
      "title": "Short alert title",
      "message": "User-friendly explanation",
      "details": "Detailed explanation with numbers and context",
      "suggestedActions": ["action 1", "action 2"],
      "urgency": "high" | "medium" | "low",
      "data": {
        "expectedInterval": 5,
        "actualInterval": 8,
        "lastActivity": "2024-01-15",
        "trend": "declining",
        "healthScore": 3.5,
        "healthScoreTrend": "declining",
        "moodTrend": "concerning",
        "nextDueDate": "2024-01-20"
      }
    }
  ]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const { nurture, logs }: HealthAlertRequest = await req.json();

    if (!logs || logs.length < 3) {
      // Not enough data for pattern analysis
      return new Response(
        JSON.stringify({
          success: true,
          alerts: [],
          message: 'Keep logging activities to enable health monitoring! 🌱',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate basic statistics for AI context
    const now = new Date();
    const last30Days = logs.filter(log => {
      const logDate = new Date(log.created_at);
      return (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24) <= 30;
    });

    // Group by action type
    const actionFrequency: Record<string, number[]> = {};
    last30Days.forEach(log => {
      const action = log.parsed_action?.toLowerCase() || 'other';
      if (!actionFrequency[action]) {
        actionFrequency[action] = [];
      }
      actionFrequency[action].push(new Date(log.created_at).getTime());
    });

    // Calculate intervals
    const intervals: Record<string, number> = {};
    Object.entries(actionFrequency).forEach(([action, timestamps]) => {
      if (timestamps.length >= 2) {
        timestamps.sort((a, b) => a - b);
        const gaps = [];
        for (let i = 1; i < timestamps.length; i++) {
          const gap = (timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24); // days
          gaps.push(gap);
        }
        intervals[action] = gaps.reduce((a, b) => a + b, 0) / gaps.length; // average
      }
    });

    // Find last activity for each action
    const lastActivities: Record<string, string> = {};
    last30Days.forEach(log => {
      const action = log.parsed_action?.toLowerCase() || 'other';
      if (!lastActivities[action] || log.created_at > lastActivities[action]) {
        lastActivities[action] = log.created_at;
      }
    });

    // Calculate days since last activity
    const daysSince: Record<string, number> = {};
    Object.entries(lastActivities).forEach(([action, lastDate]) => {
      const days = (now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24);
      daysSince[action] = Math.floor(days);
    });

    // Calculate health score trends
    const healthScores = last30Days
      .filter(log => log.health_score !== undefined && log.health_score !== null)
      .map(log => ({
        date: log.created_at,
        score: log.health_score as number,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let healthTrend: 'improving' | 'declining' | 'stable' = 'stable';
    let avgHealthScore: number | undefined;
    
    if (healthScores.length >= 3) {
      const recentScores = healthScores.slice(-7).map(h => h.score);
      const olderScores = healthScores.slice(0, Math.min(7, healthScores.length - 7)).map(h => h.score);
      
      if (recentScores.length > 0 && olderScores.length > 0) {
        const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
        avgHealthScore = recentAvg;
        
        if (recentAvg > olderAvg + 0.3) {
          healthTrend = 'improving';
        } else if (recentAvg < olderAvg - 0.3) {
          healthTrend = 'declining';
        }
      } else if (recentScores.length > 0) {
        avgHealthScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      }
    }

    // Analyze mood patterns
    const moodPatterns: Record<string, number> = {};
    const recentMoods: string[] = [];
    last30Days.forEach(log => {
      if (log.mood) {
        moodPatterns[log.mood] = (moodPatterns[log.mood] || 0) + 1;
        recentMoods.push(log.mood);
      }
    });

    const dominantMood = Object.entries(moodPatterns)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    
    const recentMoodTrend = recentMoods.length >= 3
      ? recentMoods.slice(-5).filter(m => m === 'sad' || m === 'tired').length > 2
        ? 'concerning'
        : 'normal'
      : 'insufficient_data';

    // Calculate activity frequency trends
    const activityTrends: Record<string, 'increasing' | 'decreasing' | 'stable'> = {};
    Object.entries(actionFrequency).forEach(([action, timestamps]) => {
      if (timestamps.length >= 4) {
        const recent = timestamps.slice(-7);
        const older = timestamps.slice(0, Math.min(7, timestamps.length - 7));
        
        if (recent.length > 0 && older.length > 0) {
          const recentFreq = recent.length / 7; // activities per day
          const olderFreq = older.length / 7;
          
          if (recentFreq > olderFreq * 1.2) {
            activityTrends[action] = 'increasing';
          } else if (recentFreq < olderFreq * 0.8) {
            activityTrends[action] = 'decreasing';
          } else {
            activityTrends[action] = 'stable';
          }
        }
      }
    });

    // Build enhanced context for AI
    const context = {
      nurture: {
        name: nurture.name,
        type: nurture.type,
        species: nurture.metadata?.species || nurture.metadata?.breed || 'unknown',
        age: nurture.metadata?.birth_date 
          ? Math.floor((now.getTime() - new Date(nurture.metadata.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
          : undefined,
      },
      patterns: intervals,
      lastActivities: daysSince,
      healthScore: {
        current: avgHealthScore,
        trend: healthTrend,
        history: healthScores.slice(-10).map(h => ({ date: h.date, score: h.score })),
      },
      mood: {
        dominant: dominantMood,
        trend: recentMoodTrend,
        distribution: moodPatterns,
      },
      activityTrends,
      recentLogs: last30Days.slice(0, 20).map(log => ({
        date: log.created_at,
        action: log.parsed_action,
        notes: log.parsed_notes,
        mood: log.mood,
        health_score: log.health_score,
      })),
      currentTime: now.toISOString(),
    };

    const userMessage = `
Analyze health patterns for ${nurture.name} (${nurture.type}${context.nurture.species !== 'unknown' ? ` - ${context.nurture.species}` : ''}).

COMPREHENSIVE ANALYSIS REQUIRED:

Pattern Analysis:
${JSON.stringify(context, null, 2)}

SPECIFIC CHECKS:
1. Activity Anomalies: Compare expected vs actual intervals
2. Health Score Trends: ${healthTrend === 'declining' ? '⚠️ Health score is DECLINING - this is critical!' : healthTrend === 'improving' ? '✅ Health score improving' : 'Health score stable'}
3. Mood Patterns: ${recentMoodTrend === 'concerning' ? '⚠️ Recent mood trend is CONCERNING - investigate!' : 'Mood patterns normal'}
4. Activity Frequency: Check if any critical activities are decreasing
5. Symptoms in Notes: Look for keywords like "vomiting", "diarrhea", "fever", "lethargy", "yellow", "wilting"
6. Predictive: Based on patterns, when will next [activity] be needed?

Generate alerts for:
- Overdue activities (urgent if >2x expected interval)
- Declining health scores (warning if trend is declining)
- Concerning mood patterns (warning if consistently sad/tired)
- Symptoms mentioned in notes (urgent if serious, warning if mild)
- Predictive alerts (info level: "Based on pattern, watering needed in 2 days")

Be specific with numbers, dates, and actionable advice.`;

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
        max_tokens: 1000,
        temperature: 0.3, // Lower temperature for more consistent analysis
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Parse JSON response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback: Generate basic alerts from pattern analysis
      result = generateFallbackAlerts(context, nurture);
    }

    // Add IDs and metadata to alerts
    const alerts: HealthAlert[] = (result.alerts || []).map((alert: any, index: number) => ({
      id: `alert-${nurture.id}-${Date.now()}-${index}`,
      nurtureId: nurture.id,
      nurtureName: nurture.name,
      type: alert.type || 'info',
      category: alert.category || 'health',
      title: alert.title || 'Health Check',
      message: alert.message || '',
      details: alert.details || '',
      suggestedActions: alert.suggestedActions || [],
      urgency: alert.urgency || 'low',
      detectedAt: new Date().toISOString(),
      data: alert.data,
    }));

    // Smart filtering: prioritize urgent/warning, but keep predictive info alerts
    const urgentAlerts = alerts.filter(a => a.type === 'urgent');
    const warningAlerts = alerts.filter(a => a.type === 'warning');
    const infoAlerts = alerts.filter(a => a.type === 'info');
    
    // Combine: urgent + warning + top 1-2 info (if no urgent/warning)
    let filteredAlerts: HealthAlert[] = [];
    
    if (urgentAlerts.length > 0) {
      filteredAlerts = [...urgentAlerts, ...warningAlerts.slice(0, 2)];
    } else if (warningAlerts.length > 0) {
      filteredAlerts = [...warningAlerts.slice(0, 2), ...infoAlerts.slice(0, 1)];
    } else {
      filteredAlerts = infoAlerts.slice(0, 2); // Max 2 info alerts if no urgent/warning
    }
    
    // Limit total to 3
    filteredAlerts = filteredAlerts.slice(0, 3);

    return new Response(
      JSON.stringify({
        success: true,
        alerts: filteredAlerts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Health alerts error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
        alerts: [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Enhanced fallback alert generation if AI fails
function generateFallbackAlerts(context: any, nurture: any): any {
  const alerts: any[] = [];
  const now = new Date();

  // Check health score trends
  if (context.healthScore && context.healthScore.trend === 'declining' && context.healthScore.current) {
    const currentScore = context.healthScore.current;
    if (currentScore < 3.5) {
      alerts.push({
        type: currentScore < 2.5 ? 'urgent' : 'warning',
        category: 'health',
        title: `${nurture.name}'s Health Declining`,
        message: `Health score has been declining. Current: ${currentScore.toFixed(1)}/5`,
        details: `Your ${nurture.name}'s health score trend shows a decline. This could indicate an underlying issue. Monitor closely and consider professional care if symptoms persist.`,
        suggestedActions: [
          'Monitor for symptoms',
          'Check for any visible issues',
          'Consider professional consultation if concerned',
        ],
        urgency: currentScore < 2.5 ? 'high' : 'medium',
        data: {
          healthScore: currentScore,
          healthScoreTrend: 'declining',
        },
      });
    }
  }

  // Check mood trends
  if (context.mood && context.mood.trend === 'concerning') {
    alerts.push({
      type: 'warning',
      category: 'health',
      title: `${nurture.name} May Need Attention`,
      message: `Recent mood patterns show concern. Monitor behavior closely.`,
      details: `${nurture.name} has been showing signs of being sad or tired more frequently. This could indicate health issues, stress, or care needs.`,
      suggestedActions: [
        'Observe behavior closely',
        'Check for any physical symptoms',
        'Ensure basic needs are met',
        'Consider professional consultation if persists',
      ],
      urgency: 'medium',
      data: {
        moodTrend: 'concerning',
        dominantMood: context.mood.dominant,
      },
    });
  }

  // Check for overdue watering (plants)
  if (nurture.type === 'plant') {
    const wateringInterval = context.patterns['water'] || context.patterns['watered'] || context.patterns['watering'];
    const daysSinceWatering = context.lastActivities['water'] || context.lastActivities['watered'] || context.lastActivities['watering'];
    
    if (wateringInterval && daysSinceWatering) {
      const expected = Math.ceil(wateringInterval);
      const actual = Math.ceil(daysSinceWatering);
      
      if (actual > expected * 1.3) {
        const nextDueDate = new Date(now);
        nextDueDate.setDate(nextDueDate.getDate() + (expected - (actual - expected)));
        
        alerts.push({
          type: actual > expected * 2 ? 'urgent' : 'warning',
          category: 'watering',
          title: `${nurture.name} May Need Water`,
          message: `Usually watered every ${expected} days, but it's been ${actual} days.`,
          details: `Your ${nurture.name} typically needs water every ${expected} days based on your care pattern. It's been ${actual} days since the last watering. Check the soil moisture immediately!`,
          suggestedActions: [
            'Check soil moisture (stick finger 2-3cm deep)',
            'Water if soil is dry',
            'Look for wilting or yellowing leaves',
            'Adjust schedule if needed',
          ],
          urgency: actual > expected * 2 ? 'high' : 'medium',
          data: {
            expectedInterval: expected,
            actualInterval: actual,
            lastActivity: context.lastActivities['water'] || context.lastActivities['watered'] || context.lastActivities['watering'],
            trend: 'declining',
            nextDueDate: nextDueDate.toISOString(),
          },
        });
      } else if (actual < expected * 0.7 && actual > 0) {
        // Predictive: Watering will be needed soon
        const daysUntil = Math.ceil(expected - actual);
        if (daysUntil <= 2) {
          alerts.push({
            type: 'info',
            category: 'watering',
            title: `${nurture.name} Watering Soon`,
            message: `Based on your pattern, watering will be needed in ${daysUntil} day${daysUntil > 1 ? 's' : ''}.`,
            details: `Your ${nurture.name} is typically watered every ${expected} days. Plan to check and water in ${daysUntil} day${daysUntil > 1 ? 's' : ''}.`,
            suggestedActions: [
              'Plan to check soil moisture',
              'Prepare for watering',
            ],
            urgency: 'low',
            data: {
              expectedInterval: expected,
              actualInterval: actual,
              nextDueDate: new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000).toISOString(),
            },
          });
        }
      }
    }
  }

  // Check for feeding irregularities (pets/babies)
  if (nurture.type === 'pet' || nurture.type === 'baby') {
    const feedingInterval = context.patterns['feed'] || context.patterns['fed'] || context.patterns['feeding'];
    const daysSinceFeeding = context.lastActivities['feed'] || context.lastActivities['fed'] || context.lastActivities['feeding'];
    
    if (feedingInterval && daysSinceFeeding !== undefined) {
      const expectedHours = feedingInterval * 24;
      const actualHours = daysSinceFeeding * 24;
      
      if (actualHours > expectedHours * 1.3) {
        alerts.push({
          type: actualHours > expectedHours * 1.8 ? 'urgent' : 'warning',
          category: 'feeding',
          title: `${nurture.name} Feeding Time`,
          message: `Usually fed every ${Math.round(expectedHours)} hours, but it's been ${Math.round(actualHours)} hours.`,
          details: `Based on your feeding pattern, ${nurture.name} typically eats every ${Math.round(expectedHours)} hours. It's been ${Math.round(actualHours)} hours since the last feeding. Check if feeding is needed!`,
          suggestedActions: [
            'Check if feeding is needed now',
            'Verify last feeding time',
            'Monitor for hunger signs',
            'Adjust schedule if needed',
          ],
          urgency: actualHours > expectedHours * 1.8 ? 'high' : 'medium',
          data: {
            expectedInterval: expectedHours,
            actualInterval: actualHours,
            lastActivity: context.lastActivities['feed'] || context.lastActivities['fed'] || context.lastActivities['feeding'],
            trend: 'declining',
          },
        });
      }
    }

    // Check for missing walks (dogs)
    if (nurture.type === 'pet') {
      const walkInterval = context.patterns['walk'] || context.patterns['walked'] || context.patterns['walking'];
      const daysSinceWalk = context.lastActivities['walk'] || context.lastActivities['walked'] || context.lastActivities['walking'];
      
      if (walkInterval && daysSinceWalk !== undefined) {
        const expected = Math.ceil(walkInterval);
        const actual = Math.ceil(daysSinceWalk);
        
        if (actual > expected * 1.5 && expected < 2) { // Only alert if walks are usually daily
          alerts.push({
            type: actual > expected * 2 ? 'warning' : 'info',
            category: 'schedule',
            title: `${nurture.name} Needs Exercise`,
            message: `Usually walked every ${expected} day${expected > 1 ? 's' : ''}, but it's been ${actual} days.`,
            details: `${nurture.name} typically gets ${actual > expected * 2 ? 'daily' : 'regular'} walks. Exercise is important for health and happiness!`,
            suggestedActions: [
              'Plan a walk soon',
              'Check if exercise is needed',
              'Consider indoor play if weather is bad',
            ],
            urgency: actual > expected * 2 ? 'medium' : 'low',
            data: {
              expectedInterval: expected,
              actualInterval: actual,
              lastActivity: context.lastActivities['walk'] || context.lastActivities['walked'] || context.lastActivities['walking'],
            },
          });
        }
      }
    }
  }

  // Check for symptoms in notes
  const symptomKeywords = {
    urgent: ['vomiting', 'diarrhea', 'fever', 'bleeding', 'seizure', 'unconscious', 'choking'],
    warning: ['lethargy', 'not eating', 'not drinking', 'crying', 'whining', 'limping', 'rash'],
    info: ['unusual', 'different', 'change', 'concern'],
  };

  const recentLogsWithNotes = context.recentLogs?.filter((log: any) => log.notes) || [];
  for (const log of recentLogsWithNotes.slice(0, 5)) {
    const notesLower = (log.notes || '').toLowerCase();
    
    for (const [severity, keywords] of Object.entries(symptomKeywords)) {
      for (const keyword of keywords) {
        if (notesLower.includes(keyword)) {
          alerts.push({
            type: severity === 'urgent' ? 'urgent' : severity === 'warning' ? 'warning' : 'info',
            category: nurture.type === 'baby' ? 'medical' : 'health',
            title: `Symptom Detected: ${keyword}`,
            message: `Recent log mentions "${keyword}". Monitor closely.`,
            details: `A recent care log mentioned "${keyword}". ${severity === 'urgent' ? 'This may require immediate attention. Consider professional care.' : 'Monitor for changes and consider professional consultation if it persists.'}`,
            suggestedActions: severity === 'urgent' 
              ? ['Seek immediate professional care', 'Monitor closely', 'Document symptoms']
              : ['Monitor for changes', 'Consider professional consultation if persists', 'Document symptoms'],
            urgency: severity === 'urgent' ? 'high' : severity === 'warning' ? 'medium' : 'low',
            data: {
              symptom: keyword,
              logDate: log.date,
            },
          });
          break; // Only one alert per log
        }
      }
    }
  }

  return { alerts };
}
