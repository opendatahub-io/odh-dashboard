import * as React from 'react';
import { NotebookRunningState, UsernameMap } from '#~/types';
import { getNotebookAndStatus } from '#~/services/notebookService';
import { POLL_INTERVAL } from './const';
import { generateNotebookNameFromUsername } from './notebookControllerUtils';
import { allSettledPromises } from './allSettledPromises';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';

const useWatchNotebooksForUsers = (
  projectName: string,
  listOfUsers: string[],
): {
  notebooks: UsernameMap<NotebookRunningState | undefined>;
  loaded: boolean;
  loadError: Error | undefined;
  forceRefresh: (usernames?: string[]) => void;
  setPollInterval: (interval?: number) => void;
} => {
  const usernames = useDeepCompareMemoize(listOfUsers);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [notebooks, setNotebooks] = React.useState<UsernameMap<NotebookRunningState>>({});
  const [pollInterval, setPollInterval] = React.useState(POLL_INTERVAL);

  const getNotebooks = React.useCallback(
    (usernameList: string[]) => {
      if (usernameList.length === 0) {
        return;
      }

      allSettledPromises<{ name: string; data: NotebookRunningState }, Error>(
        usernameList.map((username) => {
          const notebookName = generateNotebookNameFromUsername(username);
          return getNotebookAndStatus(projectName, notebookName, null).then((data) => ({
            name: username,
            data,
          }));
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

          const newNotebooks = successes.reduce<UsernameMap<NotebookRunningState>>(
            (acc, { value }) => {
              acc[value.name] = value.data;
              return acc;
            },
            {},
          );
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

  const setPollIntervalSafe = React.useCallback((newPollInterval?: number) => {
    setPollInterval(newPollInterval ?? POLL_INTERVAL);
  }, []);

  React.useEffect(() => {
    getNotebooks(usernames);
    const watchHandle = setInterval(() => getNotebooks(usernames), pollInterval);

    return () => {
      clearInterval(watchHandle);
    };
  }, [pollInterval, getNotebooks, usernames]);

  return { notebooks, loaded, loadError, forceRefresh, setPollInterval: setPollIntervalSafe };
};

export default useWatchNotebooksForUsers;
