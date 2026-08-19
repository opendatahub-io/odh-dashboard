import type { APIOptions } from 'mod-arch-core';
import {
  mockMcpDeploySpec,
  mockMcpServer,
  mockMcpServerJson,
  mockMcpTool,
} from '~/__mocks__/mockMcpCatalog';
import {
  mockMcpIcon,
  mockMcpServerVersion,
  mockMcpTagEntry,
  mockRegisterMCPServerResult,
} from '~/__mocks__/mockMcpRegistry';
import {
  CATALOG_SOURCE_ID_TAG_KEY,
  MCP_REGISTRY_BASENAME,
  MCP_SERVER_JSON_ERROR,
  REGISTER_BUTTON_TOOLTIP,
  REGISTER_NOTIFICATION,
} from '~/odh/const';
import { registerMcpRegistryServer } from '~/odh/api/mcpRegistry';
import {
  canSubmitMcpServerJson,
  catalogToRegistryIcons,
  catalogToRegistryTags,
  getIconUrlFormatError,
  getMcpServerJsonSubmitError,
  getRegisterButtonState,
  hasBlockingTag,
  hasBlockingUserIcon,
  isMcpServerJson,
  isMcpServerJsonMeta,
  isRecord,
  isValidMcpRegistryName,
  mcpServerDetailRoute,
  notifyRegisterMcpServerResult,
  registerMcpServer,
  resolveActionButtonState,
  resolveIcon,
  resolveIconWithFallback,
  resolveIconsForSubmit,
  RHAI_DEPLOY_SPEC_META_KEY,
  sanitizeHref,
  sanitizeIconPreviewSrc,
  withDeploySpecMeta,
} from '~/odh/utils';

jest.mock('~/odh/api/mcpRegistry');

const mockRegister = jest.mocked(registerMcpRegistryServer);

const mockServerWithSourceId = (sourceId: string) =>
  mockMcpServer({
    // eslint-disable-next-line camelcase -- catalog wire key
    source_id: sourceId,
  });

const CONTEXT = {
  queryParams: { workspace: 'test-project' },
  opts: {} as APIOptions,
};

describe('isRecord', () => {
  it('should return true for plain objects', () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('should return false for null, arrays, and primitives', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord('x')).toBe(false);
    expect(isRecord(1)).toBe(false);
  });
});

describe('resolveIcon', () => {
  const lightIcon = () => mockMcpIcon({ src: 'https://example.com/light.svg', theme: 'light' });
  const darkIcon = () => mockMcpIcon({ src: 'https://example.com/dark.svg', theme: 'dark' });
  const anyIcon = () => mockMcpIcon({ src: 'https://example.com/any.svg' });

  it('should return undefined for empty input', () => {
    expect(resolveIcon(undefined, false)).toBeUndefined();
    expect(resolveIcon([], true)).toBeUndefined();
  });

  it('should prefer the matching theme then fall back to Any', () => {
    expect(resolveIcon([anyIcon(), lightIcon(), darkIcon()], false)).toEqual(lightIcon());
    expect(resolveIcon([anyIcon(), lightIcon(), darkIcon()], true)).toEqual(darkIcon());
    expect(resolveIcon([anyIcon()], false)).toEqual(anyIcon());
    expect(resolveIcon([anyIcon()], true)).toEqual(anyIcon());
  });
});

describe('resolveIconWithFallback', () => {
  const lightIcon = () => mockMcpIcon({ src: 'https://example.com/light.svg', theme: 'light' });
  const darkIcon = () => mockMcpIcon({ src: 'https://example.com/dark.svg', theme: 'dark' });
  const anyIcon = () => mockMcpIcon({ src: 'https://example.com/any.svg' });

  it('should pair a theme icon with the any-theme icon as load fallback', () => {
    expect(resolveIconWithFallback([anyIcon(), lightIcon(), darkIcon()], false)).toEqual({
      icon: lightIcon(),
      fallbackIcon: anyIcon(),
    });
    expect(resolveIconWithFallback([anyIcon(), lightIcon(), darkIcon()], true)).toEqual({
      icon: darkIcon(),
      fallbackIcon: anyIcon(),
    });
  });

  it('should have no load fallback when only an any-theme icon exists', () => {
    expect(resolveIconWithFallback([anyIcon()], false)).toEqual({
      icon: anyIcon(),
      fallbackIcon: undefined,
    });
  });
});

