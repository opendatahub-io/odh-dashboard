import * as React from 'react';
import { HostApiContext } from '../HostApiContext';

export const useDashboardNamespace = (): { dashboardNamespace: string } => {
  const { dashboardNamespace } = React.useContext(HostApiContext);
  return React.useMemo(() => ({ dashboardNamespace }), [dashboardNamespace]);
};
