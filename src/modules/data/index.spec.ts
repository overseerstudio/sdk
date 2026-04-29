/** @format */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  callDataDynamic,
  createData,
  deleteData,
  getAllData,
  getDataById,
  invalidateData,
  listDatasets,
  onDataChanged,
  updateData,
} from './index';

type DataAPI = {
  list: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  call: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
  onChange: ReturnType<typeof vi.fn>;
};

let data: DataAPI;

beforeEach(() => {
  data = {
    list: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    call: vi.fn(),
    invalidate: vi.fn(),
    onChange: vi.fn(),
  };
  vi.stubGlobal('window', { Overseer: { data } });
});

describe('listDatasets', () => {
  it('delegates to window.Overseer.data.list', async () => {
    data.list.mockResolvedValue([{ id: '@a/b:c' }]);
    const result = await listDatasets();
    expect(data.list).toHaveBeenCalledWith();
    expect(result).toEqual([{ id: '@a/b:c' }]);
  });
});

describe('getAllData', () => {
  it('passes datasetId and options through', async () => {
    const page = { items: [{ id: '1' }], total: 1, page: 1, limit: 10 };
    data.getAll.mockResolvedValue(page);
    const result = await getAllData('@me/dnd5e:monsters', { page: 1, limit: 10 });
    expect(data.getAll).toHaveBeenCalledWith('@me/dnd5e:monsters', { page: 1, limit: 10 });
    expect(result).toEqual(page);
  });

  it('works without options', async () => {
    data.getAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
    await getAllData('@me/dnd5e:monsters');
    expect(data.getAll).toHaveBeenCalledWith('@me/dnd5e:monsters', undefined);
  });
});

describe('getDataById', () => {
  it('passes both arguments and returns the record', async () => {
    data.getById.mockResolvedValue({ id: 'goblin', hp: 7 });
    const result = await getDataById('@me/dnd5e:monsters', 'goblin');
    expect(data.getById).toHaveBeenCalledWith('@me/dnd5e:monsters', 'goblin');
    expect(result).toEqual({ id: 'goblin', hp: 7 });
  });
});

describe('createData', () => {
  it('invokes create with datasetId and record', async () => {
    const record = { name: 'Orc' };
    data.create.mockResolvedValue({ id: 'orc', ...record });
    const result = await createData('@me/dnd5e:monsters', record);
    expect(data.create).toHaveBeenCalledWith('@me/dnd5e:monsters', record);
    expect(result).toEqual({ id: 'orc', name: 'Orc' });
  });

  it('propagates rejected promises', async () => {
    data.create.mockRejectedValue(new Error('validation failed'));
    await expect(createData('@me/dnd5e:monsters', { name: 'Bad' })).rejects.toThrow(
      'validation failed',
    );
  });
});

describe('updateData', () => {
  it('invokes update with all three arguments', async () => {
    const updates = { hp: 10 };
    data.update.mockResolvedValue({ id: 'goblin', hp: 10 });
    const result = await updateData('@me/dnd5e:monsters', 'goblin', updates);
    expect(data.update).toHaveBeenCalledWith('@me/dnd5e:monsters', 'goblin', updates);
    expect(result).toEqual({ id: 'goblin', hp: 10 });
  });

  it('propagates rejected promises', async () => {
    data.update.mockRejectedValue(new Error('not found'));
    await expect(updateData('@me/dnd5e:monsters', 'x', {})).rejects.toThrow('not found');
  });
});

describe('deleteData', () => {
  it('invokes delete with both arguments', async () => {
    data.delete.mockResolvedValue(undefined);
    await deleteData('@me/dnd5e:monsters', 'goblin');
    expect(data.delete).toHaveBeenCalledWith('@me/dnd5e:monsters', 'goblin');
  });

  it('propagates rejected promises', async () => {
    data.delete.mockRejectedValue(new Error('locked'));
    await expect(deleteData('@me/dnd5e:monsters', 'x')).rejects.toThrow('locked');
  });
});

describe('callDataDynamic', () => {
  it('forwards action name and params', async () => {
    data.call.mockResolvedValue({ ok: true });
    const result = await callDataDynamic('@me/open5e:live', 'search', { q: 'goblin' });
    expect(data.call).toHaveBeenCalledWith('@me/open5e:live', 'search', { q: 'goblin' });
    expect(result).toEqual({ ok: true });
  });

  it('works without params', async () => {
    data.call.mockResolvedValue(null);
    await callDataDynamic('@me/open5e:live', 'ping');
    expect(data.call).toHaveBeenCalledWith('@me/open5e:live', 'ping', undefined);
  });
});

describe('invalidateData', () => {
  it('delegates to window.Overseer.data.invalidate', async () => {
    data.invalidate.mockResolvedValue(undefined);
    await invalidateData('@me/open5e:live');
    expect(data.invalidate).toHaveBeenCalledWith('@me/open5e:live');
  });
});

describe('onDataChanged', () => {
  it('returns the unsubscribe function from onChange', () => {
    const unsubscribe = vi.fn();
    data.onChange.mockReturnValue(unsubscribe);
    const callback = vi.fn();
    const off = onDataChanged('@me/dnd5e:monsters', callback);
    expect(data.onChange).toHaveBeenCalledWith('@me/dnd5e:monsters', callback);
    expect(off).toBe(unsubscribe);
  });
});
