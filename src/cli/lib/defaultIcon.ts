/** @format */

import iconDataUrl from '../assets/default-icon.png';

/**
 * Decodes the bundled default scaffold icon into raw PNG bytes.
 *
 * The CLI Vite build inlines `default-icon.png` as a base64 data URL string, so
 * the icon travels inside the bundled `cli.js` and never needs a runtime file
 * path. We strip the `data:...;base64,` prefix and decode the payload.
 */
export function loadDefaultIcon(): Buffer {
  const base64 = iconDataUrl.includes(',') ? iconDataUrl.slice(iconDataUrl.indexOf(',') + 1) : '';
  return Buffer.from(base64, 'base64');
}
