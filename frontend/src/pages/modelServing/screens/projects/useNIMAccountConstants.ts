import * as React from 'react';
import { fetchNIMAccountConstants } from '~/pages/modelServing/screens/projects/nimUtils';
import { useDashboardNamespace } from '~/redux/selectors';
import { NIMAccountConstants } from '~/types';

export const useNIMAccountConstants = (): NIMAccountConstants | undefined => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [constants, setConstants] = React.useState<NIMAccountConstants>();

  React.useEffect(() => {
    const fetchConstants = async () => {
      const nimConstants = await fetchNIMAccountConstants(dashboardNamespace);
      setConstants(nimConstants);
    };

    fetchConstants();
  }, [dashboardNamespace]);

  return constants;
};
