import type { BrowserState, ShortcutInfo } from '../../shared/types';
import { isMac, platform } from './platform';

/**
 * Every command with a keyboard shortcut. Menus, tooltips and Settings all read keys from
 * here, so a shortcut you record in Settings changes everywhere at once. Keys are Electron
 * accelerators ("CmdOrCtrl+Shift+T"). `linux` replaces `keys` on Linux where CmdOrCtrl
 * turning into Ctrl would take one of Chromium's own Linux shortcuts (Ctrl+Shift+N is a new
 * incognito window, Ctrl+Shift+C inspects an element, Ctrl+Shift+= zooms in), or where Linux
 * has a convention of its own (Alt+Left goes back).
 */
const DEFAULTS = [
  { id: 'newTab', group: 'Getting around', label: 'New tab', keys: 'CmdOrCtrl+T' },
  { id: 'openLocation', group: 'Getting around', label: 'Open location', keys: 'CmdOrCtrl+L' },
  { id: 'back', group: 'Getting around', label: 'Back', keys: 'CmdOrCtrl+[', linux: 'Alt+Left' },
  { id: 'forward', group: 'Getting around', label: 'Forward', keys: 'CmdOrCtrl+]', linux: 'Alt+Right' },
  { id: 'reload', group: 'Getting around', label: 'Reload', keys: 'CmdOrCtrl+R' },
  { id: 'hardReload', group: 'Getting around', label: 'Hard reload', keys: 'CmdOrCtrl+Shift+R' },
  { id: 'find', group: 'Getting around', label: 'Find in page', keys: 'CmdOrCtrl+F' },
  { id: 'toggleSidebar', group: 'Getting around', label: 'Show or hide the sidebar', keys: 'CmdOrCtrl+S' },
  { id: 'settings', group: 'Getting around', label: 'Settings', keys: 'CmdOrCtrl+,' },
  { id: 'newFlechinha', group: 'Tabs', label: 'New Flechinha window', keys: 'Alt+CmdOrCtrl+N' },
  { id: 'closeTab', group: 'Tabs', label: 'Close tab', keys: 'CmdOrCtrl+W' },
  { id: 'reopenTab', group: 'Tabs', label: 'Reopen closed tab', keys: 'CmdOrCtrl+Shift+T' },
  { id: 'nextTab', group: 'Tabs', label: 'Next tab', keys: 'Ctrl+Tab' },
  { id: 'previousTab', group: 'Tabs', label: 'Previous tab', keys: 'Ctrl+Shift+Tab' },
  { id: 'pinTab', group: 'Tabs', label: 'Pin or unpin tab', keys: 'CmdOrCtrl+D' },
  { id: 'duplicateTab', group: 'Tabs', label: 'Duplicate tab', keys: 'Alt+CmdOrCtrl+D' },
  { id: 'muteTab', group: 'Tabs', label: 'Mute or unmute tab', keys: 'Ctrl+M' },
  { id: 'clearToday', group: 'Tabs', label: 'Clear Today', keys: 'CmdOrCtrl+Shift+K' },
  { id: 'copyLink', group: 'Tabs', label: 'Copy link', keys: 'CmdOrCtrl+Shift+C', linux: 'Ctrl+Shift+L' },
  { id: 'copyMarkdown', group: 'Tabs', label: 'Copy as Markdown link', keys: 'Alt+CmdOrCtrl+C' },
  { id: 'screenshot', group: 'Tabs', label: 'Copy screenshot', keys: 'CmdOrCtrl+Shift+2' },
  { id: 'nextSpace', group: 'Spaces', label: 'Next Space', keys: 'Alt+CmdOrCtrl+Right' },
  { id: 'previousSpace', group: 'Spaces', label: 'Previous Space', keys: 'Alt+CmdOrCtrl+Left' },
  { id: 'newSpace', group: 'Spaces', label: 'New Space', keys: 'Ctrl+Shift+N', linux: 'Alt+Shift+N' },
  { id: 'splitNew', group: 'Split & Peek', label: 'Split with a new tab', keys: 'Ctrl+Shift+=', linux: 'Ctrl+Alt+=' },
  { id: 'exitSplit', group: 'Split & Peek', label: 'Exit split view', keys: 'Ctrl+Shift+-', linux: 'Ctrl+Alt+-' },
  { id: 'zoomIn', group: 'View', label: 'Zoom in', keys: 'CmdOrCtrl+=' },
  { id: 'zoomOut', group: 'View', label: 'Zoom out', keys: 'CmdOrCtrl+-' },
  { id: 'actualSize', group: 'View', label: 'Actual size', keys: 'CmdOrCtrl+0' },
  { id: 'devTools', group: 'Developer', label: 'Developer Tools', keys: 'Alt+CmdOrCtrl+I', linux: 'Ctrl+Shift+I' },
  { id: 'responsive', group: 'Developer', label: 'Responsive view', keys: 'Alt+CmdOrCtrl+M' },
  { id: 'nextEnvironment', group: 'Developer', label: 'Next environment', keys: 'Alt+CmdOrCtrl+E' },
  { id: 'editBoost', group: 'Developer', label: 'Edit boost for this site', keys: 'Alt+CmdOrCtrl+B' },
  { id: 'viewSource', group: 'Developer', label: 'View source', keys: 'Alt+CmdOrCtrl+U', linux: 'Ctrl+U' },
  { id: 'shortcuts', group: 'Getting around', label: 'Keyboard shortcuts', keys: 'CmdOrCtrl+/' },
] as const;

