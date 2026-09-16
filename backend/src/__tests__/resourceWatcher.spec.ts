import { KubeFastifyInstance } from '../types';
import { ResourceWatcher } from '../utils/resourceWatcher';

describe('ResourceWatcher', () => {
  it('should retain a fetch failure until a later successful refresh clears it', async () => {
    jest.useFakeTimers();
    const resource = { name: 'default-aihub' };
    const getter = jest.fn().mockResolvedValue([resource]);
    const watcher = new ResourceWatcher(
      {} as KubeFastifyInstance,
      getter,
      undefined,
      60 * 60 * 1000,
      60 * 60 * 1000,
    );

    await watcher.updateResults();
    expect(watcher.getResources()).toEqual([resource]);
    expect(watcher.getLastError()).toBeUndefined();

    const forbidden = { response: { statusCode: 403 } };
    getter.mockRejectedValueOnce(forbidden);
    await expect(watcher.updateResults()).rejects.toBe(forbidden);
    expect(watcher.getResources()).toEqual([resource]);
    expect(watcher.getLastError()).toBe(forbidden);

    getter.mockResolvedValueOnce([resource]);
    await watcher.updateResults();
    expect(watcher.getLastError()).toBeUndefined();

    watcher.stopWatching();
    jest.clearAllTimers();
    jest.useRealTimers();
  });
});
