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
  it('should return cluster URL from endpointUrl', () => {
    const runtime = mockAgentRuntime();
    const fields = getAgentRuntimeEndpointFields(runtime);

    expect(fields[0]).toMatchObject({
      id: 'cluster-url',
      label: 'Cluster URL',
      url: runtime.endpointUrl,
    });
  });



  it('should return external endpoint when agent card provides one', () => {
    const runtime = mockAgentRuntime();
    const fields = getAgentRuntimeEndpointFields(
      runtime,
      mockAgentRuntimeDetail({ agentCard: mockAgentCardDetail() }),
    );

    const extField = fields.find((f) => f.id === 'external-production-endpoint');
    expect(extField).toMatchObject({
      id: 'external-production-endpoint',
      label: 'External production endpoint',
      description: AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS.externalProductionEndpoint,
    });
  });

  it('should omit empty endpoint values', () => {
    const fields = getAgentRuntimeEndpointFields(
      mockAgentRuntime({ endpointUrl: '', ports: [], podIp: undefined }),
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

  it('should map BFF detail fields to cluster and external endpoint labels', () => {
    const runtime = mockAgentRuntime({ podIp: '10.0.0.1' });
    const fields = getAgentRuntimeEndpointFields(
      runtime,
      mockAgentRuntimeDetail({ agentCard: mockAgentCardDetail() }),
    );

    expect(fields[0]).toMatchObject({
      id: 'cluster-url',
      label: 'Cluster URL',
      description: AGENT_RUNTIME_ENDPOINT_DESCRIPTIONS.clusterUrl,
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