describe('sanitizeHref', () => {
  it('should allow http and https URLs', () => {
    expect(sanitizeHref('https://example.com/icon.svg')).toBe('https://example.com/icon.svg');
    expect(sanitizeHref('http://localhost:4010/logo')).toBe('http://localhost:4010/logo');
    expect(sanitizeHref('http://example.com/icon.svg')).toBe('http://example.com/icon.svg');
  });

  it('should return undefined for data, javascript, incomplete, and invalid URLs', () => {
    expect(sanitizeHref('data:image/svg+xml;base64,abc')).toBeUndefined();
    expect(sanitizeHref('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeHref('not a url')).toBeUndefined();
    expect(sanitizeHref('https://')).toBeUndefined();
    expect(sanitizeHref('http://')).toBeUndefined();
    expect(sanitizeHref(undefined)).toBeUndefined();
  });
});

describe('sanitizeIconPreviewSrc', () => {
  it('should allow http and https for preview loading', () => {
    expect(sanitizeIconPreviewSrc('https://example.com/icon.svg')).toBe(
      'https://example.com/icon.svg',
    );
    expect(sanitizeIconPreviewSrc('http://localhost:4010/model-registry/api/v1/logo')).toBe(
      'http://localhost:4010/model-registry/api/v1/logo',
    );
  });

  it('should return undefined for data and javascript URLs', () => {
    expect(sanitizeIconPreviewSrc('data:image/svg+xml;base64,abc')).toBeUndefined();
    expect(sanitizeIconPreviewSrc('javascript:alert(1)')).toBeUndefined();
  });
});

describe('getIconUrlFormatError', () => {
  it('should return Enter a valid URL for empty, incomplete, or non-http(s) values', () => {
    expect(getIconUrlFormatError('')).toBe('Enter a valid URL');
    expect(getIconUrlFormatError('   ')).toBe('Enter a valid URL');
    expect(getIconUrlFormatError('https://')).toBe('Enter a valid URL');
    expect(getIconUrlFormatError('http://')).toBe('Enter a valid URL');
    expect(getIconUrlFormatError('not-a-url')).toBe('Enter a valid URL');
    expect(getIconUrlFormatError('ftp://example.com/icon.svg')).toBe('Enter a valid URL');
    expect(getIconUrlFormatError('javascript:alert(1)')).toBe('Enter a valid URL');
  });

  it('should return undefined for complete http(s) URLs', () => {
    expect(getIconUrlFormatError('https://example.com/icon.svg')).toBeUndefined();
    expect(getIconUrlFormatError('http://localhost:4010/logo')).toBeUndefined();
  });
});

describe('hasBlockingUserIcon', () => {
  it('should ignore empty rows', () => {
    expect(hasBlockingUserIcon([mockMcpIcon({ src: '' }), mockMcpIcon({ src: '   ' })])).toBe(
      false,
    );
  });

  it('should block malformed URLs', () => {
    expect(hasBlockingUserIcon([mockMcpIcon({ src: 'not-a-url' })])).toBe(true);
    expect(hasBlockingUserIcon([mockMcpIcon({ src: 'https://' })])).toBe(true);
  });

  it('should not block valid http(s) URLs', () => {
    expect(hasBlockingUserIcon([mockMcpIcon()])).toBe(false);
  });

  it('should block icons that failed to load', () => {
    expect(
      hasBlockingUserIcon(
        [mockMcpIcon({ src: 'https://example.com/broken.svg' })],
        new Set(['https://example.com/broken.svg']),
      ),
    ).toBe(true);
  });
});

describe('hasBlockingTag', () => {
  it('should ignore empty rows', () => {
    expect(
      hasBlockingTag([
        mockMcpTagEntry({ key: '', value: '' }),
        mockMcpTagEntry({ key: '  ', value: '  ' }),
      ]),
    ).toBe(false);
  });

  it('should block a key without a value', () => {
    expect(hasBlockingTag([mockMcpTagEntry({ value: '' })])).toBe(true);
  });

  it('should block a value without a key', () => {
    expect(hasBlockingTag([mockMcpTagEntry({ key: '' })])).toBe(true);
  });

  it('should not block a complete key-value pair', () => {
    expect(hasBlockingTag([mockMcpTagEntry()])).toBe(false);
  });
});

describe('resolveIconsForSubmit', () => {
  const officialIcon = () => mockMcpIcon({ src: 'https://example.com/official.svg' });
  const userAnyIcon = () => mockMcpIcon({ src: 'https://example.com/any.svg' });
  const userLightIcon = () => mockMcpIcon({ src: 'https://example.com/light.svg', theme: 'light' });
  const userDarkIcon = () => mockMcpIcon({ src: 'https://example.com/dark.svg', theme: 'dark' });
  const failed = (src: string) => new Set([src]);

  it('should send the official icon when the user added none', () => {
    expect(resolveIconsForSubmit([], [officialIcon()])).toEqual([officialIcon()]);
  });

  it('should omit official when it failed to load and the user added none', () => {
    const official = officialIcon();
    expect(resolveIconsForSubmit([], [official], failed(official.src))).toEqual([]);
  });

  it('should send an any-theme user icon without appending official', () => {
    expect(resolveIconsForSubmit([userAnyIcon()], [officialIcon()])).toEqual([userAnyIcon()]);
  });

  it('should send separate light and dark user icons without appending official', () => {
    expect(resolveIconsForSubmit([userLightIcon(), userDarkIcon()], [officialIcon()])).toEqual([
      userLightIcon(),
      userDarkIcon(),
    ]);
  });

  it('should append official when the user only added a light icon', () => {
    expect(resolveIconsForSubmit([userLightIcon()], [officialIcon()])).toEqual([
      userLightIcon(),
      officialIcon(),
    ]);
  });

  it('should append official when the user only added a dark icon', () => {
    expect(resolveIconsForSubmit([userDarkIcon()], [officialIcon()])).toEqual([
      userDarkIcon(),
      officialIcon(),
    ]);
  });

  it('should drop empty, malformed, and failed user rows', () => {
    expect(
      resolveIconsForSubmit(
        [
          mockMcpIcon({ src: '' }),
          mockMcpIcon({ src: 'not-a-url' }),
          mockMcpIcon({ src: 'https://example.com/broken.svg' }),
          userLightIcon(),
        ],
        [officialIcon()],
        failed('https://example.com/broken.svg'),
      ),
    ).toEqual([userLightIcon(), officialIcon()]);
  });

  it('should keep http catalog logo URLs in the payload', () => {
    const localOfficial = mockMcpIcon({
      src: 'http://localhost:4010/model-registry/api/v1/logo',
    });
    expect(resolveIconsForSubmit([], [localOfficial])).toEqual([localOfficial]);
  });
});

describe('resolveActionButtonState', () => {
  it('should return enabled when no check matches', () => {
    expect(resolveActionButtonState([false, undefined])).toEqual({
      enabled: true,
      loading: false,
    });
  });

  it('should return the first matching check', () => {
    expect(
      resolveActionButtonState([false, { tooltip: 'second' }, { loading: true, tooltip: 'third' }]),
    ).toEqual({
      enabled: false,
      loading: false,
      tooltip: 'second',
    });
  });
});

const readyRegisterButtonArgs = () => ({
  serverSettled: true,
  hasServerData: true,
  dscSettled: true,
  registriesNamespace: 'rhoai',
  mlflowLoaded: true,
  mlflowUnreachable: false,
  mlflowConfigured: true,
  converterSettled: true,
});

describe('getRegisterButtonState', () => {
  it('should return enabled when all prerequisites are met', () => {
    expect(getRegisterButtonState(readyRegisterButtonArgs())).toEqual({
      enabled: true,
      loading: false,
    });
  });

  it('should disable while server details are loading', () => {
    expect(getRegisterButtonState({ ...readyRegisterButtonArgs(), serverSettled: false })).toEqual({
      enabled: false,
      loading: true,
      tooltip: REGISTER_BUTTON_TOOLTIP.LOADING_SERVER,
    });
  });

  it('should disable when server data is missing', () => {
    expect(getRegisterButtonState({ ...readyRegisterButtonArgs(), hasServerData: false })).toEqual({
      enabled: false,
      loading: false,
      tooltip: REGISTER_BUTTON_TOOLTIP.UNABLE_TO_LOAD_SERVER,
    });
  });

  it('should disable while catalog configuration is loading', () => {
    expect(getRegisterButtonState({ ...readyRegisterButtonArgs(), dscSettled: false })).toEqual({
      enabled: false,
      loading: true,
      tooltip: REGISTER_BUTTON_TOOLTIP.LOADING_CATALOG,
    });
  });

  it('should disable when the catalog namespace is not configured', () => {
    expect(
      getRegisterButtonState({ ...readyRegisterButtonArgs(), registriesNamespace: '' }),
    ).toEqual({
      enabled: false,
      loading: false,
      tooltip: REGISTER_BUTTON_TOOLTIP.NAMESPACE_NOT_CONFIGURED,
    });
  });

  it('should disable while MLflow availability is still loading', () => {
    expect(getRegisterButtonState({ ...readyRegisterButtonArgs(), mlflowLoaded: false })).toEqual({
      enabled: false,
      loading: true,
      tooltip: REGISTER_BUTTON_TOOLTIP.CHECKING_MLFLOW,
    });
  });

  it('should disable when MLflow is unreachable', () => {
    expect(
      getRegisterButtonState({ ...readyRegisterButtonArgs(), mlflowUnreachable: true }),
    ).toEqual({
      enabled: false,
      loading: false,
      tooltip: REGISTER_BUTTON_TOOLTIP.MLFLOW_UNREACHABLE,
    });
  });

  it('should disable when MLflow is not configured', () => {
    expect(
      getRegisterButtonState({ ...readyRegisterButtonArgs(), mlflowConfigured: false }),
    ).toEqual({
      enabled: false,
      loading: false,
      tooltip: REGISTER_BUTTON_TOOLTIP.MLFLOW_UNAVAILABLE,
    });
  });

  it('should disable while deploy configuration is loading', () => {
    expect(
      getRegisterButtonState({ ...readyRegisterButtonArgs(), converterSettled: false }),
    ).toEqual({
      enabled: false,
      loading: true,
      tooltip: REGISTER_BUTTON_TOOLTIP.LOADING_DEPLOY_CONFIG,
    });
  });

  it('should return the first blocking prerequisite when multiple checks fail', () => {
    expect(
      getRegisterButtonState({
        ...readyRegisterButtonArgs(),
        serverSettled: false,
        mlflowConfigured: false,
      }),
    ).toEqual({
      enabled: false,
      loading: true,
      tooltip: REGISTER_BUTTON_TOOLTIP.LOADING_SERVER,
    });
  });
});

describe('catalogToRegistryIcons', () => {
  const ns = 'test-namespace';

  it('should return a single row from server.logo when it is an http(s) URL', () => {
    const server = mockMcpServer({ logo: 'https://example.com/icon.svg' });
    expect(catalogToRegistryIcons(server, ns)).toEqual([mockMcpIcon()]);
  });

  it('should rewrite data-URI logos to the catalog logo endpoint URL with namespace', () => {
    const server = mockMcpServer({
      id: 'kubernetes-server-1',
      logo: 'data:image/svg+xml;base64,PHN2Zy4uLjwvc3ZnPg==',
    });
    const result = catalogToRegistryIcons(server, ns);
    expect(result).toHaveLength(1);
    expect(result[0].src).toMatch(
      /\/model-registry\/api\/v1\/mcp_catalog\/mcp_servers\/kubernetes-server-1\/logo\?namespace=test-namespace$/,
    );
  });

  it('should return an empty array when server.logo is absent', () => {
    const server = mockMcpServer();
    expect(catalogToRegistryIcons(server, ns)).toEqual([]);
  });
});

describe('catalogToRegistryTags', () => {
  it('should prefill catalog.source.id from the catalog source_id', () => {
    expect(catalogToRegistryTags(mockServerWithSourceId('community_mcp_servers'))).toEqual([
      { key: CATALOG_SOURCE_ID_TAG_KEY, value: 'community_mcp_servers' },
    ]);
  });

  it('should trim source_id whitespace', () => {
    expect(catalogToRegistryTags(mockServerWithSourceId('  sample  '))).toEqual([
      { key: CATALOG_SOURCE_ID_TAG_KEY, value: 'sample' },
    ]);
  });

  it('should return an empty array when source_id is missing or blank', () => {
    expect(catalogToRegistryTags(mockMcpServer())).toEqual([]);
    expect(catalogToRegistryTags(mockServerWithSourceId('   '))).toEqual([]);
  });
});

describe('isMcpServerJson / isMcpServerJsonMeta', () => {
  it('should narrow plain objects to McpServerJson', () => {
    expect(isMcpServerJson({ name: 'a/b', version: '1.0.0' })).toBe(true);
    expect(isMcpServerJson(null)).toBe(false);
  });

  it('should narrow plain objects to McpServerJsonMeta', () => {
    expect(isMcpServerJsonMeta({ 'io.example/key': true })).toBe(true);
    expect(isMcpServerJsonMeta([])).toBe(false);
  });
});

describe('isValidMcpRegistryName', () => {
  it('should accept a namespaced slug', () => {
    expect(isValidMcpRegistryName('com.example/my-server')).toBe(true);
    expect(isValidMcpRegistryName('io.github.foo/ab')).toBe(true);
  });

  it('should reject names that are not exactly namespace/slug', () => {
    expect(isValidMcpRegistryName('my-server')).toBe(false);
    expect(isValidMcpRegistryName('/slug')).toBe(false);
    expect(isValidMcpRegistryName('ns/')).toBe(false);
    expect(isValidMcpRegistryName('a/b/c')).toBe(false);
  });

  it('should reject reserved slugs and too-short segments', () => {
    expect(isValidMcpRegistryName('com.example/tags')).toBe(false);
    expect(isValidMcpRegistryName('a/my-server')).toBe(false);
    expect(isValidMcpRegistryName('com.example/s')).toBe(false);
  });
});

describe('getMcpServerJsonSubmitError / canSubmitMcpServerJson', () => {
  it('should return undefined for valid server.json', () => {
    const json = JSON.stringify({ name: 'com.example/my-server', version: '1.0.0' });
    expect(getMcpServerJsonSubmitError(json)).toBeUndefined();
    expect(canSubmitMcpServerJson({ name: 'com.example/my-server', version: '1.0.0' })).toBe(true);
  });

  it('should require parseable JSON with a namespaced name and version', () => {
    expect(getMcpServerJsonSubmitError('{not json')).toBe(MCP_SERVER_JSON_ERROR.INVALID_JSON);
    expect(getMcpServerJsonSubmitError(JSON.stringify({ version: '1.0.0' }))).toBe(
      MCP_SERVER_JSON_ERROR.MISSING_NAME,
    );
    expect(
      getMcpServerJsonSubmitError(JSON.stringify({ name: 'my-server', version: '1.0.0' })),
    ).toBe(MCP_SERVER_JSON_ERROR.INVALID_NAME);
    expect(getMcpServerJsonSubmitError(JSON.stringify({ name: 'com.example/my-server' }))).toBe(
      MCP_SERVER_JSON_ERROR.MISSING_VERSION,
    );
    expect(canSubmitMcpServerJson({ name: 'my-server', version: '1.0.0' })).toBe(false);
    expect(canSubmitMcpServerJson({ name: 'com.example/my-server' })).toBe(false);
  });
});

describe('withDeploySpecMeta', () => {
  it('should use catalog serverJson as-is without rebuilding from discrete fields', () => {
    const server = mockMcpServer({
      description: 'ignored when serverJson is present',
      serverJson: mockMcpServerJson({
        name: 'io.github.example/from-catalog',
        version: '2.0.0',
        packages: [{ registryType: 'oci', identifier: 'oci://example/img:1' }],
      }),
    });

    const result = withDeploySpecMeta(server);

    expect(result).toEqual(server.serverJson);
    expect(result.description).toBeUndefined();
    expect(result.remotes).toBeUndefined();
  });

  it('should return an empty object when serverJson is absent', () => {
    expect(withDeploySpecMeta(mockMcpServer({ serverJson: undefined }))).toEqual({});
  });

  it('should embed deploySpec under the com.redhat/deploy-spec _meta key when provided', () => {
    const server = mockMcpServer({
      serverJson: mockMcpServerJson({ name: 'catalog/my-server' }),
    });
    const deploySpec = mockMcpDeploySpec();

    const result = withDeploySpecMeta(server, deploySpec);

    expect(RHAI_DEPLOY_SPEC_META_KEY).toBe('com.redhat/deploy-spec');
    expect(result).toEqual({
      name: 'catalog/my-server',
      version: '1.0.0',
      _meta: { [RHAI_DEPLOY_SPEC_META_KEY]: deploySpec },
    });
  });

  it('should merge deploy-spec into catalog serverJson _meta without dropping existing meta keys', () => {
    const server = mockMcpServer({
      serverJson: mockMcpServerJson({
        name: 'catalog/my-server',
        _meta: { 'io.example/existing': true },
      }),
    });
    const deploySpec = mockMcpDeploySpec();

    const result = withDeploySpecMeta(server, deploySpec);

    expect(result._meta).toEqual({
      'io.example/existing': true,
      [RHAI_DEPLOY_SPEC_META_KEY]: deploySpec,
    });
  });
});

describe('registerMcpServer', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should call the composite BFF register endpoint with version payload and metadata', async () => {
    const registerFn = jest
      .fn()
      .mockResolvedValue(
        mockRegisterMCPServerResult({ version: mockMcpServerVersion({ version: '1.0.0' }) }),
      );
    mockRegister.mockReturnValue(registerFn);

    const result = await registerMcpServer(
      {
        tools: [],
        registryName: 'kubernetes/mcp-server',
        serverJson: mockMcpServerJson(),
        status: 'draft',
        icons: [mockMcpIcon(), mockMcpIcon({ src: '' })],
      },
      CONTEXT,
    );

    expect(result.version.version).toBe('1.0.0');
    expect(result.metadataError).toBeUndefined();
    expect(registerFn).toHaveBeenCalledWith(CONTEXT.opts, {
      name: 'kubernetes/mcp-server',
      // eslint-disable-next-line camelcase
      server_json: mockMcpServerJson(),
      status: 'draft',
      tools: [],
      icons: [mockMcpIcon()],
    });
  });

  it('should keep same-origin catalog logo URLs so the registry UI can load them', async () => {
    const registerFn = jest.fn().mockResolvedValue(mockRegisterMCPServerResult());
    mockRegister.mockReturnValue(registerFn);

    const localLogo =
      'http://localhost:4010/model-registry/api/v1/mcp_catalog/mcp_servers/11/logo?namespace=ns';

    await registerMcpServer(
      {
        tools: [],
        registryName: 'com.mongodb/mongodb-mcp-server',
        serverJson: mockMcpServerJson({ name: 'com.mongodb/mongodb-mcp-server' }),
        status: 'draft',
        icons: [mockMcpIcon({ src: localLogo })],
      },
      CONTEXT,
    );

    expect(registerFn).toHaveBeenCalledWith(
      CONTEXT.opts,
      expect.objectContaining({
        icons: [mockMcpIcon({ src: localLogo })],
      }),
    );
  });

  it('should include display_name in the register payload, kept out of server_json', async () => {
    const registerFn = jest.fn().mockResolvedValue(mockRegisterMCPServerResult());
    mockRegister.mockReturnValue(registerFn);

    await registerMcpServer(
      {
        tools: [],
        registryName: 'kubernetes/mcp-server',
        serverJson: mockMcpServerJson(),
        displayName: '  Kubernetes MCP  ',
        status: 'draft',
        icons: [],
      },
      CONTEXT,
    );

    expect(registerFn).toHaveBeenCalledWith(
      CONTEXT.opts,
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        display_name: 'Kubernetes MCP',
        // eslint-disable-next-line camelcase
        server_json: mockMcpServerJson(),
      }),
    );
  });

  it('should map soft-failure fields from the BFF response to Error toasts', async () => {
    const registerFn = jest.fn().mockResolvedValue(
      mockRegisterMCPServerResult({
        // eslint-disable-next-line camelcase
        metadata_error: 'Failed to save display name and icons',
        // eslint-disable-next-line camelcase
        failed_tag_keys: ['team', 'env'],
      }),
    );
    mockRegister.mockReturnValue(registerFn);

    const result = await registerMcpServer(
      {
        tools: [],
        registryName: 'kubernetes/mcp-server',
        serverJson: mockMcpServerJson(),
        status: 'draft',
        icons: [],
        tags: [mockMcpTagEntry(), mockMcpTagEntry({ key: 'env', value: 'prod' })],
      },
      CONTEXT,
    );

    expect(result.version).toEqual(mockMcpServerVersion());
    expect(result.metadataError?.message).toBe('Failed to save display name and icons');
    expect(result.tagsError?.message).toBe('Failed to set tags: team, env');
  });

  it('should forward catalog-shaped tools to the BFF (revoked filtering happens server-side)', async () => {
    const registerFn = jest.fn().mockResolvedValue(mockRegisterMCPServerResult());
    mockRegister.mockReturnValue(registerFn);

    const tools = [
      mockMcpTool({
        name: 'list_pods',
        description: 'List pods',
        parameters: [{ name: 'ns', type: 'string', required: true }],
      }),
      mockMcpTool({
        name: 'old_tool',
        accessType: 'execute',
        revoked: true,
      }),
    ];

    await registerMcpServer(
      {
        tools,
        registryName: 'kubernetes/mcp-server',
        serverJson: mockMcpServerJson(),
        status: 'active',
        icons: [],
      },
      CONTEXT,
    );

    expect(registerFn).toHaveBeenCalledWith(CONTEXT.opts, expect.objectContaining({ tools }));
  });

  it('should dedupe tags and omit empty keys or values before calling the BFF', async () => {
    const registerFn = jest.fn().mockResolvedValue(mockRegisterMCPServerResult());
    mockRegister.mockReturnValue(registerFn);

    await registerMcpServer(
      {
        tools: [],
        registryName: 'kubernetes/mcp-server',
        serverJson: mockMcpServerJson(),
        status: 'draft',
        icons: [],
        tags: [
          mockMcpTagEntry({ key: ' team ', value: ' a ' }),
          mockMcpTagEntry({ key: '', value: 'skip' }),
          mockMcpTagEntry({ key: 'orphan', value: '' }),
          mockMcpTagEntry({ key: 'team', value: 'b' }),
        ],
      },
      CONTEXT,
    );

    expect(registerFn).toHaveBeenCalledWith(
      CONTEXT.opts,
      expect.objectContaining({
        tags: [mockMcpTagEntry({ key: 'team', value: 'b' })],
      }),
    );
  });
});

