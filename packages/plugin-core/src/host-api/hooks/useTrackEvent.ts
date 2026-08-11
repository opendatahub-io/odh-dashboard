import * as React from 'react';
import { HostApiContext } from '../HostApiContext';

export const useTrackEvent = (): ((
  eventName: string,
  properties: Record<string, string | number | boolean | undefined>,
) => void) => {
  const { trackEvent } = React.useContext(HostApiContext);
  return trackEvent;
};
