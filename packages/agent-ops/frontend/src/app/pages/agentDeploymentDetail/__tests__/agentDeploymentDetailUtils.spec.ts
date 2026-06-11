import { mockAgentRuntimeDetail } from '~/__mocks__/mockAgentRuntimeDetail';
import { AgentOptionalCapability } from '~/app/types/agentCard';
import {
  getAgentCardUrl,
  getAgentEndpointUrl,
  getAgentOptionalCapabilityTestId,
  getAgentSpiffeId,
  getEnabledOptionalCapabilities,
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

describe('getEnabledOptionalCapabilities', () => {
  it('should return Streaming when streaming is true', () => {
    expect(
      getEnabledOptionalCapabilities({ streaming: true, pushNotifications: false }),
    ).toEqual([AgentOptionalCapability.Streaming]);
  });

  it('should return Push notifications when pushNotifications is true', () => {
    expect(
      getEnabledOptionalCapabilities({ streaming: false, pushNotifications: true }),
    ).toEqual([AgentOptionalCapability.PushNotifications]);
  });

  it('should return both labels when both capabilities are enabled', () => {
    expect(
      getEnabledOptionalCapabilities({ streaming: true, pushNotifications: true }),
    ).toEqual([AgentOptionalCapability.Streaming, AgentOptionalCapability.PushNotifications]);
  });

  it('should return empty array when no capabilities are enabled', () => {
    expect(
      getEnabledOptionalCapabilities({ streaming: false, pushNotifications: false }),
    ).toEqual([]);
  });

  it('should return empty array when capabilities is undefined', () => {
    expect(getEnabledOptionalCapabilities(undefined)).toEqual([]);
  });
});

describe('getAgentOptionalCapabilityTestId', () => {
  it('should build a slugged test id from the capability label', () => {
    expect(getAgentOptionalCapabilityTestId(AgentOptionalCapability.Streaming)).toBe(
      'agent-optional-capability-streaming',
    );
    expect(getAgentOptionalCapabilityTestId(AgentOptionalCapability.PushNotifications)).toBe(
      'agent-optional-capability-push-notifications',
    );
  });
});
