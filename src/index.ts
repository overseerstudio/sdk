/** @format */

declare global {
  interface Window {
    Overseer: OverseerSDK;
  }
  interface WindowEventMap {
    'overseer-config-changed': CustomEvent<OverseerEventDetail>;
    'overseer-ready': CustomEvent<OverseerEventDetail>;
  }
}

export type OverseerEventDetail<T extends object = object> = {
  config: T;
  extensionId: string;
  language: string;
};

export type OverseerSDK = {
  send: (module: string, event?: any) => void;
  subscribe: (module: string, callback: (state: any) => void) => () => void;
  unsubscribe: (module: string, callback: (state: any) => void) => () => void;
};

type CallbackFunction = (params: CustomEvent<OverseerEventDetail<object>>) => void;
type DestroyFunction = () => void;

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
export function onOverseerReady<T extends object>(
  callback: (params: CustomEvent<OverseerEventDetail<T>>) => void,
): DestroyFunction {
  window.addEventListener('overseer-ready', callback as CallbackFunction);

  return () => {
    window.removeEventListener('overseer-ready', callback as CallbackFunction);
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
export function onOverseerConfigChanged<T extends object>(
  callback: (params: CustomEvent<OverseerEventDetail<T>>) => void,
): DestroyFunction {
  window.addEventListener('overseer-config-changed', callback as CallbackFunction);

  return () => {
    window.removeEventListener('overseer-config-changed', callback as CallbackFunction);
  };
}
