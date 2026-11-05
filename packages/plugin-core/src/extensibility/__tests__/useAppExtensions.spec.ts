import { act, renderHook, waitFor } from '@testing-library/react';
import { init, loadRemote } from '@module-federation/runtime';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { useAppExtensions } from '../useAppExtensions';

jest.mock('@module-federation/runtime', () => ({
  init: jest.fn(),
  loadRemote: jest.fn(),
}));

const mockInit = jest.mocked(init);
const mockLoadRemote = jest.mocked(loadRemote);

const ext = (type: string): Extension => ({ type, properties: {} });
const staticExtensions = { staticPlugin: [ext('static')] };

describe('useAppExtensions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return empty extensions and loaded when called without arguments', () => {
    const { result } = renderHook(() => useAppExtensions());
    expect(result.current).toEqual([{}, true]);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('should return static extensions immediately when there are no remotes', () => {
    const { result } = renderHook(() => useAppExtensions(staticExtensions));
    expect(result.current).toEqual([staticExtensions, true]);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('should be loaded for an empty remotes list without initializing federation', async () => {
    const { result } = renderHook(() => useAppExtensions(staticExtensions, '[]'));
    await waitFor(() => expect(result.current).toEqual([staticExtensions, true]));
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('should merge extensions loaded from remotes with static extensions', async () => {
    mockLoadRemote.mockImplementation((id: string) => Promise.resolve({ default: [ext(id)] }));
    const remotes = JSON.stringify([
      { name: 'remoteA', remoteEntry: '/remoteEntry.js' },
      { name: 'remoteB', remoteEntry: '/remoteEntry.js' },
    ]);

    const { result } = renderHook(() => useAppExtensions(staticExtensions, remotes));
    expect(result.current[1]).toBe(false);

    await waitFor(() => expect(result.current[1]).toBe(true));
    expect(result.current[0]).toEqual({
      ...staticExtensions,
      remoteA: [ext('remoteA/extensions')],
      remoteB: [ext('remoteB/extensions')],
    });
    expect(mockInit).toHaveBeenCalledWith({
      name: 'app',
      remotes: [
        { name: 'remoteA', entry: '/_mf/remoteA/remoteEntry.js' },
        { name: 'remoteB', entry: '/_mf/remoteB/remoteEntry.js' },
      ],
    });
  });

  it('should register a failed remote with no extensions and still finish loading', async () => {
    mockLoadRemote.mockImplementation((id: string) =>
      id === 'broken/extensions'
        ? Promise.reject(new Error('unreachable'))
        : Promise.resolve({ default: [ext(id)] }),
    );
    const remotes = JSON.stringify([
      { name: 'broken', remoteEntry: '/remoteEntry.js' },
      { name: 'ok', remoteEntry: '/remoteEntry.js' },
    ]);

    const { result } = renderHook(() => useAppExtensions(undefined, remotes));

    await waitFor(() => expect(result.current[1]).toBe(true));
    expect(result.current[0]).toEqual({ broken: [], ok: [ext('ok/extensions')] });
  });

  it('should finish loading with static extensions when the remotes JSON is invalid', async () => {
    const { result } = renderHook(() => useAppExtensions(staticExtensions, 'not-json'));
    await waitFor(() => expect(result.current).toEqual([staticExtensions, true]));
    expect(mockInit).not.toHaveBeenCalled();
  });

  describe('when mfRemotes changes', () => {
    const remotesFor = (...names: string[]) =>
      JSON.stringify(names.map((name) => ({ name, remoteEntry: '/remoteEntry.js' })));

    beforeEach(() => {
      mockLoadRemote.mockImplementation((id: string) => Promise.resolve({ default: [ext(id)] }));
    });

    it('should return a stable value when rerendered with the same inputs', async () => {
      const { result, rerender } = renderHook(() =>
        useAppExtensions(staticExtensions, remotesFor('remoteA')),
      );
      await waitFor(() => expect(result.current[1]).toBe(true));
      const first = result.current[0];
      rerender();
      expect(result.current[0]).toBe(first);
    });

    it('should drop remote extensions when the remotes are removed', async () => {
      const { result, rerender } = renderHook(
        ({ remotes }: { remotes?: string }) => useAppExtensions(staticExtensions, remotes),
        { initialProps: { remotes: remotesFor('remoteA') } as { remotes?: string } },
      );
      await waitFor(() => expect(result.current[0]).toHaveProperty('remoteA'));

      rerender({ remotes: undefined });
      expect(result.current).toEqual([staticExtensions, true]);
    });

    it('should replace, not merge, extensions when the remotes change', async () => {
      const { result, rerender } = renderHook(
        ({ remotes }: { remotes: string }) => useAppExtensions(staticExtensions, remotes),
        { initialProps: { remotes: remotesFor('remoteA') } },
      );
      await waitFor(() => expect(result.current[0]).toHaveProperty('remoteA'));

      rerender({ remotes: remotesFor('remoteB') });
      expect(result.current).toEqual([staticExtensions, false]);

      await waitFor(() => expect(result.current[1]).toBe(true));
      expect(result.current[0]).toEqual({
        ...staticExtensions,
        remoteB: [ext('remoteB/extensions')],
      });
    });

    it('should ignore a superseded load that resolves after the remotes changed', async () => {
      let resolveA: (value: { default: Extension[] }) => void = () => undefined;
      mockLoadRemote.mockImplementation((id: string) =>
        id === 'remoteA/extensions'
          ? new Promise((resolve) => {
              resolveA = resolve;
            })
          : Promise.resolve({ default: [ext(id)] }),
      );
      const { result, rerender } = renderHook(
        ({ remotes }: { remotes: string }) => useAppExtensions(staticExtensions, remotes),
        { initialProps: { remotes: remotesFor('remoteA') } },
      );

      rerender({ remotes: remotesFor('remoteB') });
      await waitFor(() => expect(result.current[1]).toBe(true));

      await act(async () => {
        resolveA({ default: [ext('remoteA/extensions')] });
      });
      expect(result.current[0]).toEqual({
        ...staticExtensions,
        remoteB: [ext('remoteB/extensions')],
      });
    });
  });
});
