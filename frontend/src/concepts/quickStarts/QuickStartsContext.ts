import React from 'react';
import type { QuickStartContextValues } from '@patternfly/quickstarts';

export type { QuickStartContextValues } from '@patternfly/quickstarts';

export const QuickStartsContext = React.createContext<QuickStartContextValues>({
  allQuickStarts: [],
  activeQuickStartID: '',
  allQuickStartStates: {},
});