/** The commands with this platform's default keys. */
export const SHORTCUTS = DEFAULTS.map((s) => ({ id: s.id, group: s.group, label: s.label, keys: platform === 'linux' && 'linux' in s ? s.linux : s.keys }));

export type ShortcutId = (typeof DEFAULTS)[number]['id'];

/**
 * The modifier of the keys that pick a tab or a Space by number (1…9). On macOS ⌘ picks tabs
 * and ⌃ Spaces; on Linux both would be Ctrl, so Spaces take Alt (tabs keep Ctrl, as in Chrome).
 */
export const NUMBERED = { selectTab: 'CmdOrCtrl', selectSpace: isMac ? 'Ctrl' : 'Alt' } as const;

/** Whether keys pick a tab or a Space by number, or are the 0 beside them, so they can't be recorded. */
export function isNumbered(keys: string) {
  return Object.values(NUMBERED).some((modifier) => [...'0123456789'].some((digit) => sameKeys(`${modifier}+${digit}`, keys)));
}

/** The accelerator for a command: yours if you set one, none if you removed it, else the default. */
export function keysFor(state: BrowserState, id: ShortcutId): string | undefined {
  const own = state.keybindings?.[id];
  if (own === null) return undefined;
  return own ?? defaultKeys(id);
}

/** A command's default accelerator on this platform. */
export function defaultKeys(id: ShortcutId): string {
  return SHORTCUTS.find((s) => s.id === id)!.keys;
}

export function isShortcutId(id: string): id is ShortcutId {
  return SHORTCUTS.some((s) => s.id === id);
}

/**
 * One modifier's canonical name. CmdOrCtrl is ⌘ on macOS and Ctrl elsewhere; Cmd, Super and
 * Meta are ⌘ on macOS and the Super key elsewhere (patch 0016's ModifierFor). Undefined for a key.
 */
function modifier(name: string): 'Cmd' | 'Ctrl' | 'Alt' | 'Shift' | 'Super' | undefined {
  switch (name.toLowerCase()) {
    case 'cmdorctrl':
    case 'commandorcontrol':
      return isMac ? 'Cmd' : 'Ctrl';
    case 'cmd':
    case 'command':
    case 'super':
    case 'meta':
      return isMac ? 'Cmd' : 'Super';
    case 'ctrl':
    case 'control':
      return 'Ctrl';
    case 'alt':
    case 'option':
      return 'Alt';
    case 'shift':
      return 'Shift';
  }
  return undefined;
}

