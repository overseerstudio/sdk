/** @format */

export type Config = {
  token: string;
};

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  category?: string;
  homepage?: string;
  compatibleVersion?: string | { min?: string; max?: string };
  extensions?: Array<{ $ref: string }>;
  presets?: Array<{ $ref: string }>;
  themes?: Array<{ id: string; label: string; src: { $ref: string } | string }>;
  locales?: Array<{ id: string; label: string; src: { $ref: string } | string }>;
};

export type PluginDistribution = {
  $schema?: string;
  version?: string;
  packageUrl: string;
  hash: string;
  assets: string[];
};

export type ApiCategory = {
  id: number;
  name: string;
  slug: string;
};

export type ApiPublishResponse = {
  version: string;
  plugin_id: string;
  package_url: string;
  plugin_json_url: string;
  published_at: string;
};

export type ApiUser = {
  id: number;
  name: string;
  email: string;
};
