// Bloomie - Upcoming Tasks Service (AI-extracted tasks from logs)

import { supabase } from './supabase';
import type { Nurture, LogEntry, Reminder } from '../types';
import { getPlantCareInfo, getPetCareInfo } from './ai-assistant';

export interface UpcomingTask {
  id: string;
  nurtureId: string;
  nurtureName: string;
  task: string;
  scheduledTime: string; // ISO string
  timeDisplay: string; // "16:00" format
  urgency: 'low' | 'medium' | 'high';
  icon: string;
  type: 'feeding' | 'watering' | 'walk' | 'medicine' | 'grooming' | 'other';
}

/**
 * Get upcoming tasks based on logs and AI analysis
 */
export async function getUpcomingTasks(
  nurtures: Nurture[],
  recentLogs: LogEntry[],
  reminders: Reminder[]
): Promise<UpcomingTask[]> {
  const tasks: UpcomingTask[] = [];
  const now = new Date();

  // Add reminders as tasks
  reminders
    .filter(r => !r.is_completed && new Date(r.scheduled_at) > now)
    .slice(0, 5)
    .forEach(reminder => {
      const nurture = nurtures.find(n => n.id === reminder.nurture_id);
      if (nurture) {
        const scheduledTime = new Date(reminder.scheduled_at);
        tasks.push({
          id: reminder.id,
          nurtureId: nurture.id,
          nurtureName: nurture.name,
          task: reminder.title,
          scheduledTime: reminder.scheduled_at,
          timeDisplay: scheduledTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          urgency: scheduledTime.getTime() - now.getTime() < 2 * 60 * 60 * 1000 ? 'high' : 'medium',
          icon: getTaskIcon(reminder.title, nurture.type),
          type: getTaskType(reminder.title, nurture.type),
        });
      }
    });

  // Analyze logs to predict upcoming tasks
  for (const nurture of nurtures) {
    const nurtureLogs = recentLogs.filter(log => log.nurture_id === nurture.id);
    const metadata = nurture.metadata as any;

    if (nurture.type === 'plant') {
      const plantInfo = metadata?.species ? getPlantCareInfo(metadata.species) : null;
      if (plantInfo) {
        // Find last watering
        const lastWatering = nurtureLogs.find(log => 
          log.parsed_action?.toLowerCase().includes('su') ||
          log.parsed_action?.toLowerCase().includes('sula') ||
          log.raw_input?.toLowerCase().includes('su')
        );

        let nextWateringTime: Date;
        if (lastWatering) {
          const lastWateringDate = new Date(lastWatering.created_at);
          nextWateringTime = new Date(lastWateringDate.getTime() + plantInfo.wateringDays * 24 * 60 * 60 * 1000);
        } else {
          // If never watered, suggest watering today
          nextWateringTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
        }

        if (nextWateringTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
          tasks.push({
            id: `watering-${nurture.id}`,
            nurtureId: nurture.id,
            nurtureName: nurture.name,
            task: `${nurture.name}'i sula`,
            scheduledTime: nextWateringTime.toISOString(),
            timeDisplay: nextWateringTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            urgency: nextWateringTime <= now ? 'high' : 'medium',
            icon: 'water',
            type: 'watering',
          });
        }
      }
    }

    if (nurture.type === 'pet') {
      const petInfo = metadata?.species ? getPetCareInfo(metadata.species) : null;
      if (petInfo) {
        // Find last feeding
        const lastFeeding = nurtureLogs.find(log => 
          log.parsed_action?.toLowerCase().includes('mama') ||
          log.parsed_action?.toLowerCase().includes('besle') ||
          log.raw_input?.toLowerCase().includes('mama')
        );

        if (lastFeeding) {
          const lastFeedingDate = new Date(lastFeeding.created_at);
          const hoursSinceFeeding = (now.getTime() - lastFeedingDate.getTime()) / (1000 * 60 * 60);
          const feedingInterval = 10; // Default 10 hours for pets

          if (hoursSinceFeeding >= feedingInterval - 2) {
            const nextFeedingTime = new Date(lastFeedingDate.getTime() + feedingInterval * 60 * 60 * 1000);
            tasks.push({
              id: `feeding-${nurture.id}`,
              nurtureId: nurture.id,
              nurtureName: nurture.name,
              task: `${nurture.name}'a mama ver`,
              scheduledTime: nextFeedingTime.toISOString(),
              timeDisplay: nextFeedingTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
              urgency: hoursSinceFeeding >= feedingInterval ? 'high' : 'medium',
              icon: 'food-drumstick',
              type: 'feeding',
            });
          }
        }

        // Walk reminder for dogs
        if (petInfo.walkMinutes && metadata?.species === 'dog') {
          const lastWalk = nurtureLogs.find(log => 
            log.parsed_action?.toLowerCase().includes('gez') ||
            log.parsed_action?.toLowerCase().includes('yürü')
          );

          if (lastWalk) {
            const lastWalkDate = new Date(lastWalk.created_at);
            const hoursSinceWalk = (now.getTime() - lastWalkDate.getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceWalk >= 6) {
              const nextWalkTime = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now
              tasks.push({
                id: `walk-${nurture.id}`,
                nurtureId: nurture.id,
                nurtureName: nurture.name,
                task: `${nurture.name}'u gezdir`,
                scheduledTime: nextWalkTime.toISOString(),
                timeDisplay: nextWalkTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                urgency: hoursSinceWalk >= 12 ? 'high' : 'medium',
                icon: 'walk',
                type: 'walk',
              });
            }
          }
        }
      }
    }

    if (nurture.type === 'baby') {
      // Find last feeding
      const lastFeeding = nurtureLogs.find(log => 
        log.parsed_action?.toLowerCase().includes('mama') ||
        log.parsed_action?.toLowerCase().includes('emzir') ||
        log.parsed_action?.toLowerCase().includes('besle')
      );

      if (lastFeeding) {
        const lastFeedingDate = new Date(lastFeeding.created_at);
        const hoursSinceFeeding = (now.getTime() - lastFeedingDate.getTime()) / (1000 * 60 * 60);
        const feedingInterval = 3; // 3 hours for babies

        if (hoursSinceFeeding >= feedingInterval - 0.5) {
          const nextFeedingTime = new Date(lastFeedingDate.getTime() + feedingInterval * 60 * 60 * 1000);
          tasks.push({
            id: `feeding-${nurture.id}`,
            nurtureId: nurture.id,
            nurtureName: nurture.name,
            task: `${nurture.name}'i besle`,
            scheduledTime: nextFeedingTime.toISOString(),
            timeDisplay: nextFeedingTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            urgency: hoursSinceFeeding >= feedingInterval ? 'high' : 'medium',
            icon: 'baby-bottle-outline',
            type: 'feeding',
          });
        }
      }
    }
  }

  // Sort by time and return top 3
  return tasks
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
    .slice(0, 3);
}

function getTaskIcon(taskTitle: string, nurtureType: string): string {
  const lower = taskTitle.toLowerCase();
  if (lower.includes('su') || lower.includes('sula')) return 'water';
  if (lower.includes('mama') || lower.includes('besle')) return 'food-drumstick';
  if (lower.includes('gez') || lower.includes('yürü')) return 'walk';
  if (lower.includes('ilaç') || lower.includes('aşı')) return 'medical-bag';
  if (lower.includes('tüy') || lower.includes('banyo')) return 'content-cut';
  if (nurtureType === 'baby') return 'baby-bottle-outline';
  return 'bell-outline';
}

function getTaskType(taskTitle: string, nurtureType: string): UpcomingTask['type'] {
  const lower = taskTitle.toLowerCase();
  if (lower.includes('su') || lower.includes('sula')) return 'watering';
  if (lower.includes('mama') || lower.includes('besle')) return 'feeding';
  if (lower.includes('gez') || lower.includes('yürü')) return 'walk';
  if (lower.includes('ilaç') || lower.includes('aşı')) return 'medicine';
  if (lower.includes('tüy') || lower.includes('banyo')) return 'grooming';
  return 'other';
}

