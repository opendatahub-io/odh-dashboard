import * as React from 'react';
import {
  QuickStartsContext,
  type QuickStartContextValues,
} from '#~/concepts/quickStarts/QuickStartsContext';
import { launchQuickStart as launchQuickStartUtil } from './quickStartUtils';

type UseQuickStartResult = {
  launchQuickStart: (quickStartId: string) => void;
  qsContext: QuickStartContextValues;
};

export const useQuickStart = (): UseQuickStartResult => {
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartsContext);

  const launchQuickStart = React.useCallback(
    (quickStartId: string) => {
      launchQuickStartUtil(quickStartId, qsContext);
    },
    [qsContext],
  );

  return {
    launchQuickStart,
    qsContext,
  };
};