/** An accelerator as the modifiers it presses and its one key ('' for a modifier on its own). */
function parse(keys: string) {
  const parts = keys.split('+');
  const last = parts[parts.length - 1];
  const mods = new Set(parts.map(modifier).filter((m) => m !== undefined));
  return { mods, key: modifier(last) ? '' : last };
}

/** Two accelerators that press the same keys ("CmdOrCtrl+T" and "Cmd+T" on macOS) compare equal. */
export function sameKeys(a: string, b: string) {
  const norm = (keys: string) => {
    const { mods, key } = parse(keys);
    return [...mods, key].sort().join('+').toLowerCase();
  };
  return norm(a) === norm(b);
}

const MAC_KEYS: Record<string, string> = { Left: '←', Right: '→', Up: '↑', Down: '↓', Return: '↩', Enter: '↩', Tab: '⇥', Space: 'Space', Escape: 'Esc', Backspace: '⌫', Delete: '⌦', '-': '−' };
const LINUX_KEYS: Record<string, string> = { Return: 'Enter', Escape: 'Esc', Plus: '+' };

/**
 * An accelerator, or one modifier or key, as this platform writes it: "Alt+CmdOrCtrl+Shift+T"
 * is "⌥⇧⌘T" on macOS and "Ctrl+Alt+Shift+T" on Linux; "CmdOrCtrl" alone is "⌘" or "Ctrl".
 */
export function displayKeys(keys: string | undefined) {
  if (!keys) return '';
  const { mods, key } = parse(keys);
  if (isMac) {
    const glyphs = (mods.has('Ctrl') ? '⌃' : '') + (mods.has('Alt') ? '⌥' : '') + (mods.has('Shift') ? '⇧' : '') + (mods.has('Cmd') ? '⌘' : '');
    return glyphs + (key ? (MAC_KEYS[key] ?? key.toUpperCase()) : '');
  }
  const names = (['Ctrl', 'Alt', 'Shift', 'Super'] as const).filter((m) => mods.has(m));
  const name = key.length === 1 ? key.toUpperCase() : (LINUX_KEYS[key] ?? key);
  return [...names, ...(key ? [name] : [])].join('+');
}

/** Shortcuts that are a family of keys (⌘1…⌘9) and can't be recorded as one. */
const FIXED: ShortcutInfo[] = [
  { id: 'tabN', group: 'Tabs', label: 'Go to tab · last tab', keys: `${displayKeys(`${NUMBERED.selectTab}+1`)} … ${displayKeys(`${NUMBERED.selectTab}+9`)}`, fixed: true },
  { id: 'spaceN', group: 'Spaces', label: 'Go to Space', keys: `${displayKeys(`${NUMBERED.selectSpace}+1`)} … ${displayKeys(`${NUMBERED.selectSpace}+9`)}`, fixed: true },
  { id: 'closePeek', group: 'Split & Peek', label: 'Close Peek', keys: 'Esc', fixed: true },
];

/** Everything Settings shows, in order, with your keys applied. */
export function shortcutList(state: BrowserState): ShortcutInfo[] {
  const editable = SHORTCUTS.map((s): ShortcutInfo => {
    const keys = keysFor(state, s.id);
    return { id: s.id, group: s.group, label: s.label, keys: displayKeys(keys), changed: state.keybindings?.[s.id] !== undefined };
  });
  const groups = [...new Set(SHORTCUTS.map((s) => s.group))];
  return groups.flatMap((g) => [...editable.filter((s) => s.group === g), ...FIXED.filter((s) => s.group === g)]);
}

/** The sidebar's tooltips and hints, by command: { newTab: '⌘T', …, selectSpace: '⌃1' }. */
export function shortcutHints(state: BrowserState): Record<string, string> {
  return { ...Object.fromEntries(SHORTCUTS.map((s) => [s.id, displayKeys(keysFor(state, s.id))])), selectSpace: displayKeys(`${NUMBERED.selectSpace}+1`) };
}

/** Fills a page's static key caps for this platform: `data-keys` holds an accelerator, or one modifier or key. */
export function labelKeys(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-keys]')) el.textContent = displayKeys(el.dataset.keys);
}
