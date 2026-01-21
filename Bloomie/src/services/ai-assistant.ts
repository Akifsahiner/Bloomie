// Bloomie - AI Assistant Service (Photo Analysis, Smart Recommendations, Voice Commands)

import { supabase } from './supabase';
import type { Nurture, LogEntry, NurtureType } from '../types';

// ==================== PHOTO ANALYSIS ====================

export interface PhotoAnalysisResult {
  description: string;
  issues: string[];
  recommendations: string[];
  suggestedActions: {
    action: string;
    urgency: 'low' | 'medium' | 'high';
    reminderTime?: string;
  }[];
  healthScore?: number; // 1-10
  mood?: string; // For pets/babies
}

export async function analyzePhoto(
  imageBase64: string,
  nurture: Nurture,
  context?: string
): Promise<PhotoAnalysisResult> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-photo', {
      body: {
        image: imageBase64,
        nurture: {
          name: nurture.name,
          type: nurture.type,
          metadata: nurture.metadata,
        },
        context,
      },
    });

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error || 'Failed to analyze photo');
    }

    return data.data as PhotoAnalysisResult;
  } catch (error) {
    console.error('Photo analysis error:', error);
    
    // Return fallback based on type
    return getDefaultAnalysis(nurture.type);
  }
}

function getDefaultAnalysis(type: NurtureType): PhotoAnalysisResult {
  const defaults: Record<NurtureType, PhotoAnalysisResult> = {
    plant: {
      description: 'I see your plant! 🌱',
      issues: [],
      recommendations: ['Keep up regular watering to maintain your plant\'s health.'],
      suggestedActions: [
        { action: 'Check soil moisture', urgency: 'low' }
      ],
    },
    pet: {
      description: 'So cute! 🐾',
      issues: [],
      recommendations: ['Your pet looks healthy!'],
      suggestedActions: [],
    },
    baby: {
      description: 'Your little one is adorable! 👶',
      issues: [],
      recommendations: ['Everything looks great.'],
      suggestedActions: [],
    },
  };
  
  return defaults[type];
}

// ==================== SMART RECOMMENDATIONS ====================

export interface CareRecommendation {
  title: string;
  description: string;
  icon: string;
  priority: 'info' | 'warning' | 'urgent';
  action?: {
    label: string;
    type: 'reminder' | 'log' | 'info';
    data?: any;
  };
}

