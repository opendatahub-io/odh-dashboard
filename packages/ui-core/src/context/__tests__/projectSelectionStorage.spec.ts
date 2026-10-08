import { PREFERRED_NAMESPACE_STORAGE_KEY } from '../getStoredPreferredProject';
import { createProjectSelectionStorage } from '../projectSelectionStorage';

describe('createProjectSelectionStorage', () => {
  it.each([
    ['"project"', 'project'],
    ['123', '123'],
    ['true', 'true'],
  ])('should read JSON and legacy raw values', (storedValue, expectedProject) => {
    const storage = createProjectSelectionStorage(
      () => ({ getItem: () => storedValue } as unknown as Storage),
      () => window,
    );

    expect(storage.read()).toBe(expectedProject);
  });

  it('should write and remove the shared key', () => {
    const setItem = jest.fn();
    const removeItem = jest.fn();
    const storage = createProjectSelectionStorage(
      () => ({ setItem, removeItem } as unknown as Storage),
      () => window,
    );

    storage.write('next-project');
    storage.remove();
    expect(setItem).toHaveBeenCalledWith(PREFERRED_NAMESPACE_STORAGE_KEY, '"next-project"');
    expect(removeItem).toHaveBeenCalledWith(PREFERRED_NAMESPACE_STORAGE_KEY);
  });

  it('should guard read, write, and remove failures', () => {
    const failure = (): never => {
      throw new Error('storage unavailable');
    };
    const storage = createProjectSelectionStorage(
      () => ({ getItem: failure, setItem: failure, removeItem: failure } as unknown as Storage),
      () => window,
    );

    expect(storage.read()).toBeNull();
    expect(() => storage.write('project')).not.toThrow();
    expect(() => storage.remove()).not.toThrow();
  });

  it('should publish parsed storage events and unsubscribe', () => {
    const storage = createProjectSelectionStorage(
      () => localStorage,
      () => window,
    );
    const listener = jest.fn();
    const unsubscribe = storage.subscribe(listener);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: PREFERRED_NAMESPACE_STORAGE_KEY,
        newValue: '"external-project"',
        storageArea: localStorage,
      }),
    );
    expect(listener).toHaveBeenCalledWith('external-project');

    unsubscribe();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: PREFERRED_NAMESPACE_STORAGE_KEY,
        newValue: '"ignored"',
        storageArea: localStorage,
      }),
    );
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should ignore events from a different storage area', () => {
    const storage = createProjectSelectionStorage(
      () => localStorage,
      () => window,
    );
    const listener = jest.fn();
    const unsubscribe = storage.subscribe(listener);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: PREFERRED_NAMESPACE_STORAGE_KEY,
        newValue: '"external-project"',
        storageArea: sessionStorage,
      }),
    );

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('should guard listener setup failures', () => {
    const storage = createProjectSelectionStorage(
      () => localStorage,
      () =>
        ({
          addEventListener: () => {
            throw new Error('listener setup failed');
          },
        } as unknown as Window),
    );

    let unsubscribe: (() => void) | undefined;
    expect(() => {
      unsubscribe = storage.subscribe(jest.fn());
    }).not.toThrow();
    expect(() => unsubscribe?.()).not.toThrow();
  });

  it('should guard listener cleanup failures', () => {
    const storage = createProjectSelectionStorage(
      () => localStorage,
      () =>
        ({
          addEventListener: jest.fn(),
          removeEventListener: () => {
            throw new Error('listener cleanup failed');
          },
        } as unknown as Window),
    );

    const unsubscribe = storage.subscribe(jest.fn());

    expect(() => unsubscribe()).not.toThrow();
  });
});
