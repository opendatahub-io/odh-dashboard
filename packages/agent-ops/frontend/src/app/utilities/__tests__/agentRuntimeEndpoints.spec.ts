import {
  AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS,
  getAgentRuntimeEndpointFields,
  getAgentRuntimeEndpointsEmptyMessage,
} from '~/app/utilities/agentRuntimeEndpoints';
import {
  mockAgentRuntime,
  mockAgentCardDetail,
  mockAgentRuntimeDetail,
} from '~/__mocks__/mockAgentRuntime';
import { AgentRuntimeDetail } from '~/app/types/agentRuntimes';

describe('getAgentRuntimeEndpointFields', () => {
  it('should not throw when detail omits serviceEndpoints and runtime', () => {
    const runtime = mockAgentRuntime();
    const fields = getAgentRuntimeEndpointFields(runtime, { agentCard: null } as never);

    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({
      id: 'cluster-url',
      label: 'Cluster URL',
      url: runtime.endpointUrl,
    });
    expect(fields[1]).toMatchObject({
      id: 'local-url',
      url: 'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080/.well-known/agent-card.json',
    });
  });

  it('should derive local URL from service endpoints when agent card URL is absent', () => {
    const runtime = mockAgentRuntime();
    const fields = getAgentRuntimeEndpointFields(
      runtime,
      mockAgentRuntimeDetail({
        agentCard: null,
      }),
    );

    expect(fields).toHaveLength(2);
    expect(fields[1]).toMatchObject({
      id: 'local-url',
      label: 'Local URL',
      url: 'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080/.well-known/agent-card.json',
    });
  });

  it('should map BFF detail fields to cluster, local, and external endpoint labels', () => {
    const runtime = mockAgentRuntime();
    const fields = getAgentRuntimeEndpointFields(
      runtime,
      mockAgentRuntimeDetail({ agentCard: mockAgentCardDetail() }),
    );

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

    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({
      id: 'cluster-url',
      label: 'Cluster URL',
      url: runtime.endpointUrl,
    });
    expect(fields[1]).toMatchObject({
      id: 'local-url',
      label: 'Local URL',
      url: 'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080/.well-known/agent-card.json',
    });
  });

  it('should omit empty endpoint values', () => {
    const fields = getAgentRuntimeEndpointFields(
      mockAgentRuntime({ endpointUrl: '', ports: [] }),
      mockAgentRuntimeDetail({
        runtime: {
          ...mockAgentRuntimeDetail().runtime,
          endpointUrl: '',
          ports: [],
        },
        serviceEndpoints: [],
        agentCard: null,
      }),
    );

    expect(fields).toEqual([]);
  });

  it('should ignore non-http endpoint URLs when deriving local URL', () => {
    const fields = getAgentRuntimeEndpointFields(
      mockAgentRuntime({
        endpointUrl: '',
        ports: [{ name: 'grpc', url: 'grpc://sample-support-agent:50051', port: 50051 }],
      }),
    );

    expect(fields).toEqual([]);
  });

  it('should fall back to derived local URL when agent card URL is whitespace', () => {
    const runtime = mockAgentRuntime();
    const fields = getAgentRuntimeEndpointFields(
      runtime,
      mockAgentRuntimeDetail({
        agentCard: mockAgentCardDetail({ agentCardUrl: '   ' }),
      }),
    );

    expect(fields[1]).toMatchObject({
      id: 'local-url',
      url: 'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080/.well-known/agent-card.json',
    });
  });
});

describe('getAgentRuntimeEndpointsEmptyMessage', () => {
  it('should explain pending agents are still provisioning endpoints', () => {
    const message = getAgentRuntimeEndpointsEmptyMessage(mockAgentRuntime({ status: 'pending' }));
    expect(message).toMatch(/Sandbox is Ready/i);
  });

  it('should explain not ready agents are still provisioning endpoints', () => {
    const message = getAgentRuntimeEndpointsEmptyMessage(mockAgentRuntime({ status: 'not ready' }));
    expect(message).toMatch(/Sandbox is Ready/i);
  });

  it('should explain provisioning agents are still provisioning endpoints', () => {
    const message = getAgentRuntimeEndpointsEmptyMessage(
      mockAgentRuntime({ status: 'provisioning' }),
    );
    expect(message).toMatch(/Sandbox is Ready/i);
  });

  it('should explain ready agents without URLs may lack service data', () => {
    const message = getAgentRuntimeEndpointsEmptyMessage(mockAgentRuntime({ status: 'ready' }));
    expect(message).toMatch(/No endpoints are available/i);
  });

  it('should explain stopped agents need to be started', () => {
    const message = getAgentRuntimeEndpointsEmptyMessage(mockAgentRuntime({ status: 'stopped' }));
    expect(message).toMatch(/stopped/i);
  });

  it('should prefer conditions-derived workloadStatus over list runtime status', () => {
    const runtime = mockAgentRuntime({ status: 'ready' });
    const message = getAgentRuntimeEndpointsEmptyMessage(
      runtime,
      mockAgentRuntimeDetail({
        runtime: mockAgentRuntime({ status: 'ready' }),
        workloadStatus: 'failed',
      }),
    );

    expect(message).toMatch(/not healthy/i);
  });

  it('should not throw when detail omits runtime', () => {
    const runtime = mockAgentRuntime({ status: 'ready' });
    const message = getAgentRuntimeEndpointsEmptyMessage(runtime, {
      workloadStatus: 'failed',
    } as AgentRuntimeDetail);

    expect(message).toMatch(/not healthy/i);
  });

  it('should fall back when workloadStatus is malformed', () => {
    const runtime = mockAgentRuntime({ status: 'ready' });
    const message = getAgentRuntimeEndpointsEmptyMessage(runtime, {
      workloadStatus: ['failed'],
      runtime: mockAgentRuntime({ status: 'ready' }),
    } as never);

    expect(message).toMatch(/No endpoints are available/i);
  });
});
