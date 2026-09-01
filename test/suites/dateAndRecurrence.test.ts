import { createSuite, expect } from '../framework';
import {
  isToday,
  isTomorrow,
  isPast,
  formatDueDate,
  formatReminder,
  getTodayISO,
  getTomorrowISO,
  getNextWeekISO,
} from '../../src/utils/dateUtils';
import { formatDuration, formatTimerTime, calculateHours } from '../../src/utils/timeUtils';

export const dateAndRecurrenceSuite = createSuite(
  'Date, Time & Recurrence Engine',
  'utils',
  'Verifies date boundary checks (Today, Tomorrow, Past/Overdue), ISO generators, and stopwatch time formatting',
  (suite) => {
    suite.it('should correctly identify today, tomorrow, and past dates', () => {
      const now = new Date();
      const todayISO = now.toISOString();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);
      const pastISO = yesterday.toISOString();

      expect(isToday(todayISO)).toBe(true);
      expect(isToday(tomorrowISO)).toBe(false);
      expect(isTomorrow(tomorrowISO)).toBe(true);
      expect(isPast(pastISO)).toBe(true);
      expect(isPast(tomorrowISO)).toBe(false);
    });

    suite.it('should format due dates with appropriate badges and overdue detection', () => {
      const today = new Date().toISOString();
      const todayFormat = formatDueDate(today);
      expect(todayFormat.isDueToday).toBe(true);
      expect(todayFormat.isOverdue).toBe(false);
      expect(todayFormat.text).toBe('Today');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowFormat = formatDueDate(tomorrow.toISOString());
      expect(tomorrowFormat.text).toBe('Tomorrow');
      expect(tomorrowFormat.isOverdue).toBe(false);

      const past = new Date('2020-01-01T00:00:00.000Z');
      const pastFormat = formatDueDate(past.toISOString());
      expect(pastFormat.isOverdue).toBe(true);
      expect(pastFormat.text).toContain('Overdue');
    });

    suite.it('should generate valid end-of-day ISO timestamps for quick scheduling presets', () => {
      const todayIso = getTodayISO();
      const tomorrowIso = getTomorrowISO();
      const nextWeekIso = getNextWeekISO();

      expect(todayIso).toBeDefined();
      expect(tomorrowIso).toBeDefined();
      expect(nextWeekIso).toBeDefined();

      const todayDate = new Date(todayIso);
      expect(todayDate.getHours()).toBe(23);
      expect(todayDate.getMinutes()).toBe(59);
    });

    suite.it('should format stopwatch duration into human-readable shorthand and digital timer display', () => {
      // Shorthand compact formatting
      expect(formatDuration(0, true)).toBe('0s');
      expect(formatDuration(45, true)).toBe('45s');
      expect(formatDuration(120, true)).toBe('2m');
      expect(formatDuration(3665, true)).toBe('1h 1m');

      // Digital MM:SS or HH:MM:SS formatting
      expect(formatDuration(0)).toBe('00:00');
      expect(formatTimerTime(0)).toBe('00:00');
      expect(formatTimerTime(65)).toBe('01:05');
      expect(formatTimerTime(3600)).toBe('01:00:00');
      expect(formatTimerTime(3665)).toBe('01:01:05');

      // Fractional hours for time tracking calculations
      expect(calculateHours(3600)).toBe(1);
      expect(calculateHours(1800)).toBe(0.5);
    });

    suite.it('should format reminders with appropriate temporal prefixes', () => {
      const now = new Date();
      now.setHours(14, 30, 0, 0);
      const formatted = formatReminder(now.toISOString());
      expect(formatted).toContain('Today at');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const tomorrowFormatted = formatReminder(tomorrow.toISOString());
      expect(tomorrowFormatted).toContain('Tomorrow at');
    });
  }
);
