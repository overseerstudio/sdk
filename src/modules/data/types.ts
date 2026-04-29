/** @format */

export type DatasetId = string;

export type StaticDatasetManifest = {
  id: string;
  label: string;
  description?: string;
  version: string;
  idField?: string;
  schema?: { $ref: string };
  source: { local: { $ref: string } };
};

export type DynamicDatasetManifest = {
  id: string;
  label: string;
  description?: string;
  version: string;
  source: { remote: Record<string, string> };
};

export type DatasetManifest = StaticDatasetManifest | DynamicDatasetManifest;

export type DatasetEntry = {
  id: DatasetId;
  pluginId: string;
  pluginPath: string;
  manifest: DatasetManifest;
  type: 'static' | 'dynamic';
};

export type DataGetAllOptions = {
  page?: number;
  limit?: number;
};

export type DataGetAllResult<T = Record<string, unknown>> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type DataChangedEvent<T = Record<string, unknown>> = {
  datasetId: DatasetId;
  type: 'created' | 'updated' | 'deleted' | 'invalidated';
  record?: T;
};
