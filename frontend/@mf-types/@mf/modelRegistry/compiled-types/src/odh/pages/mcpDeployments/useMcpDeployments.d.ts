import { FetchState } from 'mod-arch-core';
import { McpDeploymentList } from '~/odh/types/mcpDeploymentTypes';
declare const useMcpDeployments: (namespace: string | undefined) => FetchState<McpDeploymentList>;
export default useMcpDeployments;
