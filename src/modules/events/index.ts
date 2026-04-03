/** @format */

export function sendEvent<T extends object | number | string | boolean>(name: string, payload: T) {
  window.Overseer.send(name, payload);
}
