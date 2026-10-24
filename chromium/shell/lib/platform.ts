/**
 * The desktop Flecha runs on, decided once for the background and every page. macOS keeps
 * its conventions (⌘ as the primary modifier, keys drawn as ⌥⇧⌘T); everything else gets
 * Linux's (Ctrl, "Ctrl+Alt+Shift+T"), since patch 0016 reads CmdOrCtrl as Ctrl on every
 * platform but macOS. Super is left alone there: on Linux it belongs to the window manager.
 */
export type Platform = 'mac' | 'linux';

// Chromium has userAgentData in pages and workers alike; TypeScript's DOM types don't yet.
const reported = (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform || navigator.platform;

export const platform: Platform = /^mac/i.test(reported) ? 'mac' : 'linux';
export const isMac = platform === 'mac';

/** The KeyboardEvent or MouseEvent flag of the primary modifier: ⌘ on macOS, Ctrl elsewhere. */
export const primaryModifier = isMac ? 'metaKey' : 'ctrlKey';

/** How copy names the computer Flecha runs on. */
export const thisComputer = isMac ? 'this Mac' : 'this computer';
