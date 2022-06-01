import * as React from 'react';
import { OdhDocument, OdhDocumentType } from '../types';
import { fetchDocs } from '../services/docsService';
import { useFetchWatcher } from './useFetchWatcher';

export type WatchDocsResults = {
  results: OdhDocument[] | null;
  loaded: boolean;
  loadError?: Error;
};

export const useWatchDocs = (docType?: OdhDocumentType | 'getting-started'): WatchDocsResults => {
  const getDocs = React.useCallback(() => {
    return fetchDocs(docType);
  }, [docType]);

  return useFetchWatcher<OdhDocument[]>(getDocs);
};
