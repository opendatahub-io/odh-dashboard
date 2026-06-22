import {
  AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS,
  getAgentRuntimeEndpointFields,
} from '~/app/utilities/agentRuntimeEndpoints';
import { mockAgentRuntime, mockAgentRuntimeDetail } from '~/__mocks__/mockAgentRuntime';

describe('getAgentRuntimeEndpointFields', () => {
  it('should not throw when detail.runtime is missing', () => {
    const runtime = mockAgentRuntime();
    const fields = getAgentRuntimeEndpointFields(runtime, { agentCard: null } as never);

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      id: 'cluster-url',
      label: 'Cluster URL',
      url: runtime.endpointUrl,
    });
  });

  it('should map BFF detail fields to cluster, local, and external endpoint labels', () => {
    const runtime = mockAgentRuntime();
    const fields = getAgentRuntimeEndpointFields(runtime, mockAgentRuntimeDetail());

    expect(fields).toHaveLength(3);
    expect(fields[0]).toMatchObject({
      id: 'cluster-url',
      label: 'Cluster URL',
      description: AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS.clusterUrl,
      url: 'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080',
    });
    expect(fields[1]).toMatchObject({
      id: 'local-url',
      label: 'Local URL',
      description: AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS.localUrl,
      url: 'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080/.well-known/agent-card.json',
    });
    expect(fields[2]).toMatchObject({
      id: 'external-production-endpoint',
      label: 'External production endpoint',
      description: AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS.externalProductionEndpoint,
      url: 'https://sample-support-agent.apps.example.com/.well-known/agent-card.json',
    });
  });

  it('should show cluster URL from list runtime before detail is loaded', () => {
    const runtime = mockAgentRuntime();
    const fields = getAgentRuntimeEndpointFields(runtime);

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      id: 'cluster-url',
      label: 'Cluster URL',
      url: runtime.endpointUrl,
    });
  });

  it('should omit empty endpoint values', () => {
    const fields = getAgentRuntimeEndpointFields(
      mockAgentRuntime({ endpointUrl: '' }),
      mockAgentRuntimeDetail({
        runtime: {
          ...mockAgentRuntimeDetail().runtime,
          endpointUrl: '',
        },
        agentCard: null,
      }),
    );

    expect(fields).toEqual([]);
  });
});
