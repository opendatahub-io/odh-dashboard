import { handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import { deployAgent } from '~/app/api/deployAgent';
import type { DeployAgentRequest } from '~/app/types/deployAgent';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/agent-ops',
  BFF_API_VERSION: 'v1',
}));

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn((promise: Promise<unknown>) => promise),
  restCREATE: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const mockRestCREATE = jest.mocked(restCREATE);
const mockIsModArchResponse = jest.mocked(isModArchResponse);

const deployRequest: DeployAgentRequest = {
  name: 'my-agent',
  namespace: 'team1',
  containerImage: 'quay.io/myorg/my-agent',
  imageTag: 'latest',
};

describe('deployAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(handleRestFailures).mockImplementation((promise: Promise<unknown>) => promise);
  });

  it('posts the deploy request body directly without a data envelope', async () => {
    mockRestCREATE.mockResolvedValue({
      data: { success: true, name: 'my-agent', namespace: 'team1' },
    });
    mockIsModArchResponse.mockReturnValue(true);

    await deployAgent('')({}, deployRequest);

    expect(mockRestCREATE).toHaveBeenCalledWith(
      '',
      '/agent-ops/api/v1/agents/deploy',
      deployRequest,
      {},
      {},
    );
  });

  it('returns deploy response data from a valid mod-arch envelope', async () => {
    mockRestCREATE.mockResolvedValue({
      data: {
        success: true,
        name: 'my-agent',
        namespace: 'team1',
        message: 'Agent deployed successfully',
      },
    });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await deployAgent('')({}, deployRequest);

    expect(result).toEqual({
      success: true,
      name: 'my-agent',
      namespace: 'team1',
      message: 'Agent deployed successfully',
    });
  });

  it('throws when response name or namespace is empty', async () => {
    mockRestCREATE.mockResolvedValue({
      data: { success: true, name: '', namespace: 'team1' },
    });
    mockIsModArchResponse.mockReturnValue(true);

    await expect(deployAgent('')({}, deployRequest)).rejects.toThrow('Invalid response format');
  });

  it('throws when response is not a valid mod-arch envelope', async () => {
    mockRestCREATE.mockResolvedValue({ invalid: 'format' });
    mockIsModArchResponse.mockReturnValue(false);

    await expect(deployAgent('')({}, deployRequest)).rejects.toThrow('Invalid response format');
  });
});
