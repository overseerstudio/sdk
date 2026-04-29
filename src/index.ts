/** @format */

import type {
  DataChangedEvent,
  DataGetAllOptions,
  DataGetAllResult,
  DatasetEntry,
  DatasetId,
} from './modules/data/types';

declare global {
  interface Window {
    Overseer: OverseerSDK;
  }
}

export type OverseerDataAPI = {
  list(): Promise<DatasetEntry[]>;
  getAll<T = Record<string, unknown>>(
    datasetId: DatasetId,
    opts?: DataGetAllOptions,
  ): Promise<DataGetAllResult<T>>;
  getById<T = Record<string, unknown>>(datasetId: DatasetId, recordId: string): Promise<T | null>;
  create<T = Record<string, unknown>>(datasetId: DatasetId, record: unknown): Promise<T>;
  update<T = Record<string, unknown>>(
    datasetId: DatasetId,
    recordId: string,
    updates: unknown,
  ): Promise<T>;
  delete(datasetId: DatasetId, recordId: string): Promise<void>;
  call(datasetId: DatasetId, action: string, params?: Record<string, unknown>): Promise<unknown>;
  invalidate(datasetId: DatasetId): Promise<void>;
  onChange<T = Record<string, unknown>>(
    datasetId: DatasetId,
    callback: (event: DataChangedEvent<T>) => void,
  ): () => void;
};

export type OverseerSDK = {
  send<T>(module: string, event?: T): void;
  subscribe<T>(module: string, callback: (state: T) => void): void;
  unsubscribe<T>(module: string, callback: (state: T) => void): void;
  data: OverseerDataAPI;
};

export * from './modules/events';
export * from './modules/listeners';
export * from './modules/toasts';
export * from './modules/data';

export type * from './modules/listeners';
export type * from './modules/data/types';
