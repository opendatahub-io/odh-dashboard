import * as React from 'react';
import { OdhDocument, OdhDocumentType } from '../types';
import { POLL_INTERVAL } from './const';
import { fetchDocs } from '../services/docsService';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';

export const useWatchDocs = (
  docType?: OdhDocumentType | 'getting-started',
): {
  docs: OdhDocument[];
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [docs, setDocs] = React.useState<OdhDocument[]>([]);

  React.useEffect(() => {
    let watchHandle;
    const watchDocs = () => {
      fetchDocs(docType)
        .then((updatedDocs: OdhDocument[]) => {
          setLoaded(true);
          setLoadError(undefined);
          setDocs(updatedDocs);
        })
        .catch((e) => {
          setLoadError(e);
        });
      watchHandle = setTimeout(watchDocs, POLL_INTERVAL);
    };
    watchDocs();

    return () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
    // Don't update when docs are updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType]);

  const retDocs = useDeepCompareMemoize<OdhDocument[]>(docs);

  return { docs: retDocs, loaded, loadError };
};
