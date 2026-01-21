// Bloomie - Perplexity API Service
// Used for real-time, web-grounded information when local knowledge is insufficient
// Cost-optimized with caching and rate limiting

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'perplexity_cache_';
const CACHE_EXPIRY_HOURS = 24 * 7; // Cache results for 7 days
const MAX_CACHE_SIZE = 50; // Maximum cached queries

// Topics that benefit from real-time web search
const PERPLEXITY_WORTHY_TOPICS = [
  // Plant topics that need current info
  'disease', 'pest', 'infestation', 'dying', 'emergency', 'rare species',
  'new treatment', 'organic solution', 'specific variety',
  // Pet topics
  'poison', 'toxic', 'emergency vet', 'breed specific', 'medication',
  'recall', 'new vaccine', 'specific condition',
  // Baby topics  
  'recall', 'safety alert', 'new guidelines', 'specific condition',
  'developmental concern', 'medical',
];

interface CacheEntry {
  query: string;
  response: string;
  timestamp: number;
  sources?: string[];
}

interface PerplexityResponse {
  answer: string;
  sources: string[];
  fromCache: boolean;
}

/**
 * Check if a query warrants using Perplexity (real-time info needed)
 */
export function shouldUsePerplexity(query: string, localKnowledgeFound: boolean): boolean {
  const lowerQuery = query.toLowerCase();
  
  // If local knowledge covers it well, skip Perplexity
  if (localKnowledgeFound) {
    // Only use Perplexity for topics that need real-time info
    const needsRealTimeInfo = PERPLEXITY_WORTHY_TOPICS.some(topic => 
      lowerQuery.includes(topic)
    );
    return needsRealTimeInfo;
  }
  
  // No local knowledge - check if it's a question that benefits from web search
  const isQuestion = lowerQuery.includes('?') || 
    lowerQuery.match(/^(what|why|how|when|where|is|can|should|do|does)/);
  
  return isQuestion;
}

/**
 * Generate a cache key from the query
 */
function getCacheKey(query: string): string {
  // Normalize query for caching
  const normalized = query.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(w => w.length > 2)
    .sort()
    .join('_');
  return CACHE_PREFIX + normalized.substring(0, 100);
}

/**
 * Get cached response if available and not expired
 */
async function getCachedResponse(query: string): Promise<CacheEntry | null> {
  try {
    const key = getCacheKey(query);
    const cached = await AsyncStorage.getItem(key);
    
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      const ageHours = (Date.now() - entry.timestamp) / (1000 * 60 * 60);
      
      if (ageHours < CACHE_EXPIRY_HOURS) {
        return entry;
      }
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
}

/**
 * Save response to cache
 */
async function cacheResponse(query: string, response: string, sources: string[]): Promise<void> {
  try {
    const key = getCacheKey(query);
    const entry: CacheEntry = {
      query,
      response,
      timestamp: Date.now(),
      sources,
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    
    // Clean up old cache entries periodically
    await cleanupCache();
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

/**
 * Clean up old cache entries to prevent storage bloat
 */
async function cleanupCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    
    if (cacheKeys.length > MAX_CACHE_SIZE) {
      // Get all entries with timestamps
      const entries: { key: string; timestamp: number }[] = [];
      
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const entry = JSON.parse(data);
          entries.push({ key, timestamp: entry.timestamp });
        }
      }
      
      // Sort by timestamp (oldest first) and remove excess
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
      
      for (const { key } of toRemove) {
        await AsyncStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
}

/**
 * Query Perplexity API via Supabase Edge Function
 * Returns web-grounded answer with sources
 */
export async function queryPerplexity(
  query: string,
  context?: {
    nurtureType?: 'plant' | 'pet' | 'baby';
    nurtureName?: string;
  }
): Promise<PerplexityResponse> {
  // Check cache first
  const cached = await getCachedResponse(query);
  if (cached) {
    console.log('Perplexity: Using cached response');
    return {
      answer: cached.response,
      sources: cached.sources || [],
      fromCache: true,
    };
  }
  
  try {
    // Build context-aware query
    let enhancedQuery = query;
    if (context?.nurtureType) {
      const typeContext = {
        plant: 'houseplant care',
        pet: 'pet care veterinary',
        baby: 'infant baby care parenting',
      };
      enhancedQuery = `${query} (${typeContext[context.nurtureType]})`;
    }
    
    const { data, error } = await supabase.functions.invoke('perplexity-search', {
      body: {
        query: enhancedQuery,
        nurtureType: context?.nurtureType,
      },
    });
    
    if (error) throw error;
    
    if (data.success && data.answer) {
      // Cache the successful response
      await cacheResponse(query, data.answer, data.sources || []);
      
      return {
        answer: data.answer,
        sources: data.sources || [],
        fromCache: false,
      };
    }
    
    throw new Error('No answer received');
  } catch (error) {
    console.error('Perplexity query error:', error);
    return {
      answer: '',
      sources: [],
      fromCache: false,
    };
  }
}

/**
 * Smart query handler that decides between local knowledge and Perplexity
 */
export async function getSmartAnswer(
  query: string,
  localAnswer: string | null,
  context?: {
    nurtureType?: 'plant' | 'pet' | 'baby';
    nurtureName?: string;
  }
): Promise<{
  answer: string;
  source: 'local' | 'perplexity' | 'combined';
  perplexitySources?: string[];
}> {
  const hasLocalAnswer = !!localAnswer && localAnswer.length > 50;
  
  // Decide if we need Perplexity
  if (!shouldUsePerplexity(query, hasLocalAnswer)) {
    return {
      answer: localAnswer || "I don't have specific information about that. Could you tell me more?",
      source: 'local',
    };
  }
  
  // Query Perplexity for enhanced/real-time info
  const perplexityResult = await queryPerplexity(query, context);
  
  if (perplexityResult.answer) {
    // Combine local and Perplexity answers if both exist
    if (hasLocalAnswer) {
      return {
        answer: `${localAnswer}\n\n📡 **Latest info**: ${perplexityResult.answer}`,
        source: 'combined',
        perplexitySources: perplexityResult.sources,
      };
    }
    
    return {
      answer: perplexityResult.answer,
      source: 'perplexity',
      perplexitySources: perplexityResult.sources,
    };
  }
  
  // Fallback to local if Perplexity fails
  return {
    answer: localAnswer || "I couldn't find specific information. Please try asking in a different way.",
    source: 'local',
  };
}
