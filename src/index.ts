/** @format */

declare global {
  interface Window {
    Overseer: OverseerSDK;
  }
}

export type OverseerSDK = {
  send<T>(module: string, event?: T): void;
  subscribe<T>(module: string, callback: (state: T) => void): void;
  unsubscribe<T>(module: string, callback: (state: T) => void): void;
};

export * from './modules/events';
export * from './modules/listeners';
export * from './modules/toasts';

export type * from './modules/listeners';
