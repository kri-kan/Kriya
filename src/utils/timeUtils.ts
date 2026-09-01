/**
 * Format duration in seconds into a clean human-readable string:
 * e.g., 00:45:12, or "1h 30m", or "45m 12s"
 */
export function formatDuration(seconds: number, compact: boolean = false): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);

  if (compact) {
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Format duration into "X hours, Y minutes, Z seconds" for CSV export or detailed reports
 */
export function formatDurationDetailed(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);

  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * Format duration in seconds into digital stopwatch MM:SS or HH:MM:SS
 */
export function formatTimerTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Calculate decimal hours from seconds (e.g. 3600 -> 1.0, 1800 -> 0.5)
 */
export function calculateHours(seconds: number): number {
  if (isNaN(seconds) || seconds <= 0) return 0;
  return Number((seconds / 3600).toFixed(2));
}

/**
 * Convert ISO string to HTML datetime-local input format (YYYY-MM-DDTHH:mm)
 */
export function toDateTimeLocal(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert HTML datetime-local input value (YYYY-MM-DDTHH:mm) to ISO-8601 string
 */
export function fromDateTimeLocal(localStr: string): string | null {
  if (!localStr) return null;
  const d = new Date(localStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Subtle audio feedback using Web Audio API
 */
export function playTone(type: 'complete' | 'click' | 'star') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'complete') {
      // Pleasant double chime (Microsoft To Do style)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'star') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // C6
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch {
    // Ignore audio autoplay restrictions
  }
}
