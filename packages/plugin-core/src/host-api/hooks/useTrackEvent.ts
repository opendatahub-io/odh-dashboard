import * as React from 'react';
import { HostApiCoreContext } from '../HostApiCoreContext';
import type { HostApiCoreServices } from '../types';

export const useTrackEvent = (): HostApiCoreServices['trackEvent'] => {
  const { trackEvent } = React.useContext(HostApiCoreContext);
  return trackEvent;
};
