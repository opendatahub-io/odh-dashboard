import * as React from 'react';
import type { LocalQueueKind } from '@odh-dashboard/k8s-core';
import type { FetchStateObject } from '../hooks/useFetch';
import { DEFAULT_LIST_FETCH_STATE } from '../utilities/fetchState';

export type LocalQueuesContextType = {
  localQueues: FetchStateObject<LocalQueueKind[]>;
};

export const LocalQueuesContext = React.createContext<LocalQueuesContextType>({
  localQueues: DEFAULT_LIST_FETCH_STATE as FetchStateObject<LocalQueueKind[]>,
});
