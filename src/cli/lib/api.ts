/** @format */

import fs from 'node:fs';
import path from 'node:path';

import axios, { type AxiosInstance } from 'axios';

import type { ApiCategory, ApiPublishResponse, ApiUser } from '../types';

const PLUGIN_ID_RE = /^@[a-z0-9-]+\/[a-z0-9-]+$/;
const SCOPE_RE = /^@[a-z0-9-]+$/;

export function validatePluginId(id: string): void {
  if (!PLUGIN_ID_RE.test(id)) {
    throw new Error(
      `Invalid plugin ID "${id}" — expected "@scope/name" (lowercase letters, numbers, hyphens).`,
    );
  }
}

export function validateScope(scope: string): void {
  if (!SCOPE_RE.test(scope)) {
    throw new Error(
      `Invalid scope "${scope}" — expected "@scope" (lowercase letters, numbers, hyphens).`,
    );
  }
}

export function baseUrl(): string {
  return (process.env.OVERSEER_API_URL ?? 'https://overseer.studio').replace(/\/$/, '');
}

function buildClient(token?: string): AxiosInstance {
  return axios.create({
    baseURL: `${baseUrl()}/api`,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });
}

type VersionSummary = { version: string; is_latest: boolean };

type RegisterPayload = {
  id: string;
  name: string;
  description?: string;
  category_id: number;
  homepage?: string;
};

export type PublishPayload = {
  version: string;
  tarballPath: string;
  hash: string;
  assets: string[];
  changelog?: string;
  compatible_version?: unknown;
};

export type ApiScope = {
  id: number;
  scope: string;
  user_id: number;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ApiClient = {
  getUser(): Promise<ApiUser>;
  getCategories(): Promise<ApiCategory[]>;
  getVersions(pluginId: string): Promise<VersionSummary[]>;
  registerPlugin(payload: RegisterPayload): Promise<void>;
  publishVersion(
    pluginId: string,
    payload: PublishPayload,
    onProgress?: (percent: number) => void,
  ): Promise<ApiPublishResponse>;
  listScopes(): Promise<ApiScope[]>;
  claimScope(scope: string): Promise<ApiScope>;
  releaseScope(scope: string): Promise<void>;
};

export function createApiClient(token: string): ApiClient {
  const http = buildClient(token);
  return buildClientActions(http);
}

export function createPublicClient(): Pick<ApiClient, 'getCategories'> {
  const http = buildClient();
  return {
    async getCategories() {
      const { data } = await http.get<ApiCategory[]>('/categories');
      return data;
    },
  };
}

function buildClientActions(http: AxiosInstance): ApiClient {
  return {
    async getUser() {
      const { data } = await http.get<ApiUser>('/user');
      return data;
    },

    async getCategories() {
      const { data } = await http.get<ApiCategory[]>('/categories');
      return data;
    },

    async getVersions(pluginId) {
      validatePluginId(pluginId);
      const { data } = await http.get<VersionSummary[]>(`/plugins/${pluginId}/versions`);
      return data;
    },

    async registerPlugin(payload) {
      validatePluginId(payload.id);
      try {
        await http.post('/plugins', payload);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) return;
        throw err;
      }
    },

    async publishVersion(pluginId, payload, onProgress) {
      validatePluginId(pluginId);

      const buffer = fs.readFileSync(payload.tarballPath);
      const form = new FormData();
      form.append('version', payload.version);
      form.append('hash', payload.hash);
      form.append(
        'package',
        new Blob([new Uint8Array(buffer)], { type: 'application/gzip' }),
        path.basename(payload.tarballPath),
      );
      for (const asset of payload.assets) form.append('assets[]', asset);
      if (payload.changelog !== undefined) form.append('changelog', payload.changelog);
      if (Array.isArray(payload.compatible_version)) {
        for (const v of payload.compatible_version) form.append('compatible_version[]', String(v));
      } else if (payload.compatible_version !== undefined && payload.compatible_version !== null) {
        form.append('compatible_version', String(payload.compatible_version));
      }

      const { data } = await http.post<ApiPublishResponse>(`/plugins/${pluginId}/versions`, form, {
        headers: { 'Content-Type': undefined, Accept: 'application/json' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0,
        onUploadProgress: onProgress
          ? e => {
              if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
            }
          : undefined,
      });
      return data;
    },

    async listScopes() {
      const { data } = await http.get<ApiScope[]>('/scopes');
      return data;
    },

    async claimScope(scope) {
      validateScope(scope);
      const { data } = await http.post<ApiScope>('/scopes', { scope });
      return data;
    },

    async releaseScope(scope) {
      validateScope(scope);
      await http.delete(`/scopes/${encodeURIComponent(scope)}`);
    },
  };
}

export function handleApiError(err: unknown): void {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;
    const message = data?.message ?? err.message;
    console.error(`API error ${status ?? ''}: ${message}`.trim());
    if (data?.errors) {
      for (const [field, messages] of Object.entries(data.errors)) {
        for (const m of messages) console.error(`  ${field}: ${m}`);
      }
    }
  } else if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error('An unknown error occurred');
  }
}
