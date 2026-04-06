/** @format */

import type { OverseerEventDetail, CallbackFunction, DestroyFunction } from './types';

/**
 * Overseer ready
 * Provide a callback function to be executed when your Overseer extension is
 * ready to render.
 *
 * Returns a function that can be used to unsubscribe the callback.
 *
 * @param callback Extension and config details from Overseer Studio
 * @returns Function
 */
export function onReady<T extends object>(
  callback: (params: CustomEvent<OverseerEventDetail<T>>) => void,
): DestroyFunction {
  window.addEventListener('overseer:ready', callback as CallbackFunction);

  return () => {
    window.removeEventListener('overseer:ready', callback as CallbackFunction);
  };
}

/**
 * Overseer config changed
 * Provide a callback function to be executed when your Overseer extension
 * config has changed.
 *
 * Returns a function that can be used to unsubscribe the callback.
 *
 * @param callback Extension and config details from Overseer Studio
 * @returns Function
 */
export function onConfigChanged<T extends object>(
  callback: (params: CustomEvent<OverseerEventDetail<T>>) => void,
): DestroyFunction {
  window.addEventListener('overseer:config.update', callback as CallbackFunction);

  return () => {
    window.removeEventListener('overseer:config.update', callback as CallbackFunction);
  };
}

export function subscribe<T>(module: string, callback: (state: T) => void) {
  return window.Overseer.subscribe(module, callback);
}

export function unsubscribe<T>(module: string, callback: (state: T) => void) {
  return window.Overseer.unsubscribe(module, callback);
}

export * from './shortcuts';

export type * from './types';
