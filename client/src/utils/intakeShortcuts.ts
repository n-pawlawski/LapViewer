export type IntakeShortcutAction =
  | "playPause"
  | "frameBack"
  | "frameForward"
  | "jumpBack"
  | "jumpForward"
  | "seekBack5"
  | "seekForward5"
  | "seekBack15"
  | "seekForward15"
  | "addLap"
  | "addSplit"
  | "removeMarker";

export interface IntakeShortcutModifiers {
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
}

export interface IntakeShortcutBinding {
  key: string;
  modifiers?: IntakeShortcutModifiers;
}

export type IntakeShortcutMap = Record<IntakeShortcutAction, IntakeShortcutBinding>;

const STORAGE_KEY = "lapviewer-intake-shortcuts";

export const INTAKE_SHORTCUT_LABELS: Record<IntakeShortcutAction, string> = {
  playPause: "Play / pause",
  frameBack: "Previous frame",
  frameForward: "Next frame",
  jumpBack: "Jump to previous marker or start",
  jumpForward: "Jump to next marker or end",
  seekBack5: "Seek back 5 seconds",
  seekForward5: "Seek forward 5 seconds",
  seekBack15: "Seek back 15 seconds",
  seekForward15: "Seek forward 15 seconds",
  addLap: "Add / adjust lap marker",
  addSplit: "Add / adjust split marker",
  removeMarker: "Remove selected or nearby marker",
};

export const DEFAULT_INTAKE_SHORTCUTS: IntakeShortcutMap = {
  playPause: { key: "Space" },
  frameBack: { key: "ArrowLeft" },
  frameForward: { key: "ArrowRight" },
  jumpBack: { key: "ArrowLeft", modifiers: { shift: true } },
  jumpForward: { key: "ArrowRight", modifiers: { shift: true } },
  seekBack5: { key: "[" },
  seekForward5: { key: "]" },
  seekBack15: { key: "[", modifiers: { shift: true } },
  seekForward15: { key: "]", modifiers: { shift: true } },
  addLap: { key: "m" },
  addSplit: { key: "s" },
  removeMarker: { key: "Delete" },
};

const KEY_LABELS: Record<string, string> = {
  Space: "Space",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  "[": "[",
  "]": "]",
  ",": ",",
  ".": ".",
  Delete: "Del",
  Backspace: "Backspace",
};

export function formatKeyLabel(key: string): string {
  return KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}

export function formatShortcutBinding(binding: IntakeShortcutBinding): string {
  const parts: string[] = [];
  if (binding.modifiers?.ctrl) parts.push("Ctrl");
  if (binding.modifiers?.alt) parts.push("Alt");
  if (binding.modifiers?.shift) parts.push("Shift");
  parts.push(formatKeyLabel(binding.key));
  return parts.join(" + ");
}

function normalizeKey(key: string): string {
  if (key === " ") return "Space";
  if (key.length === 1) return key.toLowerCase();
  return key;
}

function bindingKey(binding: IntakeShortcutBinding): string {
  const mods = binding.modifiers ?? {};
  return [
    mods.ctrl ? "1" : "0",
    mods.alt ? "1" : "0",
    mods.shift ? "1" : "0",
    normalizeKey(binding.key),
  ].join("|");
}

export function loadIntakeShortcuts(): IntakeShortcutMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INTAKE_SHORTCUTS };
    const parsed = JSON.parse(raw) as Partial<IntakeShortcutMap>;
    return { ...DEFAULT_INTAKE_SHORTCUTS, ...parsed };
  } catch {
    return { ...DEFAULT_INTAKE_SHORTCUTS };
  }
}

export function saveIntakeShortcuts(shortcuts: IntakeShortcutMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
}

export function resetIntakeShortcuts(): IntakeShortcutMap {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_INTAKE_SHORTCUTS };
}

export function findShortcutConflicts(shortcuts: IntakeShortcutMap): string[] {
  const seen = new Map<string, IntakeShortcutAction>();
  const conflicts: string[] = [];
  for (const [action, binding] of Object.entries(shortcuts) as [IntakeShortcutAction, IntakeShortcutBinding][]) {
    const key = bindingKey(binding);
    const existing = seen.get(key);
    if (existing) {
      conflicts.push(`${formatShortcutBinding(binding)} is used by both ${INTAKE_SHORTCUT_LABELS[existing]} and ${INTAKE_SHORTCUT_LABELS[action]}`);
    } else {
      seen.set(key, action);
    }
  }
  return conflicts;
}

export function eventMatchesBinding(
  event: KeyboardEvent,
  binding: IntakeShortcutBinding,
): boolean {
  const mods = binding.modifiers ?? {};
  if (!!mods.shift !== event.shiftKey) return false;
  if (!!mods.ctrl !== event.ctrlKey) return false;
  if (!!mods.alt !== event.altKey) return false;

  const targetKey = normalizeKey(binding.key);
  const eventKey = normalizeKey(event.key);
  const eventCode = event.code;

  if (targetKey === "space") {
    return eventCode === "Space" || eventKey === "space";
  }

  if (binding.key.startsWith("Arrow")) {
    return eventCode === binding.key || event.key === binding.key;
  }

  if (normalizeKey(binding.key) === "delete") {
    return eventKey === "delete" || eventCode === "Delete";
  }

  return eventKey === targetKey || eventCode === binding.key;
}

export function bindingFromKeyboardEvent(event: KeyboardEvent): IntakeShortcutBinding | null {
  if (event.key === "Escape" || event.key === "Tab") return null;
  if (event.ctrlKey && (event.key === "c" || event.key === "v" || event.key === "x")) return null;

  const modifiers: IntakeShortcutModifiers = {};
  if (event.shiftKey) modifiers.shift = true;
  if (event.ctrlKey) modifiers.ctrl = true;
  if (event.altKey) modifiers.alt = true;

  let key = event.key;
  if (key === " ") key = "Space";
  if (key === "Control" || key === "Shift" || key === "Alt" || key === "Meta") return null;
  if (key.length > 1 && !key.startsWith("Arrow") && key !== "Space") {
    key = event.code.startsWith("Key") ? event.code.slice(3).toLowerCase() : event.code;
  }

  return { key, modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined };
}

export function findActionForEvent(
  event: KeyboardEvent,
  shortcuts: IntakeShortcutMap,
): IntakeShortcutAction | null {
  for (const [action, binding] of Object.entries(shortcuts) as [IntakeShortcutAction, IntakeShortcutBinding][]) {
    if (eventMatchesBinding(event, binding)) return action;
  }
  return null;
}
