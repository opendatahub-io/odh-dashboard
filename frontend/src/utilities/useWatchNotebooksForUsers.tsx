import * as React from 'react';
import { Notebook } from '../types';
import { POLL_INTERVAL } from './const';
import { getNotebook } from 'services/notebookService';
import { generateNotebookNameFromUsername } from './notebookControllerUtils';
import { allSettledPromises } from './allSettledPromises';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';

const useWatchNotebooksForUsers = (
  projectName: string,
  listOfUsers: string[],
): {
  notebooks: { [username: string]: Notebook };
  loaded: boolean;
  loadError: Error | undefined;
  forceRefresh: (usernames?: string[]) => void;
  setPollInterval: (interval: number) => void;
} => {
  const usernames = useDeepCompareMemoize(listOfUsers);
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [notebooks, setNotebooks] = React.useState<{ [username: string]: Notebook }>({});
  const [pollInterval, setPollInterval] = React.useState<number>(POLL_INTERVAL);

  const getNotebooks = React.useCallback(
    (usernameList: string[]) => {
      allSettledPromises<{ name: string; data: Notebook }, Error>(
        usernameList.map((username) => {
          const notebookName = generateNotebookNameFromUsername(username);
          return getNotebook(projectName, notebookName).then((data) => ({ name: username, data }));
        }),
      )
        .then(([successes, fails]) => {
          if (fails.length > 0) {
            if (fails.length === 1) {
              setLoadError(new Error(`Failed to fetch notebook. ${fails[0].reason.toString()}`));
            } else {
              setLoadError(
                new Error(
                  `Failed to fetch ${fails.length} notebooks. ${fails.map(
                    ({ reason }) => `\n  - ${reason.message}`,
                  )}`,
                ),
              );
            }
          } else {
            setLoadError(undefined);
          }

          const newNotebooks = successes.reduce((notebookMap, { value }) => {
            notebookMap[value.name] = value.data;
            return notebookMap;
          }, {});
          setNotebooks((prevState) => ({ ...prevState, ...newNotebooks }));
          setLoaded(true);
        })
        .catch((e) => {
          setLoadError(e);
          setNotebooks({});
          setLoaded(false);
        });
    },
    [projectName],
  );

  const forceRefresh = React.useCallback(
    (selectUsernames?: string[]) => {
      getNotebooks(selectUsernames ?? usernames);
    },
    [getNotebooks, usernames],
  );

  React.useEffect(() => {
    getNotebooks(usernames);
    const watchHandle = setInterval(() => getNotebooks(usernames), pollInterval);

    return () => {
      if (watchHandle) {
        clearInterval(watchHandle);
      }
    };
  }, [pollInterval, getNotebooks, usernames]);

  return { notebooks, loaded, loadError, forceRefresh, setPollInterval };
};

export default useWatchNotebooksForUsers;