// Plant care database
export const PLANT_CARE_DATABASE: Record<string, {
  name: string;
  wateringDays: number;
  lightNeeds: 'low' | 'medium' | 'high';
  humidity: 'low' | 'medium' | 'high';
  fertilizingWeeks: number;
  tips: string[];
  commonIssues: string[];
}> = {
  'monstera': {
    name: 'Monstera (Deve Tabanı)',
    wateringDays: 7,
    lightNeeds: 'medium',
    humidity: 'high',
    fertilizingWeeks: 4,
    tips: [
      'Parlak, dolaylı ışık sever',
      'Yaprakları nemli bezle silin',
      'Büyüdükçe destek çubuğu gerekir',
      'Sarkan kökleri kesmeyin, saksıya yönlendirin',
    ],
    commonIssues: [
      'Sarı yapraklar: Aşırı sulama',
      'Kahverengi kenarlar: Düşük nem',
      'Soluk yapraklar: Yetersiz ışık',
    ],
  },
  'succulent': {
    name: 'Sukulent',
    wateringDays: 14,
    lightNeeds: 'high',
    humidity: 'low',
    fertilizingWeeks: 8,
    tips: [
      'Direkt güneş ışığı sever',
      'Aşırı sulamadan kaçının',
      'İyi drene olan toprak kullanın',
      'Kışın sulamayı azaltın',
    ],
    commonIssues: [
      'Yumuşak gövde: Aşırı sulama, çürüme başlamış',
      'Uzun boylu büyüme: Yetersiz ışık',
      'Yaprak dökümü: Normaldir, alt yapraklar solar',
    ],
  },
  'ficus': {
    name: 'Ficus (Kauçuk)',
    wateringDays: 7,
    lightNeeds: 'medium',
    humidity: 'medium',
    fertilizingWeeks: 4,
    tips: [
      'Yerini değiştirmeyin, stres olur',
      'Yaprakları toz almak için silin',
      'Hava cereyanından koruyun',
    ],
    commonIssues: [
      'Yaprak dökümü: Stres, yer değişikliği',
      'Sarı yapraklar: Düzensiz sulama',
    ],
  },
  'pothos': {
    name: 'Pothos (Scindapsus)',
    wateringDays: 7,
    lightNeeds: 'low',
    humidity: 'medium',
    fertilizingWeeks: 6,
    tips: [
      'Çok dayanıklı, başlangıç için ideal',
      'Az ışıkta bile yaşar',
      'Suda köklendirilebilir',
      'Hava temizleyici özelliği var',
    ],
    commonIssues: [
      'Sarı yapraklar: Aşırı sulama',
      'Soluk yapraklar: Gübre eksikliği',
    ],
  },
  'orchid': {
    name: 'Orkide',
    wateringDays: 10,
    lightNeeds: 'medium',
    humidity: 'high',
    fertilizingWeeks: 2,
    tips: [
      'Buz küpü ile sulama yöntemi deneyin',
      'Kökler yeşil/gümüşi olmalı',
      'Çiçek döküldükten sonra dalı kesmeyin',
      'Saydam saksı kullanın',
    ],
    commonIssues: [
      'Sarı yapraklar: Doğal döngü veya aşırı sulama',
      'Çiçek açmıyor: Sıcaklık farkı gerekli',
      'Kahverengi kökler: Çürümüş, kesin',
    ],
  },
  'cactus': {
    name: 'Kaktüs',
    wateringDays: 21,
    lightNeeds: 'high',
    humidity: 'low',
    fertilizingWeeks: 12,
    tips: [
      'Yazın haftada bir, kışın ayda bir sulayın',
      'Direkt güneş ışığı şart',
      'Kumlu, iyi drene olan toprak',
    ],
    commonIssues: [
      'Yumuşama: Aşırı sulama, kök çürümesi',
      'Uzama: Yetersiz ışık',
    ],
  },
  'peace-lily': {
    name: 'Barış Zambağı (Spathiphyllum)',
    wateringDays: 5,
    lightNeeds: 'low',
    humidity: 'high',
    fertilizingWeeks: 6,
    tips: [
      'Solunca hemen su isteyen bitkidir',
      'Çiçeği beyazdan yeşile döner, normaldir',
      'Banyo için ideal, nemi sever',
      'Hava temizleyici',
    ],
    commonIssues: [
      'Kahverengi uçlar: Düşük nem veya klor',
      'Sarı yapraklar: Aşırı güneş',
      'Çiçek açmıyor: Daha fazla ışık gerekli',
    ],
  },
  'snake-plant': {
    name: 'Yılan Bitkisi (Sansevieria)',
    wateringDays: 14,
    lightNeeds: 'low',
    humidity: 'low',
    fertilizingWeeks: 8,
    tips: [
      'Neredeyse öldürülemez!',
      'Az ışıkta bile yaşar',
      'Geceleri oksijen üretir',
      'Aşırı sulamadan kaçının',
    ],
    commonIssues: [
      'Yumuşak yapraklar: Aşırı sulama',
      'Sarı yapraklar: Kök çürümesi',
    ],
  },
};

// Pet care recommendations by species
export const PET_CARE_DATABASE: Record<string, {
  feedingTimes: number;
  walkMinutes?: number;
  groomingDays: number;
  vetCheckMonths: number;
  parasiteTreatmentDays: number;
  tips: string[];
}> = {
  'dog': {
    feedingTimes: 2,
    walkMinutes: 30,
    groomingDays: 7,
    vetCheckMonths: 12,
    parasiteTreatmentDays: 30,
    tips: [
      'Günde en az 2 kez yürüyüş yapın',
      'Taze su her zaman erişilebilir olmalı',
      'Dişlerini haftada 2-3 kez fırçalayın',
      'Tırnak kontrolü aylık yapılmalı',
    ],
  },
  'cat': {
    feedingTimes: 2,
    groomingDays: 3,
    vetCheckMonths: 12,
    parasiteTreatmentDays: 30,
    tips: [
      'Kum kabını günlük temizleyin',
      'Tırmalama direği sağlayın',
      'Günde 15-20 dakika oyun zamanı',
      'Tüy yumakları için özel mama verin',
    ],
  },
  'bird': {
    feedingTimes: 2,
    groomingDays: 30,
    vetCheckMonths: 12,
    parasiteTreatmentDays: 90,
    tips: [
      'Kafesi hava akımından uzak tutun',
      'Günlük taze meyve/sebze verin',
      'Kafes dışı uçuş zamanı sağlayın',
      'Su kabını günlük değiştirin',
    ],
  },
  'rabbit': {
    feedingTimes: 2,
    groomingDays: 3,
    vetCheckMonths: 12,
    parasiteTreatmentDays: 90,
    tips: [
      'Sınırsız kuru ot (timothy hay) olmalı',
      'Dişleri sürekli uzar, kemirme oyuncakları verin',
      'Günlük egzersiz alanı sağlayın',
      'Tırnakları 4-6 haftada kesin',
    ],
  },
  'fish': {
    feedingTimes: 1,
    groomingDays: 0,
    vetCheckMonths: 0,
    parasiteTreatmentDays: 0,
    tips: [
      'Aşırı beslemeden kaçının',
      'Haftalık %10-20 su değişimi yapın',
      'Filtre bakımını düzenli yapın',
      'Su sıcaklığını kontrol edin',
    ],
  },
};

