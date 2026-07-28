import fetchNamespaces from '../fetchNamespaces';

const mockNamespaceList = (names: string[], phases?: Record<string, string>) => ({
  items: names.map((name) => ({
    metadata: { name },
    status: { phase: phases?.[name] ?? 'Active' },
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

  it('skips items without metadata.name', async () => {
    mockFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [{ metadata: {} }, { metadata: { name: 'valid' } }, { status: {} }],
        }),
    } as Response);

    const result = await fetchNamespaces();

    expect(result).toHaveLength(1);
    expect(result[0].metadata.name).toBe('valid');
  });

  it('returns empty array for malformed response', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve('not-an-object'),
    } as Response);

    const result = await fetchNamespaces();

    expect(result).toEqual([]);
  });

  it('returns empty array when items is not an array', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({ items: 'not-an-array' }),
    } as Response);

    const result = await fetchNamespaces();

    expect(result).toEqual([]);
  });

  it('throws on non-ok response', async () => {
    mockFetch({
      ok: false,
      status: 403,
    } as Response);

    await expect(fetchNamespaces()).rejects.toThrow('Failed to list namespaces (HTTP 403)');
  });

  it('passes abort signal to fetch', async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve(mockNamespaceList([])),
    } as Response);

    const controller = new AbortController();
    await fetchNamespaces(controller.signal);

    expect(fetchMock).toHaveBeenCalledWith('/api/k8s/api/v1/namespaces', {
      signal: controller.signal,
    });
  });
});
