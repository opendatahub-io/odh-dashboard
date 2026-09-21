import { mcpRegistryServerDetailUrl } from '~/app/routes/mcpCatalog/mcpCatalog';

describe('mcpRegistryServerDetailUrl', () => {
  it('should return the bare server path when neither namespace nor version is set', () => {
    expect(mcpRegistryServerDetailUrl('io.github.example/kubernetes-mcp')).toBe(
      '/ai-hub/mcp-servers/registry/io.github.example%2Fkubernetes-mcp',
    );
  });

  it('should include the workspace query param when namespace is set', () => {
    expect(mcpRegistryServerDetailUrl('io.github.example/kubernetes-mcp', 'test-project')).toBe(
      '/ai-hub/mcp-servers/registry/io.github.example%2Fkubernetes-mcp?workspace=test-project',
    );
  });

  it('should include both workspace and version query params when both are set', () => {
    expect(
      mcpRegistryServerDetailUrl('io.github.example/kubernetes-mcp', 'test-project', '1.0.0'),
    ).toBe(
      '/ai-hub/mcp-servers/registry/io.github.example%2Fkubernetes-mcp?workspace=test-project&version=1.0.0',
    );
  });

  it('should include only the version query param when namespace is not set', () => {
    expect(mcpRegistryServerDetailUrl('io.github.example/kubernetes-mcp', undefined, '1.0.0')).toBe(
      '/ai-hub/mcp-servers/registry/io.github.example%2Fkubernetes-mcp?version=1.0.0',
    );
  });

  it('should URL-encode the version value', () => {
    expect(
      mcpRegistryServerDetailUrl('io.github.example/kubernetes-mcp', undefined, '1.0.0+build.5'),
    ).toBe(
      '/ai-hub/mcp-servers/registry/io.github.example%2Fkubernetes-mcp?version=1.0.0%2Bbuild.5',
    );
  });
});
