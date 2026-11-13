import fetchNamespaces, {
  NamespaceListUnavailableError,
  fetchNamespaceByName,
} from '../fetchNamespaces';

const mockNamespaceList = (names: string[], phases?: Record<string, string>) => ({
  data: names.map((name) => ({
    name,
    phase: phases?.[name] ?? 'Active',
  })),
});

const mockFetch = (response: Partial<Response>) => {
  global.fetch = jest.fn().mockResolvedValue(response);
  return global.fetch as jest.Mock;
};

describe('fetchNamespaces', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('maps namespace items to ProjectKind objects', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve(mockNamespaceList(['ns-a', 'ns-b'])),
    } as Response);

    const result = await fetchNamespaces();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'ns-a' },
      status: { phase: 'Active' },
    });
    expect(result[1].metadata.name).toBe('ns-b');
  });

  it('maps Terminating phase correctly', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve(mockNamespaceList(['alive', 'dying'], { dying: 'Terminating' })),
    } as Response);

    const result = await fetchNamespaces();

    expect(result.find((p) => p.metadata.name === 'alive')?.status?.phase).toBe('Active');
    expect(result.find((p) => p.metadata.name === 'dying')?.status?.phase).toBe('Terminating');
  });

  it('should not treat an unreported namespace phase as Active', async () => {
    mockFetch({ ok: true, json: async () => ({ data: [{ name: 'unknown' }] }) });
    expect((await fetchNamespaces())[0].status?.phase).toBe('Terminating');
  });

  it('skips items without metadata.name', async () => {
    mockFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{}, { name: 'valid' }, { phase: 'Active' }],
        }),
    } as Response);

    const result = await fetchNamespaces();

    expect(result).toHaveLength(1);
    expect(result[0].metadata.name).toBe('valid');
  });

  it('skips items with non-string metadata.name', async () => {
    mockFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ name: 42 }, { name: 'valid' }],
        }),
    } as Response);

    const result = await fetchNamespaces();

    expect(result).toHaveLength(1);
    expect(result[0].metadata.name).toBe('valid');
  });

  it('should reject a malformed response instead of reporting an empty list', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve('not-an-object'),
    } as Response);

    await expect(fetchNamespaces()).rejects.toThrow('Invalid namespace list response');
  });

  it('should reject a non-array data value', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({ data: 'not-an-array' }),
    } as Response);

    await expect(fetchNamespaces()).rejects.toThrow('Invalid namespace list response');
  });

  it('throws on non-ok response', async () => {
    mockFetch({
      ok: false,
      status: 403,
    } as Response);

    await expect(fetchNamespaces()).rejects.toBeInstanceOf(NamespaceListUnavailableError);
  });

  it('passes abort signal to fetch', async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve(mockNamespaceList([])),
    } as Response);

    const controller = new AbortController();
    await fetchNamespaces(controller.signal);

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/namespaces', {
      signal: controller.signal,
    });
  });
});

describe('fetchNamespaceByName', () => {
  it('should return the exact authorized identity with its display name', async () => {
    mockFetch({
      ok: true,
      json: async () => ({
        data: { name: 'my-project', displayName: 'My project', phase: 'Active' },
      }),
    });
    await expect(fetchNamespaceByName('my-project')).resolves.toMatchObject({
      metadata: { name: 'my-project', annotations: { 'openshift.io/display-name': 'My project' } },
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/namespaces/my-project', {
      signal: undefined,
    });
  });

  it.each([403, 404])('should reject unauthorized or missing projects (%s)', async (status) => {
    mockFetch({ ok: false, status });
    await expect(fetchNamespaceByName('missing')).rejects.toThrow('No access to that project');
  });

  it('should reject invalid names without a request and mismatched responses', async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ data: { name: 'other' } }) });
    await expect(fetchNamespaceByName('Not a name')).rejects.toThrow('valid resource name');
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(fetchNamespaceByName('expected')).rejects.toThrow('No access to that project');
  });

  it('should reject non-Active and unauthenticated lookup results', async () => {
    mockFetch({ ok: true, json: async () => ({ data: { name: 'waiting', phase: '' } }) });
    await expect(fetchNamespaceByName('waiting')).rejects.toThrow('No access to that project');
    mockFetch({ ok: false, status: 401 });
    await expect(fetchNamespaceByName('waiting')).rejects.toThrow('Sign in again');
  });
});
