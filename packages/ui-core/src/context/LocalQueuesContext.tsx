import * as React from 'react';
import type { LocalQueueKind } from '@odh-dashboard/k8s-core';
import type { FetchStateObject } from '../hooks/useFetch';

export type LocalQueuesContextType = {
  localQueues: FetchStateObject<LocalQueueKind[]>;
};

export const LocalQueuesContext = React.createContext<LocalQueuesContextType>({
  localQueues: {
    data: [],
    loaded: false,
    refresh: () => Promise.resolve(undefined),
  },
});
