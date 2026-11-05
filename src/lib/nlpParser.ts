import { MemoryCategory } from '../types';

export interface ParseResult {
  title: string;
  category: MemoryCategory;
  detectedDate?: Date | null;
  dateConfidence?: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
  hasTime?: boolean;
}

export function parseNaturalLanguageInput(rawInput: string): ParseResult {
  const input = rawInput.trim();
  const lower = input.toLowerCase();

  let category: MemoryCategory = 'general';
  let detectedDate: Date | null = null;
  let dateConfidence: 'high' | 'medium' | 'low' = 'low';
  let metadata: Record<string, any> = {};
  let hasTime = false;

  // 1. Detect Category by keyword patterns
  if (lower.startsWith('buy ') || lower.includes('grocery') || lower.includes('shopping list') || lower.includes('supermarket')) {
    category = 'shopping';
  } else if (lower.startsWith('read ') || lower.includes('library book') || lower.includes('return book') || lower.includes('return my library') || lower.includes('borrowed')) {
    category = 'book';
  } else if (lower.startsWith('gift ') || lower.includes('gift idea') || lower.includes('present for')) {
    category = 'gift';
  } else if (lower.startsWith('visit ') || lower.includes('trip to') || lower.includes('place to visit') || lower.includes('travel to')) {
    category = 'place';
  } else if (lower.startsWith('http://') || lower.startsWith('https://') || lower.includes('www.') || lower.includes('.com') || lower.includes('.org') || lower.includes('.io') || lower.includes('save this website') || lower.includes('save link')) {
    category = 'link';
  } else if (lower.startsWith('idea:') || lower.startsWith('thought:') || lower.includes('app idea') || lower.includes('brainstorm') || lower.includes('write down an idea') || lower.includes('idea')) {
    category = 'idea';
  } else if (lower.startsWith('remind me to') || lower.includes('birthday') || lower.includes('appointment') || lower.includes('meeting') || lower.includes('deadline') || lower.includes('call my friend') || lower.includes('pay the electricity bill') || lower.includes('pay ')) {
    category = 'reminder';
  } else if (lower.startsWith('todo:') || lower.startsWith('task:') || lower.includes('finish ') || lower.includes('complete ')) {
    category = 'task';
  }

  // 2. Extract potential URL if category is link
  if (category === 'link' || lower.includes('http://') || lower.includes('https://') || lower.includes('www.')) {
    const urlMatch = input.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
    if (urlMatch) {
      metadata.url = urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`;
    }
  }

  // 3. Extract gift recipient if category is gift
  if (category === 'gift') {
    const giftMatch = input.match(/(?:for\s+)(?:my\s+)?([a-zA-Z]+)(?::|\s+-|\s+is|\s+idea)?/i);
    if (giftMatch && giftMatch[1]) {
      metadata.recipient = giftMatch[1];
    }
  }

  // 4. Extract library book details
  if (category === 'book') {
    metadata.returned = false;
  }

  // 5. Check for explicit time e.g. "at 6 PM", "at 6:30 am", "6pm", "18:00"
  const timeRegex = /(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|(?:\bat\s+)(\d{1,2}):(\d{2})/i;
  const timeMatch = input.match(timeRegex);
  let targetHour = 10;
  let targetMinute = 0;

  if (timeMatch) {
    hasTime = true;
    if (timeMatch[3]) {
      // am/pm pattern
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3].toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      targetHour = h;
      targetMinute = m;
    } else if (timeMatch[4]) {
      targetHour = parseInt(timeMatch[4], 10);
      targetMinute = parseInt(timeMatch[5], 10);
    }
  }

  // 6. Natural Date Detection (Relative & Fixed)
  const now = new Date();
  
  if (lower.includes('today')) {
    const d = new Date(now);
    d.setHours(hasTime ? targetHour : 18, hasTime ? targetMinute : 0, 0, 0);
    detectedDate = d;
    dateConfidence = 'high';
  } else if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(hasTime ? targetHour : 12, hasTime ? targetMinute : 0, 0, 0);
    detectedDate = d;
    dateConfidence = 'high';
  } else if (lower.includes('day after tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    d.setHours(hasTime ? targetHour : 12, hasTime ? targetMinute : 0, 0, 0);
    detectedDate = d;
    dateConfidence = 'high';
  } else if (lower.includes('this weekend')) {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (6 - day + 7) % 7 || 7; // coming Saturday
    d.setDate(d.getDate() + diff);
    d.setHours(hasTime ? targetHour : 10, hasTime ? targetMinute : 0, 0, 0);
    detectedDate = d;
    dateConfidence = 'medium';
  } else if (lower.includes('next week') || lower.includes('next monday') || lower.includes('monday')) {
    const d = new Date(now);
    if (lower.includes('next monday') || lower.includes('monday')) {
      const day = d.getDay();
      const diff = (1 - day + 7) % 7 || 7; // next Monday
      d.setDate(d.getDate() + diff);
    } else {
      d.setDate(d.getDate() + 7);
    }
    d.setHours(hasTime ? targetHour : 9, hasTime ? targetMinute : 0, 0, 0);
    detectedDate = d;
    dateConfidence = 'medium';
  } else if (lower.includes('next tuesday') || lower.includes('tuesday')) {
    const d = new Date(now);
    const diff = (2 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(hasTime ? targetHour : 9, hasTime ? targetMinute : 0, 0, 0);
    detectedDate = d;
    dateConfidence = 'medium';
  } else if (lower.includes('next friday') || lower.includes('friday')) {
    const d = new Date(now);
    const diff = (5 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(hasTime ? targetHour : 9, hasTime ? targetMinute : 0, 0, 0);
    detectedDate = d;
    dateConfidence = 'medium';
  } else {
    // Check specific month day: e.g. "November 5", "Nov 5", "5th November", "2026-11-05"
    const monthRegex = /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
    const matchMonth = input.match(monthRegex);
    if (matchMonth) {
      const monthStr = matchMonth[1];
      const dayNum = parseInt(matchMonth[2], 10);
      const year = now.getFullYear();
      const parsed = new Date(`${monthStr} ${dayNum}, ${year} ${hasTime ? targetHour : 10}:${hasTime ? targetMinute : '00'}:00`);
      if (!isNaN(parsed.getTime())) {
        if (parsed.getTime() < now.getTime() - 86400000 * 30) {
          parsed.setFullYear(year + 1);
        }
        detectedDate = parsed;
        dateConfidence = 'high';
      }
    } else if (hasTime) {
      // Just a time specified like "Call my friend at 6 PM" -> assume today if future, else tomorrow
      const d = new Date(now);
      d.setHours(targetHour, targetMinute, 0, 0);
      if (d.getTime() < now.getTime()) {
        d.setDate(d.getDate() + 1); // tomorrow at that time
      }
      detectedDate = d;
      dateConfidence = 'medium';
    }
  }

  return {
    title: input,
    category,
    detectedDate,
    dateConfidence,
    metadata,
    hasTime
  };
}
