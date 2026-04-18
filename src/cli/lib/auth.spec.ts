/** @format */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./config', () => ({
  readConfig: vi.fn(() => null),
}));

import { resolveToken } from './auth';
import { readConfig } from './config';

const mockedReadConfig = vi.mocked(readConfig);

describe('resolveToken', () => {
  const originalEnv = process.env.OVERSEER_TOKEN;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env.OVERSEER_TOKEN;
    mockedReadConfig.mockReset();
    mockedReadConfig.mockReturnValue(null);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((_code?: number) => {
      throw new Error('process.exit called');
    }) as never);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.OVERSEER_TOKEN;
    else process.env.OVERSEER_TOKEN = originalEnv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('prefers the explicit flag over env and config', async () => {
    process.env.OVERSEER_TOKEN = 'env-token';
    mockedReadConfig.mockReturnValue({ token: 'config-token' });
    const token = await resolveToken({ token: 'flag-token' });
    expect(token).toBe('flag-token');
  });

  it('falls back to OVERSEER_TOKEN env var', async () => {
    process.env.OVERSEER_TOKEN = 'env-token';
    mockedReadConfig.mockReturnValue({ token: 'config-token' });
    const token = await resolveToken();
    expect(token).toBe('env-token');
  });

  it('falls back to the config file when no env is set', async () => {
    mockedReadConfig.mockReturnValue({ token: 'config-token' });
    const token = await resolveToken();
    expect(token).toBe('config-token');
  });

  it('exits when no token is found and allowPrompt is false', async () => {
    await expect(resolveToken({ allowPrompt: false })).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  });
});