// Baby development milestones
export const BABY_MILESTONES: Record<number, string[]> = {
  0: ['İlk gülümseme', 'Seslere tepki', 'Yüz takibi'],
  1: ['Başını kaldırma', 'Sosyal gülümseme', 'Elleri açma'],
  2: ['Agulama başlangıcı', 'Elleri birleştirme', 'Nesneleri takip'],
  3: ['Güçlü baş kontrolü', 'Kahkaha', 'Elleri keşfetme'],
  4: ['Yuvarlanma denemeleri', 'Nesnelere uzanma', 'Heceleme başlangıcı'],
  5: ['Destekle oturma', 'Nesneleri tutma', 'Aynada kendini tanıma'],
  6: ['Ek gıdaya geçiş', 'Desteksiz kısa oturma', 'Yabancı kaygısı'],
  7: ['Emekleme hazırlığı', 'Transfer (el değiştirme)', 'İsme tepki'],
  8: ['Emekleme', 'Parmakla tutma', 'Basit kelimeleri anlama'],
  9: ['Tutunarak ayağa kalkma', 'Bye-bye el sallama', 'Alkış'],
  10: ['Tutunarak yürüme', 'Anne/baba deme', 'Basit komutları anlama'],
  11: ['Birkaç adım atma', 'Kelime dağarcığı genişliyor', 'Taklit'],
  12: ['İlk adımlar', '1-3 kelime', 'Kaşıkla yeme denemesi'],
};

export function getPlantCareInfo(species: string): typeof PLANT_CARE_DATABASE[string] | null {
  const normalized = species.toLowerCase().replace(/\s+/g, '-');
  
  // Try exact match first
  if (PLANT_CARE_DATABASE[normalized]) {
    return PLANT_CARE_DATABASE[normalized];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(PLANT_CARE_DATABASE)) {
    if (normalized.includes(key) || key.includes(normalized) || 
        value.name.toLowerCase().includes(normalized)) {
      return value;
    }
  }
  
  return null;
}

export function getPetCareInfo(species: string): typeof PET_CARE_DATABASE[string] | null {
  const normalized = species.toLowerCase();
  return PET_CARE_DATABASE[normalized] || null;
}

export function getBabyMilestones(ageMonths: number): string[] {
  return BABY_MILESTONES[Math.min(ageMonths, 12)] || [];
}

