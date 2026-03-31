import type { MCPServerCR } from '~/app/mcpDeploymentTypes';
import { mcpServerCRToYaml } from '../mcpServerYaml';

const makeCR = (
  specOverrides: Partial<MCPServerCR['spec']> = {},
): MCPServerCR => ({
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
  it('should serialize minimal config-only spec', () => {
    const cr = makeCR();
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toBe('spec:\n  config: \n    port: 8080\n');
  });

  it('should include runtime before config when present', () => {
    const cr = makeCR({
      config: { port: 8080 },
      runtime: { replicas: 2 },
    });
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('runtime:');
    expect(yaml).toContain('replicas: 2');
    expect(yaml.indexOf('runtime:')).toBeLessThan(yaml.indexOf('config:'));
  });

  it('should serialize nested runtime security', () => {
    const cr = makeCR({
      config: { port: 9090, path: '/mcp' },
      runtime: { replicas: 1, security: { serviceAccountName: 'my-sa' } },
    });
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('serviceAccountName: my-sa');
    expect(yaml).toContain('path: /mcp');
    expect(yaml).toContain('port: 9090');
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
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('- name: API_KEY');
    expect(yaml).toContain('value: abc123');
    expect(yaml).toContain('- name: MODE');
    expect(yaml).toContain('value: production');
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
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('- name: DB_PASSWORD');
    expect(yaml).toContain('secretKeyRef:');
    expect(yaml).toContain('name: db-secret');
    expect(yaml).toContain('key: password');
  });

  it('should serialize arguments array', () => {
    const cr = makeCR({
      config: { port: 8080, arguments: ['--verbose', '--timeout=30'] },
    });
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('- --verbose');
    expect(yaml).toContain('- --timeout=30');
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
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('- path: /data');
    expect(yaml).toContain('permissions: ReadOnly');
    expect(yaml).toContain('type: configMap');
  });

  it('should handle empty arrays as []', () => {
    const cr = makeCR({
      config: { port: 8080, arguments: [], env: [] },
    });
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('arguments: []');
    expect(yaml).toContain('env: []');
  });

  it('should omit undefined and null values', () => {
    const cr = makeCR({
      config: { port: 8080, path: undefined },
      runtime: undefined,
    });
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).not.toContain('path:');
    expect(yaml).not.toContain('runtime:');
  });

  it('should quote strings with special characters', () => {
    const cr = makeCR({
      config: {
        port: 8080,
        env: [
          { name: 'URL', value: 'http://example.com:8080/api' },
          { name: 'COMMENT', value: 'value with # hash' },
        ],
      },
    });
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('"http://example.com:8080/api"');
    expect(yaml).toContain('"value with # hash"');
  });

  it('should quote strings with leading/trailing spaces', () => {
    const cr = makeCR({
      config: {
        port: 8080,
        env: [{ name: 'PADDED', value: ' leading' }],
      },
    });
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('" leading"');
  });

  it('should escape quotes inside strings', () => {
    const cr = makeCR({
      config: {
        port: 8080,
        env: [{ name: 'QUOTED', value: 'say "hello"' }],
      },
    });
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('"say \\"hello\\""');
  });

  it('should serialize boolean values', () => {
    const cr = makeCR({
      config: { port: 8080 },
    });
    (cr.spec.config as Record<string, unknown>).debug = true;
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('debug: true');
  });

  it('should handle empty nested objects as {}', () => {
    const cr = makeCR({
      config: { port: 8080 },
      runtime: { security: {} } as MCPServerCR['spec']['runtime'],
    });
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).toContain('security: {}');
  });

  it('should not include source in output (only config and runtime)', () => {
    const cr = makeCR({
      config: { port: 8080 },
      runtime: { replicas: 1 },
    });
    const yaml = mcpServerCRToYaml(cr);

    expect(yaml).not.toContain('containerImage');
    expect(yaml).not.toContain('quay.io');
    expect(yaml).toContain('spec:');
    expect(yaml).toContain('config:');
    expect(yaml).toContain('runtime:');
  });
});
