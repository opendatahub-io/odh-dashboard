import { mockAgentRuntimeDetail } from '~/__mocks__/mockAgentRuntimeDetail';
import {
  getAgentCardUrl,
  getAgentEndpointUrl,
  getAgentSpiffeId,
} from '~/app/pages/agentDeploymentDetail/agentDeploymentDetailUtils';

describe('agentDeploymentDetailUtils', () => {
  it('getAgentEndpointUrl should prefer runtime endpointUrl', () => {
    const detail = mockAgentRuntimeDetail({
      runtime: {
        ...mockAgentRuntimeDetail().runtime,
        endpointUrl: 'http://primary.example.com',
      },
      serviceEndpoints: [{ name: 'http', url: 'http://secondary.example.com', port: 8080 }],
    });
    expect(getAgentEndpointUrl(detail)).toBe('http://primary.example.com');
  });

  it('getAgentCardUrl should append the well-known agent card path', () => {
    const detail = mockAgentRuntimeDetail({
      runtime: {
        ...mockAgentRuntimeDetail().runtime,
        endpointUrl: 'https://agent.example.com',
      },
    });
    expect(getAgentCardUrl(detail)).toBe('https://agent.example.com/.well-known/agent-card.json');
  });

  it('getAgentSpiffeId should build the service account SPIFFE ID', () => {
    const detail = mockAgentRuntimeDetail();
    expect(getAgentSpiffeId(detail)).toBe(
      'spiffe://cluster.local/ns/agent-ops-demo/sa/sample-support-agent',
    );
  });
});
