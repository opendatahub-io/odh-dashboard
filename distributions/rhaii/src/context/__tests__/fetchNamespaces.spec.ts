import fetchNamespaces, {
  NamespaceListUnavailableError,
  fetchNamespaceByName,
} from '../fetchNamespaces';

const NOT_FOUND = { ok: false, status: 404 } as Response;

const ok = (body: unknown): Response =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

/**
 * Routes the namespace-access endpoints (xKS discovery) and the namespace
 * endpoints (every platform). Discovery defaults to 404, as on OpenShift.
 */
const mockRoutes = (routes: { access?: Response; legacy?: Response }) => {
  global.fetch = jest.fn((url: string) =>
    Promise.resolve(
      url.startsWith('/api/v1/namespace-access')
        ? routes.access ?? NOT_FOUND
        : routes.legacy ?? NOT_FOUND,
    ),
  ) as jest.Mock;
  return global.fetch as jest.Mock;
};

const mockNamespaceList = (names: string[], phases?: Record<string, string>) => ({
  data: names.map((name) => ({
    name,
    phase: phases?.[name] ?? 'Active',
  })),
});

const accessEntry = (
  name: string,
  overrides: { phase?: string; displayName?: string; deploy?: boolean } = {},
) => ({
  name,
  phase: overrides.phase ?? 'Active',
  ...(overrides.displayName && { displayName: overrides.displayName }),
  actions: {
    view: true,
    deploy: overrides.deploy ?? true,
    edit: false,
    delete: false,
    manageTokenAuth: false,
  },
  permissions: {},
});

const accessList = (source: string, namespaces: unknown[], complete = true) => ({
  data: { source, complete, issues: [], namespaces },
});

describe('fetchNamespaces', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('with namespace discovery (xKS)', () => {
    it('should map discovered namespaces with their deploy access', async () => {
      const fetchMock = mockRoutes({
        access: ok(
          accessList('cluster-list', [
            accessEntry('deployer', { displayName: 'Deployer' }),
            accessEntry('reader', { deploy: false }),
          ]),
        ),
      });

      const result = await fetchNamespaces();

      expect(result).toEqual([
        {
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: { name: 'deployer', annotations: { 'openshift.io/display-name': 'Deployer' } },
          status: { phase: 'Active' },
          canDeploy: true,
        },
        {
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: { name: 'reader' },
          status: { phase: 'Active' },
          canDeploy: false,
        },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/namespace-access', { signal: undefined });
    });

    it('should make an Unknown phase selectable and keep Terminating out', async () => {
      mockRoutes({
        access: ok(
          accessList('cluster-list', [
            accessEntry('unreadable', { phase: 'Unknown' }),
            accessEntry('dying', { phase: 'Terminating' }),
            accessEntry('unreported', { phase: '' }),
          ]),
        ),
      });

      const result = await fetchNamespaces();

      expect(result.map((p) => [p.metadata.name, p.status?.phase])).toEqual([
        ['unreadable', 'Active'],
        ['dying', 'Terminating'],
        ['unreported', 'Terminating'],
      ]);
    });

    it('should treat missing or malformed actions as no deploy access', async () => {
      mockRoutes({
        access: ok(
          accessList('cluster-list', [
            { name: 'no-actions', phase: 'Active' },
            { name: 'bad-actions', phase: 'Active', actions: 'deploy' },
          ]),
        ),
      });

      const result = await fetchNamespaces();

      expect(result.map((p) => p.canDeploy)).toEqual([false, false]);
    });

    it('should report a candidate-based list as partial with the authorized projects', async () => {
      mockRoutes({
        access: ok(accessList('candidates', [accessEntry('team-a'), { name: 42 }])),
      });

      const error = await fetchNamespaces().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NamespaceListUnavailableError);
      expect(
        (error as NamespaceListUnavailableError).projects?.map((p) => p.metadata.name),
      ).toEqual(['team-a']);
    });

    it('should reject a malformed discovery response', async () => {
      mockRoutes({ access: ok({ data: { source: 'cluster-list' } }) });
      await expect(fetchNamespaces()).rejects.toThrow('Invalid namespace list response');
    });

    it('should report an incomplete cluster list as partial so manual entry stays', async () => {
      mockRoutes({
        access: ok(accessList('cluster-list', [accessEntry('team-a')], false)),
      });

      const error = await fetchNamespaces().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NamespaceListUnavailableError);
      expect(
        (error as NamespaceListUnavailableError).projects?.map((p) => p.metadata.name),
      ).toEqual(['team-a']);
    });

    it('should keep manual entry available when discovery is unavailable', async () => {
      const fetchMock = mockRoutes({ access: { ok: false, status: 503 } as Response });

      const error = await fetchNamespaces().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NamespaceListUnavailableError);
      expect((error as NamespaceListUnavailableError).projects).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should surface other discovery failures instead of an empty list', async () => {
      mockRoutes({ access: { ok: false, status: 500 } as Response });
      await expect(fetchNamespaces()).rejects.toThrow('Failed to list namespaces (HTTP 500)');
    });
  });

  describe('without namespace discovery', () => {
    it('should fall back to the namespace list and map it to ProjectKind objects', async () => {
      const fetchMock = mockRoutes({ legacy: ok(mockNamespaceList(['ns-a', 'ns-b'])) });

      const controller = new AbortController();
      const result = await fetchNamespaces(controller.signal);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: 'ns-a' },
        status: { phase: 'Active' },
      });
      expect(result[1].metadata.name).toBe('ns-b');
      expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/namespaces', {
        signal: controller.signal,
      });
    });

    it('should map the Terminating phase', async () => {
      mockRoutes({
        legacy: ok(mockNamespaceList(['alive', 'dying'], { dying: 'Terminating' })),
      });

      const result = await fetchNamespaces();

      expect(result.find((p) => p.metadata.name === 'alive')?.status?.phase).toBe('Active');
      expect(result.find((p) => p.metadata.name === 'dying')?.status?.phase).toBe('Terminating');
    });

    it('should not treat an unreported namespace phase as Active', async () => {
      mockRoutes({ legacy: ok({ data: [{ name: 'unknown' }] }) });
      expect((await fetchNamespaces())[0].status?.phase).toBe('Terminating');
    });

    it('should skip items without a string name', async () => {
      mockRoutes({
        legacy: ok({ data: [{}, { name: 'valid' }, { phase: 'Active' }, { name: 42 }] }),
      });

      const result = await fetchNamespaces();

      expect(result).toHaveLength(1);
      expect(result[0].metadata.name).toBe('valid');
    });

    it.each(['not-an-object', { data: 'not-an-array' }])(
      'should reject a malformed response instead of reporting an empty list (%p)',
      async (body) => {
        mockRoutes({ legacy: ok(body) });
        await expect(fetchNamespaces()).rejects.toThrow('Invalid namespace list response');
      },
    );

    it('should report a forbidden listing as unavailable', async () => {
      mockRoutes({ legacy: { ok: false, status: 403 } as Response });
      const error = await fetchNamespaces().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(NamespaceListUnavailableError);
      expect((error as NamespaceListUnavailableError).projects).toBeUndefined();
    });
  });
});

