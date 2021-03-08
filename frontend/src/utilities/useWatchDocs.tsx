import * as React from 'react';
import * as _ from 'lodash';
import { ODHDoc, ODHDocType } from '../types';
import { POLL_INTERVAL } from './const';
import { fetchDocs } from '../services/docsService';

export const useWatchDocs = (
  docType?: ODHDocType | 'getting-started',
): {
  docs: ODHDoc[];
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [docs, setDocs] = React.useState<ODHDoc[]>([]);

  React.useEffect(() => {
    let watchHandle;
    const watchQuickStarts = () => {
      fetchDocs(docType)
        .then((updatedDocs: ODHDoc[]) => {
          setLoaded(true);
          setLoadError(undefined);
          if (!_.isEqual(docs, updatedDocs)) {
            setDocs(updatedDocs);
          }
        })
        .catch((e) => {
          setLoadError(e);
        });
      watchHandle = setTimeout(watchQuickStarts, POLL_INTERVAL);
    };
    watchQuickStarts();

    return () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
    // Don't update when docs are updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType]);

  return { docs, loaded, loadError };
};
