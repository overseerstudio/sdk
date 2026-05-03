/** @format */

export function getState<T>(key: string): Promise<T | null> {
  return window.Overseer.state.get<T>(key);
}

export function setState<T>(key: string, value: T): void {
  window.Overseer.state.set<T>(key, value);
}
