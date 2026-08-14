import * as React from 'react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import useFetchDscStatus from '@odh-dashboard/internal/concepts/areas/useFetchDscStatus';

/**
 * Gates MCP Registry-specific UI (e.g. the "Registered version" column) on the same
 * conditions as SupportedArea.MCP_REGISTRY: the `mcpRegistry` feature flag and the MLflow
 * DSC component. Mirrors useMcpServerDeployAvailable's direct-fetch approach rather than
 * useIsAreaAvailable's AreaContext, which isn't populated within this federated module's
 * own component tree.
 */
const useMcpRegistryAvailable = (): boolean => {
  const dashboardConfig = React.useContext(DashboardConfigContext);
  const [dscStatus] = useFetchDscStatus();

  const mcpRegistryFlagOn = dashboardConfig?.dashboardConfig.mcpRegistry ?? false;
  const managementState =
    dscStatus?.components?.[DataScienceStackComponent.MLFLOW]?.managementState;
  const mlflowAvailable = managementState === 'Managed' || managementState === 'Unmanaged';

  return mcpRegistryFlagOn && mlflowAvailable;
};

export default useMcpRegistryAvailable;
