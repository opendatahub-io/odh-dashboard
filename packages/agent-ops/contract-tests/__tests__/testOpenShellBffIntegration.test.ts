/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (fileName: string): string => readFileSync(fileName, 'utf8');

const readYamlScalar = (contents: string, key: string): string | undefined => {
  const value = contents.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, 'm'))?.[1];

  return value?.replace(/^(['"])(.*)\\1$/, '$2');
};

describe('Agent Ops upstream BFF integration', () => {
  const packageRoot = process.cwd();
  const repositoryRoot = resolve(packageRoot, '../..');

  it('imports the digest-locked upstream executable without compiling Go', () => {
    const lockFile = read(resolve(packageRoot, 'bff/upstream.lock.yaml'));
    const image = readYamlScalar(lockFile, 'image');
    const sourceTag = readYamlScalar(lockFile, 'sourceTag');
    const sourceCommit = readYamlScalar(lockFile, 'sourceCommit');
    const sourceRef = readYamlScalar(lockFile, 'sourceRef');

    expect(image).toMatch(/@sha256:[a-f0-9]{64}$/);
    expect(sourceCommit).toMatch(/^[a-f0-9]{40}$/);
    const commit = sourceCommit ?? '';
    expect(sourceTag).toBe(`sha-${commit.slice(0, 7)}`);
    expect(sourceRef).toMatch(/^refs\/(heads|pull)\//);

    for (const dockerfileName of ['Dockerfile', 'Dockerfile.workspace']) {
      const dockerfile = read(resolve(packageRoot, dockerfileName));
      expect(dockerfile).toContain(image);
      expect(dockerfile).toContain(
        'COPY --from=upstream-bff /usr/local/bin/openshell-dashboard /openshell-dashboard',
      );
      expect(dockerfile).not.toContain('go build');
      expect(dockerfile).not.toContain('BFF_SOURCE_CODE');
    }
  });

  it('keeps local development authentication disabled by explicit opt-in', () => {
    const makefile = read(resolve(packageRoot, 'Makefile'));

    expect(makefile).toContain('AUTH_DISABLED ?= false');
    expect(makefile).toContain('--env "AUTH_DISABLED=$(AUTH_DISABLED)"');
  });

  it('keeps local package metadata and the deployed ODH module boundary aligned', () => {
    const packageConfig = JSON.parse(read(resolve(packageRoot, 'package.json')));
    const federation = packageConfig['module-federation'];

    expect(federation.tls).toBe(false);
    expect(federation.service).toEqual({
      name: 'odh-dashboard',
      port: 8843,
    });
    expect(federation.proxy).toEqual([
      { path: '/agent-ops/api', pathRewrite: '/api' },
      { path: '/agent-ops/healthcheck', pathRewrite: '/api/v1/healthz' },
    ]);

    const registry = read(
      resolve(repositoryRoot, 'dashboard-operator/internal/controller/modules.go'),
    );
    expect(registry).toContain('Port:          8843');
    expect(registry).toContain('TLS:           true');
    expect(registry).toContain('{Path: "/agent-ops/healthcheck", PathRewrite: "/api/v1/healthz"}');
  });

  it('configures only downstream transport and packaging concerns', () => {
    const manifestRoot = resolve(repositoryRoot, 'manifests/modules/agent-ops');
    const deployment = read(resolve(manifestRoot, 'deployment.yaml'));
    const service = read(resolve(manifestRoot, 'service.yaml'));
    const networkPolicy = read(resolve(manifestRoot, 'networkpolicy.yaml'));
    const clusterRole = read(resolve(manifestRoot, 'cluster-role.yaml'));

    expect(deployment).toContain('path: /api/v1/healthz');
    expect(deployment).toContain('port: 8843');
    expect(deployment).toContain('scheme: HTTPS');
    expect(deployment).toContain("'--auth-token-header=x-forwarded-access-token'");
    expect(deployment).toContain("'--port=8843'");
    expect(deployment).toContain("'--tls-cert=/etc/tls/private/tls.crt'");
    expect(deployment).toContain("'--tls-key=/etc/tls/private/tls.key'");
    expect(deployment).not.toContain('modules-sa-token');
    expect(deployment).toContain('proxy-tls');
    expect(deployment).not.toContain('--deployment-mode=');
    expect(deployment).not.toContain('--auth-method=');
    expect(service).toContain('serving-cert-secret-name: agent-ops-proxy-tls');
    expect(service).toContain('backend-protocol: HTTPS');
    expect(service).toContain('port: 8843');
    expect(networkPolicy).toContain('port: 8843');
    expect(networkPolicy).not.toContain('port: 8080');
    expect(networkPolicy).not.toContain('port: 6443');
    expect(clusterRole).toContain('rules: []');
  });
});
