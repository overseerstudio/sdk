/** @format */

import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiClient, validatePluginId, validateScope } from './api';

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof axios>('axios');
  return {
    ...actual,
    default: {
      ...actual,
      create: vi.fn(),
      isAxiosError: actual.isAxiosError,
    },
  };
});

const mockedAxios = vi.mocked(axios);

describe('validatePluginId', () => {
  it('accepts @scope/name', () => {
    expect(() => validatePluginId('@overseer/welcome')).not.toThrow();
  });

  it('rejects scope/name without @', () => {
    expect(() => validatePluginId('myorg/tools')).toThrow(/Invalid plugin ID/);
  });

  it('rejects missing slash', () => {
    expect(() => validatePluginId('noscope')).toThrow(/Invalid plugin ID/);
  });

  it('rejects uppercase', () => {
    expect(() => validatePluginId('Foo/Bar')).toThrow(/Invalid plugin ID/);
  });

  it('rejects empty scope', () => {
    expect(() => validatePluginId('/name')).toThrow(/Invalid plugin ID/);
  });

  it('rejects double @', () => {
    expect(() => validatePluginId('@@scope/name')).toThrow(/Invalid plugin ID/);
  });
});

describe('validateScope', () => {
  it('accepts @scope', () => {
    expect(() => validateScope('@overseer')).not.toThrow();
  });

  it('rejects scope without @', () => {
    expect(() => validateScope('overseer')).toThrow(/Invalid scope/);
  });

  it('rejects scope with slash', () => {
    expect(() => validateScope('@scope/name')).toThrow(/Invalid scope/);
  });

  it('rejects uppercase', () => {
    expect(() => validateScope('@Overseer')).toThrow(/Invalid scope/);
  });

  it('rejects empty @', () => {
    expect(() => validateScope('@')).toThrow(/Invalid scope/);
  });
});

describe('ApiClient', () => {
  let postMock: ReturnType<typeof vi.fn>;
  let getMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postMock = vi.fn();
    getMock = vi.fn();
    mockedAxios.create.mockReturnValue({
      post: postMock,
      get: getMock,
    } as unknown as ReturnType<typeof axios.create>);
  });

  it('rejects a plugin id without an @ prefix before hitting the network', async () => {
    const client = createApiClient('token');
    await expect(
      client.publishVersion('myorg/tools', {
        version: '1.0.0',
        tarballPath: '/dev/null',
        hash: 'sha256-x',
        assets: [],
      }),
    ).rejects.toThrow(/Invalid plugin ID/);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('swallows 409 on registerPlugin (idempotent)', async () => {
    const err = Object.assign(new Error('conflict'), {
      isAxiosError: true,
      response: { status: 409, data: {} },
    });
    postMock.mockRejectedValue(err);
    const client = createApiClient('token');
    await expect(
      client.registerPlugin({ id: '@a/b', name: 'n', category_id: 1 }),
    ).resolves.toBeUndefined();
  });

  it('rethrows non-409 errors on registerPlugin', async () => {
    const err = Object.assign(new Error('server'), {
      isAxiosError: true,
      response: { status: 500, data: {} },
    });
    postMock.mockRejectedValue(err);
    const client = createApiClient('token');
    await expect(client.registerPlugin({ id: '@a/b', name: 'n', category_id: 1 })).rejects.toBe(
      err,
    );
  });

  it('listScopes GETs /scopes and returns the JSON', async () => {
    const payload = [{ id: 1, scope: '@mine', user_id: 1, is_system: false }];
    getMock.mockResolvedValue({ data: payload });
    const client = createApiClient('token');
    await expect(client.listScopes()).resolves.toEqual(payload);
    expect(getMock).toHaveBeenCalledWith('/scopes');
  });

  it('claimScope POSTs to /scopes with the scope body', async () => {
    const payload = { id: 1, scope: '@mine', user_id: 1, is_system: false };
    postMock.mockResolvedValue({ data: payload });
    const client = createApiClient('token');
    await expect(client.claimScope('@mine')).resolves.toEqual(payload);
    expect(postMock).toHaveBeenCalledWith('/scopes', { scope: '@mine' });
  });

  it('claimScope rejects an invalid scope before hitting the network', async () => {
    const client = createApiClient('token');
    await expect(client.claimScope('bad')).rejects.toThrow(/Invalid scope/);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('releaseScope DELETEs /scopes/{scope} with the scope url-encoded', async () => {
    const deleteMock = vi.fn().mockResolvedValue({ data: {} });
    mockedAxios.create.mockReturnValue({
      post: postMock,
      get: getMock,
      delete: deleteMock,
    } as unknown as ReturnType<typeof axios.create>);
    const client = createApiClient('token');
    await client.releaseScope('@mine');
    expect(deleteMock).toHaveBeenCalledWith('/scopes/%40mine');
  });

  it('releaseScope rejects an invalid scope before hitting the network', async () => {
    const client = createApiClient('token');
    await expect(client.releaseScope('bad')).rejects.toThrow(/Invalid scope/);
  });
});
