import * as React from 'react';
import { HostApiCoreContext } from '../HostApiCoreContext';

export const useTrackEvent = (): ((
  eventName: string,
  properties: Record<string, string | number | boolean | undefined>,
) => void) => {
  const { trackEvent } = React.useContext(HostApiCoreContext);
  return trackEvent;
};
