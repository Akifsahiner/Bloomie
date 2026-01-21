// Bloomie - App Configuration

// Supabase Configuration
export const SUPABASE_URL = 'https://fpocejfognopgtizdert.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_3xT374xPMRvfFrWaYGLv1Q_M7_I9cJA';

// OpenAI Configuration (stored in Supabase Edge Function for security)
// DO NOT call OpenAI directly from React Native
// Use Supabase Edge Function instead
export const OPENAI_MODEL = 'gpt-4o-mini';

// App Configuration
export const APP_NAME = 'Bloomie';
export const APP_VERSION = '1.0.0';

// Premium Pricing
export const PREMIUM_PRICES = {
  monthly: {
    price: 4.99,
    currency: 'USD',
    period: 'month',
    productId: 'bloomie_premium_monthly',
  },
  yearly: {
    price: 39.99,
    currency: 'USD',
    period: 'year',
    productId: 'bloomie_premium_yearly',
    savings: '33%',
  },
};

// Free Tier Limits (LIFETIME TOTALS, not daily)
export const FREE_LIMITS = {
  maxNurtures: 3,
  maxPhotosPerEntry: 1,
  historyDays: 30,

  // Lifetime usage for free users (per account / device)
  totalAiChatQueries: 100,        // Total AI chat messages
  totalPerplexityQueries: 10,     // Total premium Perplexity answers
  totalVoiceMinutes: 15,          // Approx. total voice mode minutes
  totalPhotoAnalysis: 10,         // Total photo analyses
};

// API Cost Optimization Settings
export const API_OPTIMIZATION = {
  // Use local knowledge base first before calling external APIs
  preferLocalKnowledge: true,
  
  // Cache Perplexity results for 7 days (was 24 hours)
  perplexityCacheHours: 24 * 7,
  
  // Max tokens for responses (lower = cheaper)
  openaiMaxTokens: 250,       // For chat responses (reduced from 300)
  perplexityMaxTokens: 300,   // For web-grounded answers (reduced from 500)
  
  // Throttle settings
  minSecondsBetweenCalls: 3,  // Prevent spam (slightly higher)
  
  // Models (cheapest options)
  openaiModel: 'gpt-4o-mini',     // ~$0.15/1M input, $0.60/1M output
  perplexityModel: 'sonar',       // ~$1/1M input, $5/1M output
};

// Premium Features
export const PREMIUM_FEATURES = [
  {
    icon: 'microphone',
    title: 'Voice Mode',
    description: 'Real-time voice conversations with AI assistant',
  },
  {
    icon: 'infinity',
    title: 'Unlimited Nurtures',
    description: 'Track as many babies, pets, and plants as you want',
  },
  {
    icon: 'camera-enhance',
    title: 'Unlimited Photo Analysis',
    description: 'AI analyzes photos for health insights',
  },
  {
    icon: 'chart-line',
    title: 'Advanced AI Insights',
    description: 'Deep analysis of habits and patterns',
  },
  {
    icon: 'robot',
    title: 'Smart Reminders',
    description: 'AI-calculated schedules and predictions',
  },
  {
    icon: 'history',
    title: 'Full History',
    description: 'Access your complete care journal',
  },
  {
    icon: 'file-export',
    title: 'Export Data',
    description: 'Download as PDF or CSV',
  },
];

// Family Plan Features (Premium+)
export const FAMILY_FEATURES = [
  {
    icon: 'account-group',
    title: 'Family Sharing',
    description: 'Share with up to 5 family members',
  },
  {
    icon: 'bell-ring',
    title: 'Advanced Notifications',
    description: 'SMS/Email digests & weekly summaries',
  },
  {
    icon: 'chart-areaspline',
    title: 'Growth Charts',
    description: 'Baby percentiles, pet weight, plant growth',
  },
  {
    icon: 'headset',
    title: 'Priority Support',
    description: '24/7 dedicated support',
  },
  {
    icon: 'star',
    title: 'Early Access',
    description: 'Be first to try new features',
  },
];
