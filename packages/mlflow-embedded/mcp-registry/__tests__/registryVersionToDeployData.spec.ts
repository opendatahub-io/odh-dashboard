// Mock fixtures use the external MCP Registry's snake_case field names.
/* eslint-disable camelcase */
import { registryVersionToDeployData } from '../registryVersionToDeployData';
import {
  MCPServer,
  MCPServerDeploySpec,
  MCPServerVersion,
  MCPTransportType,
  RHAI_DEPLOY_SPEC_META_KEY,
} from '../types';

const mockServer = (overrides: Partial<MCPServer> = {}): MCPServer => ({
  name: 'io.github.example/weather-server',
  display_name: 'Weather Server',
  ...overrides,
});

const mockDeploySpec = (overrides: Partial<MCPServerDeploySpec> = {}): MCPServerDeploySpec => ({
  source: { containerImage: { ref: 'quay.io/mcp/weather:1.2.0' } },
  config: { port: 8080, path: '/mcp' },
  ...overrides,
});

const mockVersion = (overrides: Partial<MCPServerVersion> = {}): MCPServerVersion => ({
  name: 'io.github.example/weather-server',
  version: '1.2.0',
  server_json: {
    name: 'io.github.example/weather-server',
    version: '1.2.0',
    _meta: {
      [RHAI_DEPLOY_SPEC_META_KEY]: mockDeploySpec(),
    },
  },
  ...overrides,
});

