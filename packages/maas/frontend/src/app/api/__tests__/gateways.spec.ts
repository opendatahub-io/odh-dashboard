import * as modArchCore from 'mod-arch-core';
import { getMaaSGatewayUrl } from '~/app/api/gateway';
import type { MaaSGatewayURL } from '~/app/types/maas-model';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  handleRestFailures: jest.fn((p: Promise<unknown>) => p),
  restGET: jest.fn(),
}));

const mockRestGET = jest.mocked(modArchCore.restGET);
const mockHandleRestFailures = jest.mocked(modArchCore.handleRestFailures);

const validGatewayUrlResponse: MaaSGatewayURL = {
  url: 'https://gateway.example.com',
};

describe('getMaaSGatewayUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with a valid MaaS gateway URL response', async () => {
    mockRestGET.mockResolvedValue({ data: validGatewayUrlResponse });

    const result = await getMaaSGatewayUrl()({} as never);
    expect(result.url).toBe('https://gateway.example.com');
  });

  it('should throw an error if the URL is missing or not a string', async () => {
    mockRestGET.mockResolvedValue({ data: { url: 12345 } });

    await expect(getMaaSGatewayUrl()({} as never)).rejects.toThrow('Invalid response format');
  });

  it('should throw an error if the URL string is invalid or uses an unsupported protocol', async () => {
    mockRestGET.mockResolvedValue({ data: { url: 'ftp://invalid-protocol.com' } });

    await expect(getMaaSGatewayUrl()({} as never)).rejects.toThrow('Invalid response format');
  });

  it('should throw an error if the response format is invalid', async () => {
    mockRestGET.mockResolvedValue({ data: 'not-an-object' });

    await expect(getMaaSGatewayUrl()({} as never)).rejects.toThrow('Invalid response format');
  });
});
