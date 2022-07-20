import { Notebook } from '../types';
import useWatchNotebooksForUsers from './useWatchNotebooksForUsers';

export const useWatchNotebook = (
  projectName: string,
  username: string,
): {
  notebook?: Notebook;
  loaded: boolean;
  loadError?: Error;
  setPollInterval: (interval: number) => void;
} => {
  const { notebooks, loaded, loadError, setPollInterval } = useWatchNotebooksForUsers(projectName, [
    username,
  ]);
  const notebook = notebooks[username];

  return { notebook, loaded, loadError, setPollInterval };
};
