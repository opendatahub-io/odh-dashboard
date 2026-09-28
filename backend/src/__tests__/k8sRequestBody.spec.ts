import type { FastifyRequest } from 'fastify';
import { stripEmptyJsonContentType } from '../utils/k8sRequestBody';

describe('stripEmptyJsonContentType', () => {
  const request = (method: string, headers: Record<string, string | undefined>): FastifyRequest =>
    ({
      method,
      headers,
    } as FastifyRequest);

  it('should strip application/json from DELETE with no body', () => {
    const req = request('DELETE', { 'content-type': 'application/json' });
    stripEmptyJsonContentType(req);
    expect(req.headers['content-type']).toBeUndefined();
  });

  it('should strip application/json from GET with content-length 0', () => {
    const req = request('GET', { 'content-type': 'application/json', 'content-length': '0' });
    stripEmptyJsonContentType(req);
    expect(req.headers['content-type']).toBeUndefined();
  });

  it('should keep application/json on DELETE when a body is present', () => {
    const req = request('DELETE', { 'content-type': 'application/json', 'content-length': '2' });
    stripEmptyJsonContentType(req);
    expect(req.headers['content-type']).toBe('application/json');
  });

  it('should keep application/json on a chunked DELETE that carries a body', () => {
    const req = request('DELETE', {
      'content-type': 'application/json',
      'transfer-encoding': 'chunked',
    });
    stripEmptyJsonContentType(req);
    expect(req.headers['content-type']).toBe('application/json');
  });

  it('should keep application/json when transfer-encoding is set even if content-length is 0', () => {
    const req = request('DELETE', {
      'content-type': 'application/json',
      'content-length': '0',
      'transfer-encoding': 'chunked',
    });
    stripEmptyJsonContentType(req);
    expect(req.headers['content-type']).toBe('application/json');
    expect(req.headers['transfer-encoding']).toBe('chunked');
  });

  it('should not strip PATCH content types', () => {
    const req = request('PATCH', { 'content-type': 'application/json-patch+json' });
    stripEmptyJsonContentType(req);
    expect(req.headers['content-type']).toBe('application/json-patch+json');
  });
});
