/** @format */

declare global {
  interface WindowEventMap {
    'overseer:config.update': CustomEvent<OverseerEventDetail>;
    'overseer:ready': CustomEvent<OverseerEventDetail>;
    'overseer:shortcut': CustomEvent<OverseerShortcutEventDetail>;
  }
}

export type CallbackFunction = (params: CustomEvent<OverseerEventDetail<object>>) => void;

export type DestroyFunction = () => void;

export type OverseerEventDetail<T extends object = object> = {
  config: T;
  extensionId: string;
  language: string;
  state: Record<string, unknown> | null;
};

export type OverseerShortcutEventDetail = {
  id: string;
};