describe('registryVersionToDeployData', () => {
  it('maps the registry server name and version', () => {
    const result = registryVersionToDeployData(mockServer(), mockVersion());
    expect(result.registryServer).toBe('io.github.example/weather-server');
    expect(result.registryVersion).toBe('1.2.0');
  });

  it('prefers the server display_name, falling back to name, and appends version', () => {
    expect(registryVersionToDeployData(mockServer(), mockVersion()).displayName).toBe(
      'Weather Server - 1.2.0',
    );
    expect(
      registryVersionToDeployData(mockServer({ display_name: undefined }), mockVersion())
        .displayName,
    ).toBe('io.github.example/weather-server - 1.2.0');
  });

  it("uses the deploy-spec meta's source.containerImage.ref as the image", () => {
    const result = registryVersionToDeployData(mockServer(), mockVersion());
    expect(result.image).toBe('quay.io/mcp/weather:1.2.0');
  });

  it('falls back to an empty image and yaml when the deploy-spec meta key is missing', () => {
    const result = registryVersionToDeployData(
      mockServer(),
      mockVersion({
        server_json: {
          name: 'io.github.example/weather-server',
          version: '1.2.0',
        },
      }),
    );
    expect(result.image).toBe('');
    expect(result.yaml).toBe('');
  });

  it('falls back to an empty image when the deploy-spec source has no containerImage', () => {
    const result = registryVersionToDeployData(
      mockServer(),
      mockVersion({
        server_json: {
          name: 'io.github.example/weather-server',
          version: '1.2.0',
          _meta: {
            [RHAI_DEPLOY_SPEC_META_KEY]: mockDeploySpec({ source: {} }),
          },
        },
      }),
    );
    expect(result.image).toBe('');
  });

  it("re-serializes the deploy-spec meta's config as the yaml", () => {
    const result = registryVersionToDeployData(mockServer(), mockVersion());
    expect(result.yaml).toBe('config:\n  port: 8080\n  path: /mcp\n');
  });

  it('includes runtime before config in the yaml when present', () => {
    const result = registryVersionToDeployData(
      mockServer(),
      mockVersion({
        server_json: {
          name: 'io.github.example/weather-server',
          version: '1.2.0',
          _meta: {
            [RHAI_DEPLOY_SPEC_META_KEY]: mockDeploySpec({
              runtime: { security: { serviceAccountName: 'mcp-sa' } },
            }),
          },
        },
      }),
    );
    expect(result.yaml).toBe(
      'runtime:\n  security:\n    serviceAccountName: mcp-sa\nconfig:\n  port: 8080\n  path: /mcp\n',
    );
  });

  it('does not leak the deploy-spec source (image) into the yaml', () => {
    const result = registryVersionToDeployData(mockServer(), mockVersion());
    expect(result.yaml).not.toContain('containerImage');
    expect(result.yaml).not.toContain('quay.io');
  });

  it('does not include port or path (come from deployment config, not registry metadata)', () => {
    const version = mockVersion({
      server_json: {
        name: 'io.github.example/weather-server',
        version: '1.2.0',
        packages: [
          {
            registryType: 'oci',
            identifier: 'quay.io/mcp/weather',
            transport: {
              type: MCPTransportType.STREAMABLE_HTTP,
              url: 'http://localhost:9090/api/mcp',
            },
          },
        ],
      },
    });

    const result = registryVersionToDeployData(mockServer(), version);
    expect(result).not.toHaveProperty('port');
    expect(result).not.toHaveProperty('path');
  });

  it('defaults transportType to streamable-http when no packages are present', () => {
    const result = registryVersionToDeployData(mockServer(), mockVersion());
    expect(result.transportType).toBe(MCPTransportType.STREAMABLE_HTTP);
  });

  it('defaults transportType to streamable-http for a stdio-only package', () => {
    const version = mockVersion({
      server_json: {
        name: 'io.github.example/weather-server',
        version: '1.2.0',
        packages: [
          {
            registryType: 'npm',
            identifier: '@example/weather-server',
            transport: { type: MCPTransportType.STDIO },
          },
        ],
      },
    });

    expect(registryVersionToDeployData(mockServer(), version).transportType).toBe(
      MCPTransportType.STREAMABLE_HTTP,
    );
  });

  it('uses transportType sse when the picked package advertises it', () => {
    const version = mockVersion({
      server_json: {
        name: 'io.github.example/weather-server',
        version: '1.2.0',
        packages: [
          {
            registryType: 'oci',
            identifier: 'quay.io/mcp/weather',
            transport: { type: MCPTransportType.SSE, url: 'http://localhost:9090/sse' },
          },
        ],
      },
    });

    expect(registryVersionToDeployData(mockServer(), version).transportType).toBe(
      MCPTransportType.SSE,
    );
  });

  it('derives transportType from remotes for a remotes-only server (no packages)', () => {
    // Per the MCP registry server.json spec, a remote server can declare its endpoint solely
    // via `remotes`, with no `packages` entry at all.
    const version = mockVersion({
      server_json: {
        name: 'io.github.example/weather-server',
        version: '1.2.0',
        remotes: [{ type: MCPTransportType.SSE, url: 'https://weather.example.com/sse' }],
      },
    });

    expect(registryVersionToDeployData(mockServer(), version).transportType).toBe(
      MCPTransportType.SSE,
    );
  });

  it('prefers remotes over packages when both are present', () => {
    // A hybrid server.json can declare packages using stdio (for local install) alongside a
    // remotes entry for the actual network endpoint -- remotes should win.
    const version = mockVersion({
      server_json: {
        name: 'io.github.example/weather-server',
        version: '1.2.0',
        packages: [
          {
            registryType: 'npm',
            identifier: '@example/weather-server',
            transport: { type: MCPTransportType.STDIO },
          },
        ],
        remotes: [{ type: MCPTransportType.SSE, url: 'https://weather.example.com/sse' }],
      },
    });

    expect(registryVersionToDeployData(mockServer(), version).transportType).toBe(
      MCPTransportType.SSE,
    );
  });

  it('selects an sse remote over a leading stdio remote (does not blindly use remotes[0])', () => {
    // `stdio` isn't a network-reachable transport and should never be selected from `remotes`,
    // even when it appears first in the array -- a valid `sse`/`streamable-http` entry elsewhere
    // in the list must win instead of falling back to remotes[0].
    const version = mockVersion({
      server_json: {
        name: 'io.github.example/weather-server',
        version: '1.2.0',
        remotes: [
          { type: MCPTransportType.STDIO },
          { type: MCPTransportType.SSE, url: 'https://weather.example.com/sse' },
        ],
      },
    });

    expect(registryVersionToDeployData(mockServer(), version).transportType).toBe(
      MCPTransportType.SSE,
    );
  });

  it('prefers a streamable-http remote over an sse remote when both are advertised', () => {
    const version = mockVersion({
      server_json: {
        name: 'io.github.example/weather-server',
        version: '1.2.0',
        remotes: [
          { type: MCPTransportType.SSE, url: 'https://weather.example.com/sse' },
          { type: MCPTransportType.STREAMABLE_HTTP, url: 'https://weather.example.com/mcp' },
        ],
      },
    });

    expect(registryVersionToDeployData(mockServer(), version).transportType).toBe(
      MCPTransportType.STREAMABLE_HTTP,
    );
  });
});
