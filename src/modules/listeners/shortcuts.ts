/** @format */

import type { DestroyFunction } from './types';

const _shortcuts = new Map<string, () => void>();
let _listener = false;

/**
 * Register a callback for a host-defined shortcut, matched by manifest shortcut
 * `id`. The host dispatches `overseer:shortcut` with `detail.id`; we invoke only
 * the callback registered for that id. Re-registering an id overwrites it.
 *
 * Returns a function that can be used to unregister the callback.
 *
 * @param shortcut The manifest shortcut `id` to listen for.
 * @param callback Invoked when that shortcut fires.
 * @returns Function
 */
export function onShortcut(shortcut: string, callback: () => void): DestroyFunction {
  _shortcuts.set(shortcut, callback);

  if (!_listener) {
    _listener = true;
    window.addEventListener('overseer:shortcut', event => {
      _shortcuts.get(event.detail?.id)?.();
    });
  }

  return () => {
    // Only delete if this exact callback is still registered, so a later
    // re-registration of the same id isn't clobbered by an earlier destroy.
    if (_shortcuts.get(shortcut) === callback) {
      _shortcuts.delete(shortcut);
    }
  };
}
