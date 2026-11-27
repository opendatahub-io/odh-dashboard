import { act, renderHook, waitFor } from '@testing-library/react';
import { useRecentProjects } from '../useRecentProjects';

const storageKey = 'test-recent-projects';

const deferred = () => {
  let resolve: (project: { name: string }) => void = () => undefined;
  const promise = new Promise<{ name: string }>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

describe('useRecentProjects', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  const options = () => ({
    storageKey,
    enabled: true,
    validateProject: jest
      .fn<Promise<{ name: string } | null>, [string, AbortSignal]>()
      .mockImplementation(async (name) => ({ name })),
    onProjectRestored: jest.fn(),
  });

  it('should restore only valid, unique stored resource names through the provider', async () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify(['first', 'BAD NAME', 123, null, {}, 'first', 'second', 'a'.repeat(64)]),
    );
    const input = options();
    renderHook(() => useRecentProjects(input));

    await waitFor(() => expect(input.onProjectRestored).toHaveBeenCalledTimes(2));
    expect(input.validateProject).toHaveBeenCalledTimes(2);
    expect(input.validateProject).toHaveBeenCalledWith('first', expect.any(AbortSignal));
    expect(input.validateProject).toHaveBeenCalledWith('second', expect.any(AbortSignal));
    expect(input.onProjectRestored).toHaveBeenCalledWith({ name: 'first' });
    expect(input.onProjectRestored).toHaveBeenCalledWith({ name: 'second' });
  });

  it.each([null, 'invalid json', '{}', 'null', '"first"', '[]'])(
    'should ignore malformed or empty stored entries: %s',
    async (raw) => {
      if (raw !== null) {
        localStorage.setItem(storageKey, raw);
      }
      const input = options();
      renderHook(() => useRecentProjects(input));
      await act(async () => undefined);
      expect(input.validateProject).not.toHaveBeenCalled();
      expect(input.onProjectRestored).not.toHaveBeenCalled();
    },
  );

  it('should wait until restoration is enabled and avoid restarting on unrelated rerenders', async () => {
    localStorage.setItem(storageKey, JSON.stringify(['first']));
    const input = options();
    const lookup = deferred();
    input.validateProject.mockReturnValue(lookup.promise);
    let renders = 0;
    const { rerender, result } = renderHook(
      ({ enabled }) => {
        renders += 1;
        return useRecentProjects({ ...input, enabled });
      },
      { initialProps: { enabled: false } },
    );
    const remember = result.current;
    expect(input.validateProject).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(input.validateProject).toHaveBeenCalledTimes(1));
    rerender({ enabled: true });
    await act(async () => lookup.resolve({ name: 'first' }));

    expect(input.validateProject).toHaveBeenCalledTimes(1);
    expect(input.onProjectRestored).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(remember);
    expect(renders).toBe(3);
  });

  it('should retain full provider resources without selecting or rewriting storage', async () => {
    localStorage.setItem(storageKey, JSON.stringify(['first']));
    const resource = { name: 'first', displayName: 'First project', ai: true };
    const input = options();
    input.validateProject.mockResolvedValue(resource);
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    renderHook(() => useRecentProjects(input));

    await waitFor(() => expect(input.onProjectRestored).toHaveBeenCalledWith(resource));
    expect(input.onProjectRestored.mock.calls[0][0]).toBe(resource);
    expect(setItem).not.toHaveBeenCalled();
  });

  it.each(['rejection', 'synchronous failure'])(
    'should skip a provider %s without blocking other recent entries',
    async (failure) => {
      localStorage.setItem(storageKey, JSON.stringify(['denied', 'allowed']));
      const input = options();
      input.validateProject.mockImplementation((name) => {
        if (name === 'denied') {
          if (failure === 'synchronous failure') {
            throw new Error('No access');
          }
          return Promise.reject(new Error('No access'));
        }
        return Promise.resolve({ name });
      });
      renderHook(() => useRecentProjects(input));

      await waitFor(() =>
        expect(input.onProjectRestored).toHaveBeenCalledWith({ name: 'allowed' }),
      );
      expect(input.onProjectRestored).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(['denied', 'allowed']));
    },
  );

  it.each(['disabled', 'unmount', 'storage key', 'provider'])(
    'should abort pending restoration and ignore late responses after changing %s',
    async (change) => {
      localStorage.setItem(storageKey, JSON.stringify(['first']));
      const input = options();
      const lookup = deferred();
      input.validateProject.mockReturnValue(lookup.promise);
      const { rerender, unmount } = renderHook((props) => useRecentProjects(props), {
        initialProps: input,
      });
      await waitFor(() => expect(input.validateProject).toHaveBeenCalledTimes(1));
      const signal = input.validateProject.mock.calls[0][1];
      if (change === 'disabled') {
        rerender({ ...input, enabled: false });
      } else if (change === 'storage key') {
        rerender({ ...input, storageKey: 'other-projects' });
      } else if (change === 'provider') {
        rerender({
          ...input,
          validateProject: jest.fn().mockRejectedValue(new Error('No access')),
        });
      } else {
        unmount();
      }
      expect(signal.aborted).toBe(true);
      await act(async () => lookup.resolve({ name: 'first' }));
      expect(input.onProjectRestored).not.toHaveBeenCalled();
    },
  );

  it('should remember resource names in the existing format, newest first without duplicates', () => {
    localStorage.setItem(storageKey, JSON.stringify(['first', 'second', 'first', 'BAD NAME']));
    const { result } = renderHook(() => useRecentProjects({ ...options(), enabled: false }));
    act(() => result.current('second'));
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(['second', 'first']));
    act(() => result.current('third'));
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(['third', 'second', 'first']));
    act(() => result.current('BAD NAME'));
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(['third', 'second', 'first']));
  });

  it('should limit restoration and remembered entries to the ten newest unique names', async () => {
    const names = Array.from({ length: 12 }, (_, index) => `project-${index}`);
    localStorage.setItem(storageKey, JSON.stringify(['BAD NAME', names[0], ...names]));
    const input = options();
    const { result } = renderHook(() => useRecentProjects(input));
    await waitFor(() => expect(input.onProjectRestored).toHaveBeenCalledTimes(10));
    expect(input.validateProject.mock.calls.map(([name]) => name)).toEqual(names.slice(0, 10));
    act(() => result.current('newest'));
    expect(JSON.parse(localStorage.getItem(storageKey) ?? 'null')).toEqual([
      'newest',
      ...names.slice(0, 9),
    ]);
    act(() => result.current(names[4]));
    expect(JSON.parse(localStorage.getItem(storageKey) ?? 'null')).toEqual([
      names[4],
      'newest',
      ...names.slice(0, 9).filter((name) => name !== names[4]),
    ]);
  });

  it('should prune confirmed unavailable names and retry transient failures on the next load', async () => {
    localStorage.setItem(storageKey, JSON.stringify(['missing', 'retry', 'allowed']));
    const input = options();
    input.validateProject.mockImplementation(async (name) => {
      if (name === 'missing') return null;
      if (name === 'retry') throw new Error('Service unavailable');
      return { name };
    });
    const first = renderHook(() => useRecentProjects(input));
    await waitFor(() =>
      expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(['retry', 'allowed'])),
    );
    expect(input.onProjectRestored).toHaveBeenCalledTimes(1);
    first.unmount();
    input.validateProject.mockClear();
    renderHook(() => useRecentProjects(input));
    await waitFor(() => expect(input.validateProject).toHaveBeenCalledTimes(2));
    expect(input.validateProject.mock.calls.map(([name]) => name)).toEqual(['retry', 'allowed']);
  });

  it.each(['unmount', 'disable', 'storage key', 'external addition', 're-add'])(
    'should not prune delayed failures after %s',
    async (change) => {
      localStorage.setItem(storageKey, JSON.stringify(['first']));
      let resolve: (value: null) => void = () => undefined;
      const lookup = new Promise<null>((complete) => {
        resolve = complete;
      });
      const input = options();
      input.validateProject.mockReturnValue(lookup);
      const { result, rerender, unmount } = renderHook((props) => useRecentProjects(props), {
        initialProps: input,
      });
      await waitFor(() => expect(input.validateProject).toHaveBeenCalledTimes(1));
      if (change === 'unmount') unmount();
      else if (change === 'disable') rerender({ ...input, enabled: false });
      else if (change === 'storage key') rerender({ ...input, storageKey: 'other-recents' });
      else if (change === 'external addition') {
        localStorage.setItem(storageKey, JSON.stringify(['newest', 'first']));
      } else act(() => result.current('first'));
      const current = localStorage.getItem(storageKey);
      await act(async () => resolve(null));
      expect(localStorage.getItem(storageKey)).toBe(current);
      expect(input.onProjectRestored).not.toHaveBeenCalled();
    },
  );

  it('should tolerate a failed prune write without blocking valid restored projects', async () => {
    localStorage.setItem(storageKey, JSON.stringify(['missing', 'allowed']));
    const input = options();
    input.validateProject.mockImplementation(async (name) =>
      name === 'missing' ? null : { name },
    );
    const write = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    renderHook(() => useRecentProjects(input));
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    expect(input.onProjectRestored).toHaveBeenCalledWith({ name: 'allowed' });
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(['missing', 'allowed']));
  });

  it.each(['getter', 'read', 'write'])(
    'should tolerate storage %s failures without preventing in-memory operation',
    async (failure) => {
      if (failure === 'getter') {
        jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
          throw new Error('Blocked');
        });
      } else {
        jest
          .spyOn(Storage.prototype, failure === 'read' ? 'getItem' : 'setItem')
          .mockImplementation(() => {
            throw new Error('Blocked');
          });
      }
      const input = options();
      const { result } = renderHook(() => useRecentProjects(input));
      expect(() => result.current('first')).not.toThrow();
      await act(async () => undefined);
      expect(input.onProjectRestored).not.toHaveBeenCalled();
    },
  );
});
