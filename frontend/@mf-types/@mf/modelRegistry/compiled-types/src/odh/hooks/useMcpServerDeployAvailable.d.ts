/**
 * Gates MCP server deploy on the MCP lifecycle operator in the DSC.
 * Enabled when managementState is Managed or Unmanaged (same as requiredComponents).
 */
declare const useMcpServerDeployAvailable: () => {
    available: boolean;
    loaded: boolean;
};
export default useMcpServerDeployAvailable;
