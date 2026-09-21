import { restCREATE } from 'mod-arch-core';
import type { APIOptions } from 'mod-arch-core';
import { mockMcpServerVersion, mockRegisterMCPServerRequest } from '~/__mocks__/mockMcpRegistry';
import { registerMcpRegistryServer } from '~/odh/api/mcpRegistry';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  restCREATE: jest.fn(),
}));

const restCREATEMock = jest.mocked(restCREATE);

const OPTS: APIOptions = {};
const WORKSPACE = { workspace: 'test-project' } as const;

describe('registerMcpRegistryServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should POST to /register and unwrap the composite result', async () => {
    const payload = mockRegisterMCPServerRequest({ status: 'draft' });
    const resultData = {
      version: mockMcpServerVersion(),
    };
    restCREATEMock.mockResolvedValue({ data: resultData });

    const result = await registerMcpRegistryServer(WORKSPACE)(OPTS, payload);

    expect(restCREATEMock).toHaveBeenCalledWith(
      '',
      '/_bff/mlflow/api/v1/mcp-registry/register',
      payload,
      WORKSPACE,
      OPTS,
    );
    expect(result).toEqual(resultData);
  });

  it('should throw when the response is not a valid ModArch response', async () => {
    restCREATEMock.mockResolvedValue({ notData: true });

    await expect(
      registerMcpRegistryServer(WORKSPACE)(OPTS, mockRegisterMCPServerRequest()),
    ).rejects.toThrow('Invalid response format');
  });

  it('should reject with the BFF error message when the response body is an error envelope', async () => {
    restCREATEMock.mockResolvedValue({ error: { message: 'name already exists' } });

    await expect(
      registerMcpRegistryServer(WORKSPACE)(OPTS, mockRegisterMCPServerRequest()),
    ).rejects.toThrow('name already exists');
  });

  it('should reject when the request fails', async () => {
    restCREATEMock.mockRejectedValue(new Error('Server error'));

    await expect(
      registerMcpRegistryServer(WORKSPACE)(OPTS, mockRegisterMCPServerRequest()),
    ).rejects.toThrow('Error communicating with server');
  });
});
