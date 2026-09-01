import { useEffect, useRef, useCallback } from 'react';

export type KeyCombo = string;

export interface HotkeyOptions {
  /** Enable hotkey even when user is typing inside an input/textarea/contenteditable */
  enableOnInputs?: boolean;
  /** Automatically call e.preventDefault() */
  preventDefault?: boolean;
  /** Automatically call e.stopPropagation() */
  stopPropagation?: boolean;
  /** Only trigger when the component is enabled/visible */
  enabled?: boolean;
  /** Description for display in the keyboard shortcuts cheatsheet */
  description?: string;
  /** Category group for the shortcut cheatsheet */
  category?: 'Navigation' | 'Task Creation' | 'Task Actions' | 'Lists & Views' | 'General';
}

export interface HotkeyDefinition extends HotkeyOptions {
  keys: KeyCombo | KeyCombo[];
  callback: (e: KeyboardEvent) => void;
}

/**
 * Normalizes a key combo string into lowercased tokens.
 * E.g. "Ctrl+Shift+N" -> { ctrl: true, shift: true, alt: false, meta: false, key: 'n' }
 */
export function parseKeyCombo(combo: string) {
  const parts = combo.toLowerCase().split('+').map((p) => p.trim());
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  let ctrl = false;
  let shift = false;
  let alt = false;
  let meta = false;
  let key = '';

  for (const part of parts) {
    if (part === 'ctrl' || part === 'control') {
      ctrl = true;
    } else if (part === 'cmd' || part === 'command' || part === 'meta') {
      meta = true;
    } else if (part === 'mod') {
      // 'mod' is Cmd on macOS, Ctrl on Windows/Linux
      if (isMac) {
        meta = true;
      } else {
        ctrl = true;
      }
    } else if (part === 'alt' || part === 'option') {
      alt = true;
    } else if (part === 'shift') {
      shift = true;
    } else {
      key = part;
    }
  }

  return { ctrl, shift, alt, meta, key };
}

/**
 * Checks if the event target is an interactive text input
 */
export function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input') {
    const type = (target as HTMLInputElement).type.toLowerCase();
    // Exclude button/checkbox/radio types if desired
    return !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color'].includes(type);
  }
  if (tagName === 'textarea' || tagName === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Matches an active KeyboardEvent against a parsed key combo
 */
export function matchesHotkey(event: KeyboardEvent, combo: string): boolean {
  const parsed = parseKeyCombo(combo);
  const eventKey = event.key.toLowerCase();

  // Check modifiers
  if (parsed.ctrl !== event.ctrlKey) return false;
  if (parsed.alt !== event.altKey) return false;
  if (parsed.shift !== event.shiftKey) {
    // Special case for characters that require Shift (e.g. '?', '!', '@')
    if (parsed.key === '?' && event.key === '?') {
      // Allow '?' matching even if shiftKey is pressed
    } else {
      return false;
    }
  }
  if (parsed.meta !== event.metaKey) return false;

  // Match key name
  if (parsed.key === 'escape' || parsed.key === 'esc') {
    return eventKey === 'escape';
  }
  if (parsed.key === 'enter' || parsed.key === 'return') {
    return eventKey === 'enter';
  }
  if (parsed.key === 'space' || parsed.key === 'spacebar') {
    return eventKey === ' ' || eventKey === 'spacebar';
  }
  if (parsed.key === 'tab') {
    return eventKey === 'tab';
  }
  if (parsed.key === 'delete' || parsed.key === 'del') {
    return eventKey === 'delete';
  }
  if (parsed.key === 'backspace') {
    return eventKey === 'backspace';
  }
  if (parsed.key === 'arrowup' || parsed.key === 'up') {
    return eventKey === 'arrowup';
  }
  if (parsed.key === 'arrowdown' || parsed.key === 'down') {
    return eventKey === 'arrowdown';
  }
  if (parsed.key === 'arrowleft' || parsed.key === 'left') {
    return eventKey === 'arrowleft';
  }
  if (parsed.key === 'arrowright' || parsed.key === 'right') {
    return eventKey === 'arrowright';
  }
  if (parsed.key === 'slash' || parsed.key === '/') {
    return eventKey === '/';
  }
  if (parsed.key === 'question' || parsed.key === '?') {
    return event.key === '?';
  }
  if (parsed.key === '[' || parsed.key === 'bracketleft') {
    return eventKey === '[';
  }
  if (parsed.key === ']' || parsed.key === 'bracketright') {
    return eventKey === ']';
  }

  return eventKey === parsed.key;
}

/**
 * useHotkeys hook to bind global or scoped key shortcuts
 *
 * Examples:
 *   useHotkeys('mod+b', () => toggleSidebar(), { description: 'Toggle Sidebar' });
 *   useHotkeys(['ctrl+k', 'mod+k'], () => focusSearch(), { enableOnInputs: true });
 *   useHotkeys('n', () => focusQuickAdd(), { description: 'New Task' });
 */
export function useHotkeys(
  keys: KeyCombo | KeyCombo[],
  callback: (e: KeyboardEvent) => void,
  options: HotkeyOptions = {}
) {
  const {
    enableOnInputs = false,
    preventDefault = true,
    stopPropagation = false,
    enabled = true,
  } = options;

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const combos = Array.isArray(keys) ? keys : [keys];

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check input element restriction
      if (!enableOnInputs && isInputElement(event.target)) {
        return;
      }

      for (const combo of combos) {
        if (matchesHotkey(event, combo)) {
          if (preventDefault) {
            event.preventDefault();
          }
          if (stopPropagation) {
            event.stopPropagation();
          }
          callbackRef.current(event);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keys, enableOnInputs, preventDefault, stopPropagation, enabled]);
}

/**
 * useKeySequence hook to handle two-step shortcuts (e.g. "g" then "d" for Go to My Day)
 */
export function useKeySequence(
  sequence: [string, string],
  callback: () => void,
  options: { timeoutMs?: number; enabled?: boolean } = {}
) {
  const { timeoutMs = 1000, enabled = true } = options;
  const firstKeyTimeRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const [firstKey, secondKey] = sequence.map((k) => k.toLowerCase());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInputElement(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();
      const now = Date.now();

      if (key === firstKey) {
        firstKeyTimeRef.current = now;
      } else if (key === secondKey && now - firstKeyTimeRef.current < timeoutMs) {
        event.preventDefault();
        firstKeyTimeRef.current = 0;
        callbackRef.current();
      } else {
        firstKeyTimeRef.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sequence, timeoutMs, enabled]);
}
