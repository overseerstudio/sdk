/** @format */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (event: { type: string; detail?: { id: string } }) => void;

let listeners: Record<string, Listener[]>;

/** Simulate the host dispatching `overseer:shortcut` with the given id. */
function fire(id: string): void {
  (listeners['overseer:shortcut'] ?? []).forEach(cb =>
    cb({ type: 'overseer:shortcut', detail: { id } }),
  );
}

beforeEach(() => {
  // The module keeps a singleton listener + registry, so reset it per test for
  // a clean window stub and fresh state.
  vi.resetModules();
  listeners = {};
  vi.stubGlobal('window', {
    addEventListener: (type: string, cb: Listener) => {
      (listeners[type] ??= []).push(cb);
    },
  });
});

async function loadOnShortcut() {
  return (await import('./shortcuts')).onShortcut;
}

describe('onShortcut', () => {
  it('routes each shortcut id to its own callback', async () => {
    const onShortcut = await loadOnShortcut();
    const calls: string[] = [];
    onShortcut('decrease-fear', () => calls.push('decrease'));
    onShortcut('increase-fear', () => calls.push('increase'));

    fire('decrease-fear');
    fire('increase-fear');
    fire('increase-fear');

    // The pre-fix bug fired the first-registered callback for every event,
    // which would have produced ['decrease', 'decrease', 'decrease'].
    expect(calls).toEqual(['decrease', 'increase', 'increase']);
  });

  it('ignores unknown shortcut ids', async () => {
    const onShortcut = await loadOnShortcut();
    const cb = vi.fn();
    onShortcut('decrease-fear', cb);
    fire('unknown');
    expect(cb).not.toHaveBeenCalled();
  });

  it('registers a single window listener for multiple shortcuts', async () => {
    const onShortcut = await loadOnShortcut();
    onShortcut('a', () => {});
    onShortcut('b', () => {});
    onShortcut('c', () => {});
    expect(listeners['overseer:shortcut']).toHaveLength(1);
  });

  it('re-registering an id overwrites the previous callback', async () => {
    const onShortcut = await loadOnShortcut();
    const first = vi.fn();
    const second = vi.fn();
    onShortcut('decrease-fear', first);
    onShortcut('decrease-fear', second);
    fire('decrease-fear');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('returns a destroy function that unregisters the callback', async () => {
    const onShortcut = await loadOnShortcut();
    const cb = vi.fn();
    const destroy = onShortcut('decrease-fear', cb);
    destroy();
    fire('decrease-fear');
    expect(cb).not.toHaveBeenCalled();
  });

  it('destroy does not clobber a newer registration of the same id', async () => {
    const onShortcut = await loadOnShortcut();
    const first = vi.fn();
    const second = vi.fn();
    const destroyFirst = onShortcut('decrease-fear', first);
    onShortcut('decrease-fear', second);
    destroyFirst(); // no-op: `first` is no longer the registered callback
    fire('decrease-fear');
    expect(second).toHaveBeenCalledTimes(1);
  });
});
