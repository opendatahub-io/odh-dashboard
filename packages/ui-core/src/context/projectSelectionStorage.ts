import { PREFERRED_NAMESPACE_STORAGE_KEY } from './getStoredPreferredProject';

export type ProjectSelectionStorage = {
  read: () => string | null;
  write: (projectName: string) => void;
  remove: () => void;
  subscribe: (onProjectName: (projectName: string | null) => void) => () => void;
};

type StorageGetter = () => Storage;
type WindowGetter = () => Window;

const parseStoredProjectName = (rawValue: string | null): string | null => {
  if (!rawValue) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawValue);
    return typeof parsed === 'string' ? parsed || null : rawValue;
  } catch {
    return rawValue;
  }
};

export const createProjectSelectionStorage = (
  getStorage: StorageGetter = () => localStorage,
  getWindow: WindowGetter = () => window,
): ProjectSelectionStorage => ({
  read: () => {
    try {
      return parseStoredProjectName(getStorage().getItem(PREFERRED_NAMESPACE_STORAGE_KEY));
    } catch {
      return null;
    }
  },
  write: (projectName) => {
    try {
      getStorage().setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify(projectName));
    } catch {
      return undefined;
    }
  },
  remove: () => {
    try {
      getStorage().removeItem(PREFERRED_NAMESPACE_STORAGE_KEY);
    } catch {
      return undefined;
    }
  },
  subscribe: (onProjectName) => {
    let browserWindow: Window;
    let browserStorage: Storage;
    try {
      browserWindow = getWindow();
      browserStorage = getStorage();
    } catch {
      return () => undefined;
    }
    const listener = (event: StorageEvent): void => {
      if (event.key === PREFERRED_NAMESPACE_STORAGE_KEY && event.storageArea === browserStorage) {
        onProjectName(parseStoredProjectName(event.newValue));
      }
    };
    try {
      browserWindow.addEventListener('storage', listener);
    } catch {
      return () => undefined;
    }
    return () => {
      try {
        browserWindow.removeEventListener('storage', listener);
      } catch {
        return undefined;
      }
    };
  },
});

export const projectSelectionStorage = createProjectSelectionStorage();
