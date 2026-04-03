/** @format */

declare global {
  interface WindowEventMap {
    'overseer:config.update': CustomEvent<OverseerEventDetail>;
    'overseer:ready': CustomEvent<OverseerEventDetail>;
  }
}

export type CallbackFunction = (params: CustomEvent<OverseerEventDetail<object>>) => void;

export type DestroyFunction = () => void;

export type OverseerEventDetail<T extends object = object> = {
  config: T;
  extensionId: string;
  language: string;
};
