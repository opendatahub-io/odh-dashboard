import * as React from 'react';
import { useVariableDefinitionActions } from '@perses-dev/dashboards';
import { useClusterInfo } from '@odh-dashboard/internal/redux/selectors/clusterInfo';
import { useWatchOperatorSubscriptionStatus } from '@odh-dashboard/internal/utilities/useWatchOperatorSubscriptionStatus';
import { CLUSTER_DETAILS_VARIABLES } from '../utils/variables';
import { useClusterDetails } from '../api/useClusterDetails';

/**
 * ClusterDetailsVariablesProvider sets Perses dashboard variables for cluster information.
 * This component must be rendered as a child of PersesWrapper to access the VariableProvider context.
 *
 * Sets all variables defined in CLUSTER_DETAILS_VARIABLES (from ../utils/variables):
 * - API_SERVER: The API server URL
 * - CHANNEL: The operator subscription channel
 * - OPENSHIFT_VERSION: The OpenShift version
 * - INFRASTRUCTURE_PROVIDER: The infrastructure platform type (AWS, GCP, Azure, etc.)
 */
const ClusterDetailsVariablesProvider: React.FC = () => {
  const { setVariableValue } = useVariableDefinitionActions();

  // Get API server URL from redux state (same as AboutDialog)
  const { serverURL } = useClusterInfo();

  // Get operator subscription status for channel (same as AboutDialog)
  const [subStatus] = useWatchOperatorSubscriptionStatus();

  // Get OpenShift version and infrastructure provider
  const { data: clusterDetails, loaded: clusterDetailsLoaded } = useClusterDetails();

  // Set all variables in a single effect when data is available
  React.useEffect(() => {
    // Set API server URL
    setVariableValue(CLUSTER_DETAILS_VARIABLES.API_SERVER, serverURL || 'Unknown');

    // Set channel from operator subscription status (same source as AboutDialog)
    setVariableValue(CLUSTER_DETAILS_VARIABLES.CHANNEL, subStatus?.channel ?? 'Unknown');

    // Set OpenShift version and infrastructure provider (only when loaded)
    if (clusterDetailsLoaded) {
      setVariableValue(
        CLUSTER_DETAILS_VARIABLES.OPENSHIFT_VERSION,
        clusterDetails.openshiftVersion,
      );
      setVariableValue(
        CLUSTER_DETAILS_VARIABLES.INFRASTRUCTURE_PROVIDER,
        clusterDetails.infrastructureProvider,
      );
    }
  }, [serverURL, subStatus, clusterDetails, clusterDetailsLoaded, setVariableValue]);

  return null;
};

export default ClusterDetailsVariablesProvider;
