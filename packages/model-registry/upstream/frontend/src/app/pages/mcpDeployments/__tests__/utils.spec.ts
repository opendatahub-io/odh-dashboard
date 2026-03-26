import { McpDeploymentPhase } from '~/app/mcpDeploymentTypes';
import { getConnectionUrl, getServerDisplayName, getStatusInfo } from '../utils';
import { createMockDeployment } from './mcpDeploymentTestUtils';

describe('getServerDisplayName', () => {
  it('should extract and format server name from full image path', () => {
    const deployment = createMockDeployment({
      image: 'quay.io/mcp-servers/kubernetes:1.0.0',
    });
    expect(getServerDisplayName(deployment)).toBe('Kubernetes-1.0.0');
  });

  it('should handle image with no tag', () => {
    const deployment = createMockDeployment({
      image: 'quay.io/mcp-servers/kubernetes',
    });
    expect(getServerDisplayName(deployment)).toBe('Kubernetes');
  });

  it('should handle image with hyphenated name', () => {
    const deployment = createMockDeployment({
      image: 'quay.io/mcp-servers/service-now:1.2.0',
    });
    expect(getServerDisplayName(deployment)).toBe('Service-Now-1.2.0');
  });

  it('should handle simple image name without registry', () => {
    const deployment = createMockDeployment({
      image: 'slack:0.5.0',
    });
    expect(getServerDisplayName(deployment)).toBe('Slack-0.5.0');
  });

  it('should handle image name without slash or tag', () => {
    const deployment = createMockDeployment({
      image: 'postgres',
    });
    expect(getServerDisplayName(deployment)).toBe('Postgres');
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

  it('should return name:port for Running deployment without address', () => {
    const deployment = createMockDeployment({
      phase: McpDeploymentPhase.RUNNING,
    });
    expect(getConnectionUrl(deployment)).toBe('kubernetes-mcp:8080');
  });

  it.each([McpDeploymentPhase.PENDING, McpDeploymentPhase.FAILED])(
    'should return undefined for %s deployment without address',
    (phase) => {
      const deployment = createMockDeployment({ phase });
      expect(getConnectionUrl(deployment)).toBeUndefined();
    },
  );

  it('should return address URL even for non-Running deployment', () => {
    const deployment = createMockDeployment({
      phase: McpDeploymentPhase.FAILED,
      address: { url: 'stale-url:8080' },
    });
    expect(getConnectionUrl(deployment)).toBe('stale-url:8080');
  });
});

describe('getStatusInfo', () => {
  it('should return available status for Running phase', () => {
    const result = getStatusInfo(McpDeploymentPhase.RUNNING);
    expect(result.label).toBe('Available');
    expect(result.status).toBe('success');
    expect(result.tooltip).toBe('This MCP server is running and available for connections.');
  });

  it('should return unavailable status for Failed phase', () => {
    const result = getStatusInfo(McpDeploymentPhase.FAILED);
    expect(result.label).toBe('Unavailable');
    expect(result.status).toBe('danger');
    expect(result.tooltip).toBe('This MCP server has failed and is not available.');
  });

  it('should return pending status for Pending phase', () => {
    const result = getStatusInfo(McpDeploymentPhase.PENDING);
    expect(result.label).toBe('Pending');
    expect(result.status).toBe('info');
    expect(result.tooltip).toBe('This MCP server is starting up and will be available shortly.');
  });
});