describe('fetchNamespaceByName', () => {
  it('should return the authorized namespace from discovery with its deploy access', async () => {
    const fetchMock = mockRoutes({
      access: ok({ data: accessEntry('my-project', { displayName: 'My project', deploy: false }) }),
    });

    await expect(fetchNamespaceByName('my-project')).resolves.toMatchObject({
      metadata: { name: 'my-project', annotations: { 'openshift.io/display-name': 'My project' } },
      status: { phase: 'Active' },
      canDeploy: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/namespace-access/my-project', {
      signal: undefined,
    });
  });

  it('should accept an Unknown phase from discovery, labelled by name', async () => {
    mockRoutes({ access: ok({ data: accessEntry('unreadable', { phase: 'Unknown' }) }) });
    const project = await fetchNamespaceByName('unreadable');
    expect(project.status?.phase).toBe('Active');
    expect(project.metadata.annotations).toBeUndefined();
  });

  it('should reject Terminating or mismatched discovery results', async () => {
    mockRoutes({ access: ok({ data: accessEntry('dying', { phase: 'Terminating' }) }) });
    await expect(fetchNamespaceByName('dying')).rejects.toThrow('No access to that project');
    mockRoutes({ access: ok({ data: accessEntry('other') }) });
    await expect(fetchNamespaceByName('expected')).rejects.toThrow('No access to that project');
  });

  it('should reject a namespace discovery denies without falling back', async () => {
    const fetchMock = mockRoutes({ access: { ok: false, status: 403 } as Response });
    await expect(fetchNamespaceByName('denied')).rejects.toThrow('No access to that project');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should fall back to the namespace lookup when discovery is absent', async () => {
    const fetchMock = mockRoutes({
      legacy: ok({ data: { name: 'my-project', displayName: 'My project', phase: 'Active' } }),
    });
    const project = await fetchNamespaceByName('my-project');
    expect(project).toMatchObject({
      metadata: { name: 'my-project', annotations: { 'openshift.io/display-name': 'My project' } },
    });
    expect(project.canDeploy).toBeUndefined();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/namespaces/my-project', {
      signal: undefined,
    });
  });

  it.each([403, 404])('should reject unauthorized or missing projects (%s)', async (status) => {
    mockRoutes({ legacy: { ok: false, status } as Response });
    await expect(fetchNamespaceByName('missing')).rejects.toThrow('No access to that project');
  });

  it('should reject invalid names without a request and mismatched responses', async () => {
    const fetchMock = mockRoutes({ legacy: ok({ data: { name: 'other' } }) });
    await expect(fetchNamespaceByName('Not a name')).rejects.toThrow('valid resource name');
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(fetchNamespaceByName('expected')).rejects.toThrow('No access to that project');
  });

  it('should reject non-Active and unauthenticated lookup results', async () => {
    mockRoutes({ legacy: ok({ data: { name: 'waiting', phase: '' } }) });
    await expect(fetchNamespaceByName('waiting')).rejects.toThrow('No access to that project');
    mockRoutes({ access: { ok: false, status: 401 } as Response });
    await expect(fetchNamespaceByName('waiting')).rejects.toThrow('Sign in again');
    mockRoutes({ access: { ok: false, status: 503 } as Response });
    await expect(fetchNamespaceByName('waiting')).rejects.toThrow('Unable to search for projects');
  });
});
