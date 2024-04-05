import * as React from 'react';
import { useAppContext } from '~/app/AppContext';
import { AreaContext } from '~/concepts/areas/AreaContext';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { IsAreaAvailableStatus, SupportedArea } from './types';
import { isAreaAvailable } from './utils';

const useIsAreaAvailable = (area: SupportedArea): IsAreaAvailableStatus => {
  const { dashboardConfig } = useAppContext();
  const { dscStatus, dsciStatus } = React.useContext(AreaContext);

  const dashboardConfigSpecSafe = useDeepCompareMemoize(dashboardConfig.spec);
  const dscStatusSafe = useDeepCompareMemoize(dscStatus);
  const dsciStatusSafe = useDeepCompareMemoize(dsciStatus);

  return React.useMemo(
    () => isAreaAvailable(area, dashboardConfigSpecSafe, dscStatusSafe, dsciStatusSafe),
    [area, dashboardConfigSpecSafe, dscStatusSafe, dsciStatusSafe],
  );
};

export default useIsAreaAvailable;
