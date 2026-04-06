/** @format */

const _shortcuts = new Map<string, () => void>();
let _listener = false;

export function onShortcut(shortcut: string, callback: () => void) {
  if (!_shortcuts.has(shortcut)) {
    _shortcuts.set(shortcut, callback);
  }

  if (!_listener) {
    _listener = true;
    window.addEventListener('overseer:shortcut', () => {
      callback();
    });
  }
}
