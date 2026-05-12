import { MCPServerCR } from '~/odh/types/mcpDeploymentTypes';
declare const useMcpServerConverter: (serverId: string) => [data: MCPServerCR | null, loaded: boolean, error: Error | undefined];
export default useMcpServerConverter;
