import type { APIOptions } from 'mod-arch-core';
import { setMcpRegistryServerTag } from '~/odh/api/mcpRegistry/service';

const mockFetchResponse = (
  body: string,
  { ok, status }: { ok: boolean; status: number } = { ok: true, status: 204 },
): void => {
  const stub: Pick<Response, 'ok' | 'status' | 'text'> = {
    ok,
    status,
    text: () => Promise.resolve(body),
  };
  global.fetch = jest.fn().mockResolvedValue(stub as unknown as Response);
};

const OPTS: APIOptions = {};

describe('setMcpRegistryServerTag', () => {
  it('resolves when the BFF returns 204 No Content (empty body)', async () => {
    mockFetchResponse('');

    await expect(
      setMcpRegistryServerTag('', {})(OPTS, 'kubernetes/mcp-server', {
        key: 'team',
        value: 'platform',
      }),
    ).resolves.toBeUndefined();
  });

  it('throws with the BFF error message for a non-2xx response with a JSON error body', async () => {
    mockFetchResponse(
      JSON.stringify({ error: { code: 'bad_request', message: 'key is required' } }),
      { ok: false, status: 400 },
    );

    await expect(
      setMcpRegistryServerTag('', {})(OPTS, 'kubernetes/mcp-server', { key: '', value: '' }),
    ).rejects.toThrow('key is required');
  });

  it('throws for a non-2xx response with an empty body', async () => {
    mockFetchResponse('', { ok: false, status: 502 });

    await expect(
      setMcpRegistryServerTag('', {})(OPTS, 'kubernetes/mcp-server', { key: 'team' }),
    ).rejects.toThrow('HTTP 502');
  });

  it('throws for a non-2xx response with a non-JSON body (e.g. an HTML error page)', async () => {
    mockFetchResponse('<html>502 Bad Gateway</html>', { ok: false, status: 502 });

    await expect(
      setMcpRegistryServerTag('', {})(OPTS, 'kubernetes/mcp-server', { key: 'team' }),
    ).rejects.toThrow('HTTP 502');
  });

  it('resolves for a non-JSON, non-empty response body on success', async () => {
    mockFetchResponse('OK');

    await expect(
      setMcpRegistryServerTag('', {})(OPTS, 'kubernetes/mcp-server', { key: 'team' }),
    ).resolves.toBeUndefined();
  });
});
