/**
 * Date formatting and calculation helpers
 */

export function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function isTomorrow(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear()
  );
}

export function isPast(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  // If only date or time is earlier than start of today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return dDate < todayStart;
}

export function formatDueDate(dateStr: string | null): { text: string; isOverdue: boolean; isDueToday: boolean } {
  if (!dateStr) return { text: '', isOverdue: false, isDueToday: false };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { text: '', isOverdue: false, isDueToday: false };

  const overdue = isPast(dateStr);
  const today = isToday(dateStr);
  const tomorrow = isTomorrow(dateStr);

  if (today) {
    return { text: 'Today', isOverdue: false, isDueToday: true };
  }
  if (tomorrow) {
    return { text: 'Tomorrow', isOverdue: false, isDueToday: false };
  }
  if (overdue) {
    return {
      text: `Overdue, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      isOverdue: true,
      isDueToday: false,
    };
  }

  // Future
  const daysDiff = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 6) {
    return {
      text: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      isOverdue: false,
      isDueToday: false,
    };
  }

  return {
    text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }),
    isOverdue: false,
    isDueToday: false,
  };
}

export function formatReminder(reminderStr: string | null): string {
  if (!reminderStr) return '';
  const d = new Date(reminderStr);
  if (isNaN(d.getTime())) return '';

  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (isToday(reminderStr)) {
    return `Today at ${timePart}`;
  }
  if (isTomorrow(reminderStr)) {
    return `Tomorrow at ${timePart}`;
  }
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timePart}`;
}

export function getTodayDateString(): string {
  const d = new Date();
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function getTodayISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function getTomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function getNextWeekISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function getLaterTodayReminderISO(): string {
  const d = new Date();
  d.setHours(17, 0, 0, 0); // 5:00 PM
  if (d.getTime() < Date.now()) {
    d.setHours(d.getHours() + 3);
  }
  return d.toISOString();
}

export function getTomorrowMorningReminderISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0); // 9:00 AM
  return d.toISOString();
}
