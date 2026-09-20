import { buildMcpAccessEndpointUrl } from '../buildMcpAccessEndpointUrl';

describe('buildMcpAccessEndpointUrl', () => {
  it('builds the deterministic cluster-internal URL from name, namespace, port, and path', () => {
    expect(buildMcpAccessEndpointUrl('weather-server', 'my-project', 8080, '/mcp')).toBe(
      'http://weather-server.my-project.svc.cluster.local:8080/mcp',
    );
  });

  it('matches a live-verified example from a real MCPServer on a test cluster', () => {
    expect(
      buildMcpAccessEndpointUrl(
        'test-openshift-mcp-server-from-catalog',
        'juntao-test',
        8080,
        '/mcp',
      ),
    ).toBe('http://test-openshift-mcp-server-from-catalog.juntao-test.svc.cluster.local:8080/mcp');
  });

  it('reflects a non-default port and path verbatim', () => {
    expect(buildMcpAccessEndpointUrl('weather-server', 'my-project', 9090, '/api/mcp')).toBe(
      'http://weather-server.my-project.svc.cluster.local:9090/api/mcp',
    );
  });

  it('rejects a path that smuggles userinfo into the authority (e.g. "@host/")', () => {
    expect(() =>
      buildMcpAccessEndpointUrl('weather-server', 'my-project', 8080, '@169.254.169.254/'),
    ).toThrow('MCP endpoint path must remain on the deployed service');
  });

  it('rejects a protocol-relative path that redirects to a different host (e.g. "//host/")', () => {
    expect(() =>
      buildMcpAccessEndpointUrl('weather-server', 'my-project', 8080, '//169.254.169.254/'),
    ).toThrow('MCP endpoint path must remain on the deployed service');
  });

  it('rejects a path that is not rooted at the service (relative path)', () => {
    expect(() => buildMcpAccessEndpointUrl('weather-server', 'my-project', 8080, 'mcp')).toThrow(
      'MCP endpoint path must remain on the deployed service',
    );
  });
});
