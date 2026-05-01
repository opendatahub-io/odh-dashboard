import yaml from 'js-yaml';
import type { MCPServerCR } from '~/odh/types/mcpDeploymentTypes';
import { mcpServerCRToYaml } from '~/odh/utils/mcpServerYaml';

const makeCR = (specOverrides: Partial<MCPServerCR['spec']> = {}): MCPServerCR => ({
  apiVersion: 'mcp.x-k8s.io/v1alpha1',
  kind: 'MCPServer',
  metadata: { name: 'test-server' },
  spec: {
    source: { type: 'containerImage', containerImage: { ref: 'quay.io/test:latest' } },
    config: { port: 8080 },
    ...specOverrides,
  },
});

describe('mcpServerCRToYaml', () => {
  it('should produce valid YAML that round-trips correctly', () => {
    const cr = makeCR({ config: { port: 8080 }, runtime: { replicas: 2 } });
    const yamlStr = mcpServerCRToYaml(cr);
    const parsed = yaml.load(yamlStr) as Record<string, unknown>;

    expect(parsed).toEqual({
      runtime: { replicas: 2 },
      config: { port: 8080 },
    });
  });

  it('should serialize minimal config-only spec', () => {
    const cr = makeCR();
    const yamlStr = mcpServerCRToYaml(cr);

    expect(yamlStr).not.toContain('spec:');
    expect(yamlStr).toContain('config:');
    expect(yamlStr).toContain('port: 8080');
    expect(yamlStr).not.toContain('runtime:');
  });

  it('should include runtime before config when present', () => {
    const cr = makeCR({
      config: { port: 8080 },
      runtime: { replicas: 2 },
    });
    const yamlStr = mcpServerCRToYaml(cr);

    expect(yamlStr).toContain('runtime:');
    expect(yamlStr).toContain('replicas: 2');
    expect(yamlStr.indexOf('runtime:')).toBeLessThan(yamlStr.indexOf('config:'));
  });

  it('should serialize nested runtime security', () => {
    const cr = makeCR({
      config: { port: 9090, path: '/mcp' },
      runtime: { replicas: 1, security: { serviceAccountName: 'my-sa' } },
    });
    const yamlStr = mcpServerCRToYaml(cr);

    expect(yamlStr).toContain('serviceAccountName: my-sa');
    expect(yamlStr).toContain('path: /mcp');
    expect(yamlStr).toContain('port: 9090');
  });

  it('should serialize env vars with plain values', () => {
    const cr = makeCR({
      config: {
        port: 8080,
        env: [
          { name: 'API_KEY', value: 'abc123' },
          { name: 'MODE', value: 'production' },
        ],
      },
    });
    const yamlStr = mcpServerCRToYaml(cr);

    expect(yamlStr).toContain('- name: API_KEY');
    expect(yamlStr).toContain('value: abc123');
    expect(yamlStr).toContain('- name: MODE');
    expect(yamlStr).toContain('value: production');
  });

  it('should serialize env vars with secretKeyRef', () => {
    const cr = makeCR({
      config: {
        port: 8080,
        env: [
          {
            name: 'DB_PASSWORD',
            valueFrom: { secretKeyRef: { name: 'db-secret', key: 'password' } },
          },
        ],
      },
    });
    const yamlStr = mcpServerCRToYaml(cr);

    expect(yamlStr).toContain('- name: DB_PASSWORD');
    expect(yamlStr).toContain('secretKeyRef:');
    expect(yamlStr).toContain('name: db-secret');
    expect(yamlStr).toContain('key: password');
  });

  it('should serialize arguments array', () => {
    const cr = makeCR({
      config: { port: 8080, arguments: ['--verbose', '--timeout=30'] },
    });
    const yamlStr = mcpServerCRToYaml(cr);
    const parsed = yaml.load(yamlStr) as { config: { arguments: string[] } };

    expect(parsed.config.arguments).toEqual(['--verbose', '--timeout=30']);
  });

  it('should serialize storage mounts', () => {
    const cr = makeCR({
      config: {
        port: 8080,
        storage: [
          {
            path: '/data',
            permissions: 'ReadOnly',
            source: { type: 'configMap', configMap: { name: 'my-config' } },
          },
        ],
      },
    });
    const yamlStr = mcpServerCRToYaml(cr);

    expect(yamlStr).toContain('- path: /data');
    expect(yamlStr).toContain('permissions: ReadOnly');
    expect(yamlStr).toContain('type: configMap');
  });

  it('should handle empty arrays as []', () => {
    const cr = makeCR({
      config: { port: 8080, arguments: [], env: [] },
    });
    const yamlStr = mcpServerCRToYaml(cr);

    expect(yamlStr).toContain('arguments: []');
    expect(yamlStr).toContain('env: []');
  });

  it('should omit undefined values', () => {
    const cr = makeCR({
      config: { port: 8080, path: undefined },
      runtime: undefined,
    });
    const yamlStr = mcpServerCRToYaml(cr);

    expect(yamlStr).not.toContain('path:');
    expect(yamlStr).not.toContain('runtime:');
  });

  it('should handle strings with special characters', () => {
    const cr = makeCR({
      config: {
        port: 8080,
        env: [
          { name: 'URL', value: 'http://example.com:8080/api' },
          { name: 'COMMENT', value: 'value with # hash' },
        ],
      },
    });
    const yamlStr = mcpServerCRToYaml(cr);
    const parsed = yaml.load(yamlStr) as { config: { env: { value: string }[] } };

    expect(parsed.config.env[0].value).toBe('http://example.com:8080/api');
    expect(parsed.config.env[1].value).toBe('value with # hash');
  });

  it('should handle strings with leading/trailing spaces', () => {
    const cr = makeCR({
      config: {
        port: 8080,
        env: [{ name: 'PADDED', value: ' leading' }],
      },
    });
    const yamlStr = mcpServerCRToYaml(cr);
    const parsed = yaml.load(yamlStr) as { config: { env: { value: string }[] } };

    expect(parsed.config.env[0].value).toBe(' leading');
  });

  it('should handle strings with quotes', () => {
    const cr = makeCR({
      config: {
        port: 8080,
        env: [{ name: 'QUOTED', value: 'say "hello"' }],
      },
    });
    const yamlStr = mcpServerCRToYaml(cr);
    const parsed = yaml.load(yamlStr) as { config: { env: { value: string }[] } };

    expect(parsed.config.env[0].value).toBe('say "hello"');
  });

  it('should serialize boolean values', () => {
    const cr = makeCR({
      config: { port: 8080 },
    });
    (cr.spec.config as Record<string, unknown>).debug = true;
    const yamlStr = mcpServerCRToYaml(cr);

    expect(yamlStr).toContain('debug: true');
  });

  it('should handle empty nested objects as {}', () => {
    const cr = makeCR({
      config: { port: 8080 },
      runtime: { security: {} } as MCPServerCR['spec']['runtime'],
    });
    const yamlStr = mcpServerCRToYaml(cr);

    expect(yamlStr).toContain('security: {}');
  });

  it('should not include source in output (only config and runtime)', () => {
    const cr = makeCR({
      config: { port: 8080 },
      runtime: { replicas: 1 },
    });
    const yamlStr = mcpServerCRToYaml(cr);

    expect(yamlStr).not.toContain('containerImage');
    expect(yamlStr).not.toContain('quay.io');
    expect(yamlStr).not.toContain('spec:');
    expect(yamlStr).toContain('config:');
    expect(yamlStr).toContain('runtime:');
  });
});
