import { QuickStartContext, QuickStartContextValues } from '@patternfly/quickstarts';
import * as React from 'react';
import { launchQuickStart as launchQuickStartUtil } from './quickStartUtils';

type UseQuickStartResult = {
  launchQuickStart: (quickStartId: string) => void;
  qsContext: QuickStartContextValues;
};

export const useQuickStart = (): UseQuickStartResult => {
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);

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
