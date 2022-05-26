import * as React from 'react';
import * as _ from 'lodash';
import { ConsoleLinkKind } from '../types';
import { POLL_INTERVAL } from './const';
import { fetchConsoleLinks } from '../services/consoleLinksService';

export type ConsoleLinkResults = {
  consoleLinks: ConsoleLinkKind[];
  loaded: boolean;
  loadError?: Error;
};

export const useWatchConsoleLinks = (): ConsoleLinkResults => {
  const [results, setResults] = React.useState<ConsoleLinkResults>({
    consoleLinks: [],
    loaded: false,
  });
  const previousResults = React.useRef<ConsoleLinkResults>({
    consoleLinks: [],
    loaded: false,
  });

  React.useEffect(() => {
    let watchHandle;
    const watchConsoleLinks = () => {
      fetchConsoleLinks()
        .then((consoleLinks: ConsoleLinkKind[]) => {
          const newResults: ConsoleLinkResults = {
            consoleLinks,
            loaded: true,
          };
          if (!_.isEqual(newResults, previousResults.current)) {
            setResults(newResults);
            previousResults.current = newResults;
          }
        })
        .catch((e) => {
          setResults({ consoleLinks: [], loaded: false, loadError: e });
        });
      watchHandle = setTimeout(watchConsoleLinks, POLL_INTERVAL);
    };
    watchConsoleLinks();

    return () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
  }, []);

  return results;
};
