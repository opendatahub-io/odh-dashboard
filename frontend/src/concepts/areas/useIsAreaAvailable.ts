import * as React from 'react';
import { useAppContext } from '~/app/AppContext';
import { AreaContext } from '~/concepts/areas/AreaContext';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { IsAreaAvailableStatus, SupportedArea } from './types';
import { isAreaAvailable } from './utils';

const useIsAreaAvailable = (area: SupportedArea): IsAreaAvailableStatus => {
  const { dashboardConfig } = useAppContext();
  const { dscStatus } = React.useContext(AreaContext);

  const dashboardConfigSpecSafe = useDeepCompareMemoize(dashboardConfig.spec);
  const dscStatusSafe = useDeepCompareMemoize(dscStatus);

  return React.useMemo(
    () => isAreaAvailable(area, dashboardConfigSpecSafe, dscStatusSafe),
    [area, dashboardConfigSpecSafe, dscStatusSafe],
  );
};

export default useIsAreaAvailable;
