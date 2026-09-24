import * as React from 'react';
import { fetchOperatorSubscriptionStatus, type K8sAPIOptions } from '@odh-dashboard/k8s-core';
import {
  ClusterDetailsVariablesProvider,
  fetchClusterDetails,
} from '@odh-dashboard/observability/dashboard';
import useFetch from '@odh-dashboard/ui-core/hooks/useFetch';
import { PORTAL_BASE_PATH } from '../portalPaths';

const PortalClusterDetailsVariablesProvider: React.FC = () => {
  const fetchDetails = React.useCallback(async (options: K8sAPIOptions) => {
    const [details, subscriptionStatus] = await Promise.all([
      fetchClusterDetails(),
      fetchOperatorSubscriptionStatus(PORTAL_BASE_PATH, { signal: options.signal }).catch(
        () => null,
      ),
    ]);
    return { ...details, channel: subscriptionStatus?.channel ?? 'Unknown' };
  }, []);
  const { data: details } = useFetch(
    fetchDetails,
    {
      apiServer: 'Unknown',
      channel: 'Unknown',
      infrastructureProvider: 'Unknown',
      openshiftVersion: 'Unknown',
    },
    { initialPromisePurity: true },
  );

  return <ClusterDetailsVariablesProvider details={details} />;
};

export default PortalClusterDetailsVariablesProvider;
