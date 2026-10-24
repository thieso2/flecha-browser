import os from 'node:os';
import path from 'node:path';

/**
 * The desktop the host runs on, decided once. Everything that isn't macOS is treated as
 * Linux, where apps keep their settings under XDG_CONFIG_HOME instead of Application Support.
 */
export const isMac = process.platform === 'darwin';

/**
 * Electron's appData folder, where browsers keep their profiles: ~/Library/Application Support
 * on macOS, $XDG_CONFIG_HOME (~/.config unless set; the spec ignores a relative one) on Linux.
 */
export function appData(...parts: string[]) {
  if (isMac) return path.join(os.homedir(), 'Library', 'Application Support', ...parts);
  const xdg = process.env.XDG_CONFIG_HOME;
  return path.join(xdg && path.isAbsolute(xdg) ? xdg : path.join(os.homedir(), '.config'), ...parts);
}

/** How messages name the computer the host runs on. */
export const thisComputer = isMac ? 'this Mac' : 'this computer';
