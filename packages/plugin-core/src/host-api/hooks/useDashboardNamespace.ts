import * as React from 'react';
import { HostApiCoreContext } from '../HostApiCoreContext';

export const useDashboardNamespace = (): { dashboardNamespace: string } => {
  const { dashboardNamespace } = React.useContext(HostApiCoreContext);
  return React.useMemo(() => ({ dashboardNamespace }), [dashboardNamespace]);
};
