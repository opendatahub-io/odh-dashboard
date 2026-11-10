import { getMCPServerAuth } from '~/app/agentProfile/mcpServerAuth';
import { AgentProfileSpec } from '~/app/agentProfile/types';
import { MCPServerFromAPI, TokenInfo } from '~/app/types';

const profile: AgentProfileSpec = {
  displayName: 'MCP agent',
  model: { id: 'test-model', uri: 'https://models.example.com' },
  mcpServers: [
    {
      serverRef: { kind: 'ConfigMap', name: 'gen-ai-aa-mcp-servers', key: 'github' },
    },
    { name: 'io.openshift/openshift-mcp', source: 'mlflow' },
  ],
};

const mcpServers: MCPServerFromAPI[] = [
  {
    name: 'github',
    url: 'https://github.example.com/mcp',
    transport: 'streamable-http',
    description: '',
    logo: null,
    status: 'healthy',
    version: '1.0.0',
    source: 'configmap',
    tools: [],
    // eslint-disable-next-line camelcase
    tool_count: 0,
  },
  {
    name: 'io.openshift/openshift-mcp',
    url: 'https://openshift.example.com/mcp',
    transport: 'streamable-http',
    description: '',
    logo: null,
    status: 'healthy',
    version: '1.0.0',
    source: 'registry',
    tools: [],
    // eslint-disable-next-line camelcase
    tool_count: 0,
  },
];

const authenticatedToken: TokenInfo = {
  token: 'github-token',
  authenticated: true,
  autoConnected: false,
};

describe('getMCPServerAuth', () => {
  it('should include credentials only for selected authenticated MCP servers', () => {
    const result = getMCPServerAuth(
      profile,
      mcpServers,
      new Map([[mcpServers[0].url, authenticatedToken]]),
    );

    expect(result).toEqual({ github: 'github-token' });
  });

  it('should not forward empty auto-connected or unselected server credentials', () => {
    const result = getMCPServerAuth(
      profile,
      [
        ...mcpServers,
        {
          ...mcpServers[0],
          name: 'unselected',
          url: 'https://unselected.example.com/mcp',
        },
      ],
      new Map([
        [
          mcpServers[1].url,
          { token: '', authenticated: true, autoConnected: true } satisfies TokenInfo,
        ],
        ['https://unselected.example.com/mcp', authenticatedToken],
      ]),
    );

    expect(result).toBeUndefined();
  });
});
