import { FetchState } from 'mod-arch-core';
import { McpDeploymentList } from '~/app/mcpDeploymentTypes';
declare const useMcpDeployments: () => FetchState<McpDeploymentList>;
export default useMcpDeployments;
