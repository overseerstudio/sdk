/** @format */

import type {
  DataChangedEvent,
  DataGetAllOptions,
  DataGetAllResult,
  DatasetEntry,
  DatasetId,
} from './types';

export function listDatasets(): Promise<DatasetEntry[]> {
  return window.Overseer.data.list();
}

export function getAllData<T = Record<string, unknown>>(
  datasetId: DatasetId,
  opts?: DataGetAllOptions,
): Promise<DataGetAllResult<T>> {
  return window.Overseer.data.getAll<T>(datasetId, opts);
}

export function getDataById<T = Record<string, unknown>>(
  datasetId: DatasetId,
  id: string,
): Promise<T | null> {
  return window.Overseer.data.getById<T>(datasetId, id);
}

export function createData<T = Record<string, unknown>>(
  datasetId: DatasetId,
  record: Omit<T, 'id'>,
): Promise<T> {
  return window.Overseer.data.create<T>(datasetId, record);
}

export function updateData<T = Record<string, unknown>>(
  datasetId: DatasetId,
  id: string,
  updates: Partial<T>,
): Promise<T> {
  return window.Overseer.data.update<T>(datasetId, id, updates);
}

export function deleteData(datasetId: DatasetId, id: string): Promise<void> {
  return window.Overseer.data.delete(datasetId, id);
}

export function callDataDynamic(
  datasetId: DatasetId,
  action: string,
  params?: Record<string, unknown>,
): Promise<unknown> {
  return window.Overseer.data.call(datasetId, action, params);
}

export function invalidateData(datasetId: DatasetId): Promise<void> {
  return window.Overseer.data.invalidate(datasetId);
}

export function onDataChanged<T = Record<string, unknown>>(
  datasetId: DatasetId,
  callback: (event: DataChangedEvent<T>) => void,
): () => void {
  return window.Overseer.data.onChange<T>(datasetId, callback);
}
