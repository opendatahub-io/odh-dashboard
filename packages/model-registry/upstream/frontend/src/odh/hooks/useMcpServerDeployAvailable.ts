import React from 'react';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import useFetchDscStatus from '@odh-dashboard/internal/concepts/areas/useFetchDscStatus';

/**
 * Gates MCP server deploy on the MCP lifecycle operator in the DSC.
 * Enabled when managementState is Managed or Unmanaged (same as requiredComponents).
 */
const useMcpServerDeployAvailable = (): { available: boolean; loaded: boolean } => {
  const [dscStatus, loaded] = useFetchDscStatus();

  const managementState =
    dscStatus?.components?.[DataScienceStackComponent.MCP_LIFECYCLE_OPERATOR]?.managementState;

  return React.useMemo(
    () => ({
      available: managementState === 'Managed' || managementState === 'Unmanaged',
      loaded,
    }),
    [managementState, loaded],
  );
};

export default useMcpServerDeployAvailable;
