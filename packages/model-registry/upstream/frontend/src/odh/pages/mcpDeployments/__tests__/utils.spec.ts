import { McpDeploymentPhase } from '~/odh/types/mcpDeploymentTypes';
import {
  getConnectionUrl,
  getDeploymentDisplayName,
  getStatusInfo,
} from '~/odh/pages/mcpDeployments/utils';
import { createMockDeployment } from './mcpDeploymentTestUtils';

describe('getDeploymentDisplayName', () => {
  it('should return displayName when set', () => {
    const deployment = createMockDeployment({
      displayName: 'My Kubernetes Server',
    });
    expect(getDeploymentDisplayName(deployment)).toBe('My Kubernetes Server');
  });

  it('should fall back to name when displayName is not set', () => {
    const deployment = createMockDeployment({ name: 'kubernetes-mcp' });
    expect(getDeploymentDisplayName(deployment)).toBe('kubernetes-mcp');
  });

  it('should fall back to name when displayName is empty string', () => {
    const deployment = createMockDeployment({
      displayName: '',
      name: 'kubernetes-mcp',
    });
    expect(getDeploymentDisplayName(deployment)).toBe('kubernetes-mcp');
  });
});

describe('getConnectionUrl', () => {
  it('should return address URL when provided', () => {
    const deployment = createMockDeployment({
      phase: McpDeploymentPhase.RUNNING,
      address: { url: 'https://kubernetes-mcp.example.com:8080' },
    });
    expect(getConnectionUrl(deployment)).toBe('https://kubernetes-mcp.example.com:8080');
  });

  it('should return undefined when no address URL is set', () => {
    const deployment = createMockDeployment({
      phase: McpDeploymentPhase.RUNNING,
    });
    expect(getConnectionUrl(deployment)).toBeUndefined();
  });

  it.each([McpDeploymentPhase.PENDING, McpDeploymentPhase.FAILED])(
    'should return undefined for %s deployment without address',
    (phase) => {
      const deployment = createMockDeployment({ phase });
      expect(getConnectionUrl(deployment)).toBeUndefined();
    },
  );

  it.each([McpDeploymentPhase.PENDING, McpDeploymentPhase.FAILED])(
    'should return undefined for %s deployment even with address',
    (phase) => {
      const deployment = createMockDeployment({
        phase,
        address: { url: 'https://stale-url.example.com:8080' },
      });
      expect(getConnectionUrl(deployment)).toBeUndefined();
    },
  );
});

describe('getStatusInfo', () => {
  it('should return available status for Running phase', () => {
    const result = getStatusInfo(McpDeploymentPhase.RUNNING);
    expect(result.label).toBe('Available');
    expect(result.status).toBe('success');
    expect(result.popoverBody).toBe('The pod and its containers are healthy and running.');
  });

  it('should return unavailable status for Failed phase', () => {
    const result = getStatusInfo(McpDeploymentPhase.FAILED);
    expect(result.label).toBe('Unavailable');
    expect(result.status).toBe('danger');
    expect(result.popoverBody).toBe('At least 1 container in the pod failed.');
  });

  it('should return pending status for Pending phase', () => {
    const result = getStatusInfo(McpDeploymentPhase.PENDING);
    expect(result.label).toBe('Pending');
    expect(result.status).toBe('info');
    expect(result.popoverBody).toBe(
      'This MCP server is starting up and will be available shortly.',
    );
  });
});
