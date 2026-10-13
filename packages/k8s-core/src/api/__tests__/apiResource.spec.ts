import { getAPIResource } from '../apiResource';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

describe('getAPIResource', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
  });

  it('should return data that passes the supplied validator', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: ['first'] }),
    });

    await expect(getAPIResource('', '/resource', isStringArray)).resolves.toEqual(['first']);
  });

  it('should reject a response with null data', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: null }),
    });

    await expect(getAPIResource('', '/resource', isStringArray)).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should reject data that does not pass the supplied validator', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [1] }),
    });

    await expect(getAPIResource('', '/resource', isStringArray)).rejects.toThrow(
      'Invalid response format',
    );
  });
});