// Generate smart recommendations based on nurture type and data
export async function getSmartRecommendations(
  nurture: Nurture,
  logs: LogEntry[]
): Promise<CareRecommendation[]> {
  const recommendations: CareRecommendation[] = [];
  const now = new Date();
  
  if (nurture.type === 'plant') {
    const metadata = nurture.metadata as { species?: string; location?: string; light_needs?: string };
    const plantInfo = metadata?.species ? getPlantCareInfo(metadata.species) : null;
    
    if (plantInfo) {
      // Add plant-specific recommendations
      recommendations.push({
        title: `${plantInfo.name} Bakım Rehberi`,
        description: `Bu bitki ${plantInfo.wateringDays} günde bir sulanmalı ve ${
          plantInfo.lightNeeds === 'high' ? 'bol güneş ışığı' : 
          plantInfo.lightNeeds === 'medium' ? 'dolaylı ışık' : 'az ışık'
        } almalı.`,
        icon: 'leaf',
        priority: 'info',
      });
      
      // Random tip
      const randomTip = plantInfo.tips[Math.floor(Math.random() * plantInfo.tips.length)];
      recommendations.push({
        title: '💡 İpucu',
        description: randomTip,
        icon: 'lightbulb-outline',
        priority: 'info',
      });
      
      // Check last watering
      const lastWatering = logs.find(log => 
        log.parsed_action?.toLowerCase().includes('su') ||
        log.raw_input?.toLowerCase().includes('su')
      );
      
      if (lastWatering) {
        const daysSinceWatering = Math.floor(
          (now.getTime() - new Date(lastWatering.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceWatering >= plantInfo.wateringDays) {
          recommendations.push({
            title: '💧 Sulama Zamanı!',
            description: `${nurture.name} en son ${daysSinceWatering} gün önce sulandı. Sulama vakti gelmiş olabilir!`,
            icon: 'water',
            priority: 'warning',
            action: {
              label: 'Suladım',
              type: 'log',
              data: { action: 'Suladım' },
            },
          });
        }
      }
    } else {
      recommendations.push({
        title: '🌱 Bitki Türünü Belirle',
        description: 'Bitki türünü belirtirsen sana özel bakım tavsiyeleri verebilirim!',
        icon: 'help-circle-outline',
        priority: 'info',
      });
    }
  }
  
  if (nurture.type === 'pet') {
    const metadata = nurture.metadata as { species?: string; breed?: string };
    const petInfo = metadata?.species ? getPetCareInfo(metadata.species) : null;
    
    if (petInfo) {
      recommendations.push({
        title: '🐾 Bakım Özeti',
        description: `Günde ${petInfo.feedingTimes} öğün mama${
          petInfo.walkMinutes ? `, ${petInfo.walkMinutes} dk yürüyüş` : ''
        }, ${petInfo.groomingDays} günde bir tüy bakımı.`,
        icon: 'paw',
        priority: 'info',
      });
      
      // Random tip
      const randomTip = petInfo.tips[Math.floor(Math.random() * petInfo.tips.length)];
      recommendations.push({
        title: '💡 İpucu',
        description: randomTip,
        icon: 'lightbulb-outline',
        priority: 'info',
      });
      
      // Check parasite treatment
      const lastParasite = logs.find(log => 
        log.parsed_action?.toLowerCase().includes('parazit') ||
        log.parsed_action?.toLowerCase().includes('ilaç') ||
        log.raw_input?.toLowerCase().includes('parazit')
      );
      
      if (lastParasite) {
        const daysSinceTreatment = Math.floor(
          (now.getTime() - new Date(lastParasite.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceTreatment >= petInfo.parasiteTreatmentDays - 5) {
          recommendations.push({
            title: '💊 Parazit İlacı Zamanı',
            description: `${nurture.name} için parazit ilacı zamanı yaklaşıyor veya geçmiş olabilir!`,
            icon: 'medical-bag',
            priority: 'warning',
            action: {
              label: 'Hatırlat',
              type: 'reminder',
              data: { title: `${nurture.name} parazit ilacı` },
            },
          });
        }
      }
    }
  }
  
  if (nurture.type === 'baby') {
    const metadata = nurture.metadata as { birth_date?: string; gender?: string };
    
    if (metadata?.birth_date) {
      const birthDate = new Date(metadata.birth_date);
      const ageMonths = Math.floor(
        (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      const milestones = getBabyMilestones(ageMonths);
      
      recommendations.push({
        title: `👶 ${ageMonths}. Ay Gelişim`,
        description: `Bu dönemde beklenen: ${milestones.join(', ')}`,
        icon: 'baby-face-outline',
        priority: 'info',
      });
      
      // Feeding reminder logic
      const lastFeeding = logs.find(log => 
        log.parsed_action?.toLowerCase().includes('mama') ||
        log.parsed_action?.toLowerCase().includes('emzir') ||
        log.raw_input?.toLowerCase().includes('besle')
      );
      
      if (lastFeeding) {
        const hoursSinceFeeding = Math.floor(
          (now.getTime() - new Date(lastFeeding.created_at).getTime()) / (1000 * 60 * 60)
        );
        
        // Newborns feed every 2-3 hours, older babies 3-4 hours
        const feedingInterval = ageMonths < 3 ? 3 : 4;
        
        if (hoursSinceFeeding >= feedingInterval) {
          recommendations.push({
            title: '🍼 Beslenme Zamanı',
            description: `Son beslenme ${hoursSinceFeeding} saat önce. Acıkmış olabilir!`,
            icon: 'baby-bottle-outline',
            priority: 'warning',
          });
        }
      }
      
      // Diaper reminder
      const lastDiaper = logs.find(log => 
        log.parsed_action?.toLowerCase().includes('bez') ||
        log.parsed_action?.toLowerCase().includes('alt')
      );
      
      if (lastDiaper) {
        const hoursSinceDiaper = Math.floor(
          (now.getTime() - new Date(lastDiaper.created_at).getTime()) / (1000 * 60 * 60)
        );
        
        if (hoursSinceDiaper >= 3) {
          recommendations.push({
            title: '👶 Bez Kontrolü',
            description: `Son bez değişimi ${hoursSinceDiaper} saat önce. Kontrol vakti!`,
            icon: 'baby',
            priority: hoursSinceDiaper >= 4 ? 'warning' : 'info',
          });
        }
      }
    }
  }
  
  return recommendations;
}

// ==================== VOICE COMMAND PARSING ====================

export interface VoiceCommand {
  intent: 'log' | 'reminder' | 'question' | 'unknown';
  nurtureName?: string;
  action?: string;
  time?: string;
  question?: string;
}

export async function parseVoiceCommand(
  transcript: string,
  nurtures: Nurture[]
): Promise<VoiceCommand> {
  try {
    const { data, error } = await supabase.functions.invoke('parse-voice-command', {
      body: {
        text: transcript,
        nurtures: nurtures.map(n => ({ id: n.id, name: n.name, type: n.type })),
      },
    });

    if (error) throw error;

    return data.data as VoiceCommand;
  } catch (error) {
    console.error('Voice command parse error:', error);
    
    // Basic fallback parsing
    const lowerText = transcript.toLowerCase();
    
    // Check for reminder intent
    if (lowerText.includes('hatırlat') || lowerText.includes('sonra')) {
      return {
        intent: 'reminder',
        action: transcript,
      };
    }
    
    // Check for question
    if (lowerText.includes('?') || lowerText.includes('nasıl') || lowerText.includes('neden')) {
      return {
        intent: 'question',
        question: transcript,
      };
    }
    
    // Default to log
    return {
      intent: 'log',
      action: transcript,
    };
  }
}

// ==================== AI CHAT FOR NURTURES ====================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export async function chatWithAI(
  message: string,
  nurture: Nurture,
  logs: LogEntry[],
  chatHistory: ChatMessage[]
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('chat-assistant', {
      body: {
        message,
        nurture: {
          name: nurture.name,
          type: nurture.type,
          metadata: nurture.metadata,
        },
        recentLogs: logs.slice(0, 10).map(log => ({
          created_at: log.created_at,
          action: log.parsed_action,
          notes: log.parsed_notes,
        })),
        chatHistory: chatHistory.slice(-5), // Last 5 messages for context
      },
    });

    if (error) throw error;

    return data.response || 'I can\'t respond right now, please try again later.';
  } catch (error) {
    console.error('Chat error:', error);
    
    // Provide helpful fallback responses based on nurture type
    return getFallbackResponse(nurture.type, message);
  }
}

function getFallbackResponse(type: NurtureType, message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (type === 'plant') {
    if (lowerMessage.includes('water')) {
      return 'General watering rule: Wait until the top 2-3 cm of soil is dry. Overwatering is more harmful than underwatering! 💧';
    }
    if (lowerMessage.includes('yellow') || lowerMessage.includes('leaf') || lowerMessage.includes('leaves')) {
      return 'Yellow leaves are usually caused by overwatering or insufficient light. Check your watering frequency and plant location. 🌿';
    }
    return 'What can I help you with for your plant? Feel free to ask about watering, light, or general care! 🌱';
  }
  
  if (type === 'pet') {
    if (lowerMessage.includes('food') || lowerMessage.includes('feed') || lowerMessage.includes('eat')) {
      return 'For healthy nutrition, choosing age-appropriate food is important. Consult your vet to determine the best diet! 🦴';
    }
    if (lowerMessage.includes('sick') || lowerMessage.includes('not well') || lowerMessage.includes('ill')) {
      return 'If you notice signs of illness in your pet, I recommend taking them to the vet as soon as possible. Get well soon! 🏥';
    }
    return 'What can I help you with for your pet? Feel free to ask about feeding, health, or care! 🐾';
  }
  
  if (type === 'baby') {
    if (lowerMessage.includes('sleep') || lowerMessage.includes('sleeping')) {
      return 'Sleep patterns in babies take time to establish. A dark room, white noise, and a consistent bedtime routine can help. 😴';
    }
    if (lowerMessage.includes('cry') || lowerMessage.includes('crying')) {
      return 'Babies cry due to hunger, diaper change needs, tiredness, or discomfort. Try checking these one by one. 👶';
    }
    return 'What can I help you with for your baby? Feel free to ask about sleep, feeding, or development! 💕';
  }
  
  return 'I didn\'t quite understand that. Could you provide a bit more detail?';
}