describe('notifyRegisterMcpServerResult', () => {
  const makeNotification = () => ({
    success: jest.fn(),
    warning: jest.fn(),
  });

  it('should show a success notification', () => {
    const notification = makeNotification();

    notifyRegisterMcpServerResult(notification, 'kubernetes/mcp-server', {
      version: mockMcpServerVersion({ version: '2.0.0' }),
    });

    expect(notification.success).toHaveBeenCalledWith(
      REGISTER_NOTIFICATION.success('kubernetes/mcp-server', '2.0.0'),
    );
  });

  it('should warn when metadata and tags failed to save', () => {
    const notification = makeNotification();

    notifyRegisterMcpServerResult(notification, 'kubernetes/mcp-server', {
      version: mockMcpServerVersion({ version: '2.0.0' }),
      metadataError: new Error('icons PATCH failed'),
      tagsError: new Error('Failed to set tags: team'),
    });

    expect(notification.warning).toHaveBeenCalledWith(
      REGISTER_NOTIFICATION.METADATA_NOT_SAVED,
      'icons PATCH failed',
    );
    expect(notification.warning).toHaveBeenCalledWith(
      REGISTER_NOTIFICATION.TAGS_NOT_SAVED,
      'Failed to set tags: team',
    );
  });

  it('should skip warnings when soft failures are absent', () => {
    const notification = makeNotification();

    notifyRegisterMcpServerResult(notification, 'kubernetes/mcp-server', {
      version: mockMcpServerVersion(),
    });

    expect(notification.success).toHaveBeenCalledTimes(1);
    expect(notification.warning).not.toHaveBeenCalled();
  });
});

describe('mcpServerDetailRoute', () => {
  it('should return the server path without a query string when no namespace is provided', () => {
    expect(mcpServerDetailRoute('my-server')).toBe(`${MCP_REGISTRY_BASENAME}/my-server`);
  });

  it('should append the workspace query param when a namespace is provided', () => {
    expect(mcpServerDetailRoute('my-server', 'my-project')).toBe(
      `${MCP_REGISTRY_BASENAME}/my-server?workspace=my-project`,
    );
  });

  it('should URL-encode server names with special characters', () => {
    expect(mcpServerDetailRoute('io.github.acme/widget-server', 'my-project')).toBe(
      `${MCP_REGISTRY_BASENAME}/io%252Egithub%252Eacme%2Fwidget-server?workspace=my-project`,
    );
  });

  it('should double-encode dots so the last path segment has no literal "." (dev historyApiFallback dot-rule)', () => {
    expect(mcpServerDetailRoute('com.example.org/my-server')).not.toContain('.');
    expect(mcpServerDetailRoute('com.example.org/my-server')).toBe(
      `${MCP_REGISTRY_BASENAME}/com%252Eexample%252Eorg%2Fmy-server`,
    );
  });
});
