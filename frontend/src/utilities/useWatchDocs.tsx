import * as React from 'react';
import { OdhDocument, OdhDocumentType } from '#~/types';
import { fetchDocs } from '#~/services/docsService';
import { POLL_INTERVAL } from './const';
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
    let watchHandle: ReturnType<typeof setTimeout>;
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
      clearTimeout(watchHandle);
    };
  }, [docType]);

  const retDocs = useDeepCompareMemoize<OdhDocument[]>(docs);

  return { docs: retDocs, loaded, loadError };
};
