import type { APIOptions } from 'mod-arch-core';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import type { MCPServerVersion } from '~/odh/types/mcpRegistryTypes';
import { registerMcpServer } from '~/odh/utils/registerMcpServer';
import {
  createMcpRegistryServerVersion,
  setMcpRegistryServerTag,
  updateMcpRegistryServer,
} from '~/odh/api/mcpRegistry/service';

jest.mock('~/odh/api/mcpRegistry/service');

const mockCreateVersion = jest.mocked(createMcpRegistryServerVersion);
const mockUpdateServer = jest.mocked(updateMcpRegistryServer);
const mockSetTag = jest.mocked(setMcpRegistryServerTag);

const makeServer = (partial?: Partial<McpServer>): McpServer => ({
  id: '1',
  name: 'Kubernetes MCP',
  toolCount: 0,
  ...partial,
});

const makeVersion = (partial?: Partial<MCPServerVersion>): MCPServerVersion => ({
  name: 'kubernetes/mcp-server',
  version: '1.0.0',
  // eslint-disable-next-line camelcase
  server_json: {},
  ...partial,
});

const CONTEXT = {
  hostPath: '',
  queryParams: { workspace: 'test-project' },
  opts: {} as APIOptions,
};

describe('registerMcpServer', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates a version then PATCHes icons onto the parent server (not into server_json)', async () => {
    const createVersionFn = jest.fn().mockResolvedValue(makeVersion({ version: '1.0.0' }));
    const updateServerFn = jest.fn().mockResolvedValue({ name: 'kubernetes/mcp-server' });
    mockCreateVersion.mockReturnValue(createVersionFn);
    mockUpdateServer.mockReturnValue(updateServerFn);

    const server = makeServer({
      description: 'Control clusters',
      // eslint-disable-next-line camelcase
      source_id: 'source-1',
    });
    const result = await registerMcpServer(
      {
        server,
        registryName: 'kubernetes/mcp-server',
        serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
        status: 'draft',
        icons: [{ src: 'https://example.com/icon.svg' }, { src: '' }],
      },
      CONTEXT,
    );

    expect(result.version.version).toBe('1.0.0');
    expect(result.metadataError).toBeUndefined();
    expect(createVersionFn).toHaveBeenCalledWith(CONTEXT.opts, 'kubernetes/mcp-server', {
      // eslint-disable-next-line camelcase
      server_json: { name: 'kubernetes/mcp-server', version: '1.0.0' },
      status: 'draft',
      tools: [],
    });
    expect(updateServerFn).toHaveBeenCalledWith(CONTEXT.opts, 'kubernetes/mcp-server', {
      icons: [{ src: 'https://example.com/icon.svg' }],
    });
  });

  it('includes display_name in the metadata PATCH, kept out of server_json', async () => {
    const createVersionFn = jest.fn().mockResolvedValue(makeVersion());
    const updateServerFn = jest.fn().mockResolvedValue({ name: 'kubernetes/mcp-server' });
    mockCreateVersion.mockReturnValue(createVersionFn);
    mockUpdateServer.mockReturnValue(updateServerFn);

    await registerMcpServer(
      {
        server: makeServer(),
        registryName: 'kubernetes/mcp-server',
        serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
        displayName: '  Kubernetes MCP  ',
        status: 'draft',
        icons: [],
      },
      CONTEXT,
    );

    expect(createVersionFn).toHaveBeenCalledWith(
      CONTEXT.opts,
      'kubernetes/mcp-server',
      // eslint-disable-next-line camelcase
      expect.not.objectContaining({ display_name: expect.anything() }),
    );
    expect(updateServerFn).toHaveBeenCalledWith(CONTEXT.opts, 'kubernetes/mcp-server', {
      // eslint-disable-next-line camelcase
      display_name: 'Kubernetes MCP',
    });
  });

  it('combines display_name and icons into a single metadata PATCH', async () => {
    const createVersionFn = jest.fn().mockResolvedValue(makeVersion());
    const updateServerFn = jest.fn().mockResolvedValue({ name: 'kubernetes/mcp-server' });
    mockCreateVersion.mockReturnValue(createVersionFn);
    mockUpdateServer.mockReturnValue(updateServerFn);

    await registerMcpServer(
      {
        server: makeServer(),
        registryName: 'kubernetes/mcp-server',
        serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
        displayName: 'Kubernetes MCP',
        status: 'draft',
        icons: [{ src: 'https://example.com/icon.svg' }],
      },
      CONTEXT,
    );

    expect(mockUpdateServer).toHaveBeenCalledTimes(1);
    expect(updateServerFn).toHaveBeenCalledWith(CONTEXT.opts, 'kubernetes/mcp-server', {
      // eslint-disable-next-line camelcase
      display_name: 'Kubernetes MCP',
      icons: [{ src: 'https://example.com/icon.svg' }],
    });
  });

  it('returns a metadataError instead of throwing when the metadata PATCH fails, keeping the version', async () => {
    const createVersionFn = jest.fn().mockResolvedValue(makeVersion({ version: '1.0.0' }));
    mockCreateVersion.mockReturnValue(createVersionFn);
    mockUpdateServer.mockReturnValue(jest.fn().mockRejectedValue(new Error('network error')));

    const result = await registerMcpServer(
      {
        server: makeServer(),
        registryName: 'kubernetes/mcp-server',
        serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
        status: 'draft',
        icons: [{ src: 'https://example.com/icon.svg' }],
      },
      CONTEXT,
    );

    expect(result.version.version).toBe('1.0.0');
    expect(result.metadataError).toBeInstanceOf(Error);
    expect(result.metadataError?.message).toBe('network error');
  });

  it('skips the metadata PATCH when every icon row is empty and no display name is given', async () => {
    const createVersionFn = jest.fn().mockResolvedValue(makeVersion());
    mockCreateVersion.mockReturnValue(createVersionFn);
    mockUpdateServer.mockReturnValue(jest.fn());

    await registerMcpServer(
      {
        server: makeServer(),
        registryName: 'kubernetes/mcp-server',
        serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
        status: 'draft',
        icons: [{ src: '' }],
      },
      CONTEXT,
    );

    expect(createVersionFn).toHaveBeenCalled();
    expect(mockUpdateServer).not.toHaveBeenCalled();
  });

  it('skips the metadata PATCH when displayName is blank/whitespace-only', async () => {
    const createVersionFn = jest.fn().mockResolvedValue(makeVersion());
    mockCreateVersion.mockReturnValue(createVersionFn);
    mockUpdateServer.mockReturnValue(jest.fn());

    await registerMcpServer(
      {
        server: makeServer(),
        registryName: 'kubernetes/mcp-server',
        serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
        displayName: '   ',
        status: 'draft',
        icons: [],
      },
      CONTEXT,
    );

    expect(mockUpdateServer).not.toHaveBeenCalled();
  });

  it('includes source and silently-computed tools from server.tools when present', async () => {
    const createVersionFn = jest.fn().mockResolvedValue(makeVersion());
    mockCreateVersion.mockReturnValue(createVersionFn);
    mockUpdateServer.mockReturnValue(jest.fn());

    const server = makeServer({
      tools: [
        {
          name: 'list_pods',
          description: 'List pods',
          accessType: 'read_only',
          parameters: [{ name: 'namespace', type: 'string', required: true }],
        },
      ],
    });

    await registerMcpServer(
      {
        server,
        registryName: 'kubernetes/mcp-server',
        serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
        status: 'active',
        source: 'https://github.com/kubernetes/mcp-server',
        icons: [],
      },
      CONTEXT,
    );

    expect(createVersionFn).toHaveBeenCalledWith(CONTEXT.opts, 'kubernetes/mcp-server', {
      // eslint-disable-next-line camelcase
      server_json: { name: 'kubernetes/mcp-server', version: '1.0.0' },
      status: 'active',
      source: 'https://github.com/kubernetes/mcp-server',
      tools: [
        {
          name: 'list_pods',
          description: 'List pods',
          // eslint-disable-next-line camelcase
          input_schema: {
            type: 'object',
            properties: { namespace: { type: 'string' } },
            required: ['namespace'],
          },
        },
      ],
    });
  });

  it('sets a tag for each row with a non-empty key, skipping empty rows', async () => {
    const createVersionFn = jest.fn().mockResolvedValue(makeVersion());
    const setTagFn = jest.fn().mockResolvedValue(undefined);
    mockCreateVersion.mockReturnValue(createVersionFn);
    mockUpdateServer.mockReturnValue(jest.fn());
    mockSetTag.mockReturnValue(setTagFn);

    await registerMcpServer(
      {
        server: makeServer(),
        registryName: 'kubernetes/mcp-server',
        serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
        status: 'draft',
        icons: [],
        tags: [
          { key: 'team', value: 'platform' },
          { key: '', value: 'ignored-because-key-is-empty' },
          { key: 'env', value: '' },
        ],
      },
      CONTEXT,
    );

    expect(setTagFn).toHaveBeenCalledTimes(2);
    expect(setTagFn).toHaveBeenCalledWith(CONTEXT.opts, 'kubernetes/mcp-server', {
      key: 'team',
      value: 'platform',
    });
    expect(setTagFn).toHaveBeenCalledWith(CONTEXT.opts, 'kubernetes/mcp-server', { key: 'env' });
  });

  it('fires tag-set requests in parallel rather than waiting for each to resolve first', async () => {
    const createVersionFn = jest.fn().mockResolvedValue(makeVersion());
    mockCreateVersion.mockReturnValue(createVersionFn);
    mockUpdateServer.mockReturnValue(jest.fn());

    const started: string[] = [];
    const setTagFn = jest.fn((_opts, _name, data: { key: string }) => {
      started.push(data.key);
      // Never resolves. If requests were sequential, only the first key would ever start.
      return new Promise<void>(() => {
        // Intentionally left pending.
      });
    });
    mockSetTag.mockReturnValue(setTagFn);

    void registerMcpServer(
      {
        server: makeServer(),
        registryName: 'kubernetes/mcp-server',
        serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
        status: 'draft',
        icons: [],
        tags: [
          { key: 'team', value: 'platform' },
          { key: 'env', value: 'prod' },
        ],
      },
      CONTEXT,
    );

    // Flush the microtask queue (through create-version's resolved promise) without waiting
    // on the tag requests themselves, since they intentionally never resolve above.
    await Promise.resolve().then().then().then();

    expect(started).toEqual(['team', 'env']);
  });

  it('returns a tagsError instead of throwing when a tag-set request fails, keeping the version', async () => {
    const createVersionFn = jest.fn().mockResolvedValue(makeVersion({ version: '1.0.0' }));
    mockCreateVersion.mockReturnValue(createVersionFn);
    mockUpdateServer.mockReturnValue(jest.fn());
    mockSetTag.mockReturnValue(jest.fn().mockRejectedValue(new Error('key is required')));

    const result = await registerMcpServer(
      {
        server: makeServer(),
        registryName: 'kubernetes/mcp-server',
        serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
        status: 'draft',
        icons: [],
        tags: [{ key: 'team', value: 'platform' }],
      },
      CONTEXT,
    );

    expect(result.version.version).toBe('1.0.0');
    expect(result.tagsError).toBeInstanceOf(Error);
    expect(result.tagsError?.message).toBe('Failed to set tag: team');
  });

  it('reports every failed tag key together when multiple tag requests fail', async () => {
    const createVersionFn = jest.fn().mockResolvedValue(makeVersion());
    mockCreateVersion.mockReturnValue(createVersionFn);
    mockUpdateServer.mockReturnValue(jest.fn());
    const setTagFn = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('key is required'))
      .mockRejectedValueOnce(new Error('forbidden'));
    mockSetTag.mockReturnValue(setTagFn);

    const result = await registerMcpServer(
      {
        server: makeServer(),
        registryName: 'kubernetes/mcp-server',
        serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
        status: 'draft',
        icons: [],
        tags: [
          { key: 'team', value: 'platform' },
          { key: 'env', value: '' },
          { key: 'owner', value: '' },
        ],
      },
      CONTEXT,
    );

    expect(setTagFn).toHaveBeenCalledTimes(3);
    expect(result.tagsError?.message).toBe('Failed to set tags: env, owner');
  });

  it('propagates create-version failures without attempting the icons PATCH', async () => {
    mockCreateVersion.mockReturnValue(jest.fn().mockRejectedValue(new Error('network error')));
    mockUpdateServer.mockReturnValue(jest.fn());

    await expect(
      registerMcpServer(
        {
          server: makeServer(),
          registryName: 'kubernetes/mcp-server',
          serverJson: { name: 'kubernetes/mcp-server', version: '1.0.0' },
          status: 'draft',
          icons: [{ src: 'https://example.com/icon.svg' }],
        },
        CONTEXT,
      ),
    ).rejects.toThrow('network error');

    expect(mockUpdateServer).not.toHaveBeenCalled();
  });
});
