import { handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import { getConnectionType } from '~/app/api/dch';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  handleRestFailures: jest.fn((request: Promise<unknown>) => request),
  isModArchResponse: jest.fn(),
  restGET: jest.fn(),
}));

const mockHandleRestFailures = jest.mocked(handleRestFailures);
const mockIsModArchResponse = jest.mocked(isModArchResponse);
const mockRestGET = jest.mocked(restGET);

describe('getConnectionType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsModArchResponse.mockReturnValue(true);
  });

  it('should return a connection type from a valid response', async () => {
    const connectionType = mockConnectionType();
    mockRestGET.mockResolvedValue({ data: connectionType });

    await expect(getConnectionType('')({}, 'test-project', 'postgresql')).resolves.toEqual(
      connectionType,
    );
  });

  it('should encode the connection type id and pass request options to restGET', async () => {
    const opts = { signal: new AbortController().signal };
    mockRestGET.mockResolvedValue({ data: mockConnectionType() });

    await getConnectionType('/data-connect-hub')(opts, 'test-project', 'provider/type one');

    expect(mockRestGET).toHaveBeenCalledWith(
      '/data-connect-hub',
      '/data-connect-hub/api/v1/connection-types/provider%2Ftype%20one',
      { namespace: 'test-project' },
      opts,
    );
  });

  it.each([
    ['a non-mod-arch response', false, { data: mockConnectionType() }],
    ['missing response data', true, { data: undefined }],
    ['an invalid connection type', true, { data: { metadata: {}, resource: {} } }],
  ])('should reject %s', async (_description, isResponse, response) => {
    mockIsModArchResponse.mockReturnValue(isResponse);
    mockRestGET.mockResolvedValue(response);

    await expect(getConnectionType('')({}, 'test-project', 'postgresql')).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should propagate REST failures', async () => {
    mockRestGET.mockResolvedValue({ data: mockConnectionType() });
    mockHandleRestFailures.mockRejectedValue(new Error('request failed'));

    await expect(getConnectionType('')({}, 'test-project', 'postgresql')).rejects.toThrow(
      'request failed',
    );
  });
});
