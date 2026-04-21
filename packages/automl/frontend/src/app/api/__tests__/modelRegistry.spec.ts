/* eslint-disable camelcase -- BFF API uses snake_case */
import { restGET, restCREATE, isModArchResponse } from 'mod-arch-core';
import { getModelRegistries, registerModel } from '~/app/api/modelRegistry';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/automl',
  BFF_API_VERSION: 'v1',
}));

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn((promise: Promise<unknown>) => promise),
  restGET: jest.fn(),
  restCREATE: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const mockRestGET = jest.mocked(restGET);
const mockRestCREATE = jest.mocked(restCREATE);
const mockIsModArchResponse = jest.mocked(isModArchResponse);

describe('getModelRegistries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return model registries when response is valid', async () => {
    const mockData = {
      model_registries: [
        {
          id: 'uid-1',
          name: 'default-registry',
          display_name: 'Default Registry',
          is_ready: true,
          server_url: 'https://default-registry.svc:8443/api/model_registry/v1alpha3',
        },
      ],
    };
    mockRestGET.mockResolvedValue({ data: mockData });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getModelRegistries('');

    expect(result).toEqual(mockData);
    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/automl/api/v1/model-registries',
      {},
      expect.any(Object),
    );
  });

  it('should throw when response format is invalid', async () => {
    mockRestGET.mockResolvedValue({ unexpected: true });
    mockIsModArchResponse.mockReturnValue(false);

    await expect(getModelRegistries('')).rejects.toThrow('Invalid response format');
  });
});

describe('registerModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send registration request with namespace and body', async () => {
    const mockResponse = { registered_model_id: '17', model_artifact: { id: 'artifact-1' } };
    mockRestCREATE.mockResolvedValue({ data: mockResponse });
    mockIsModArchResponse.mockReturnValue(true);

    const request = {
      s3_path: 's3://bucket/path/predictor',
      model_name: 'My Model',
      version_name: 'v1',
      model_description: 'A test model',
    };

    const registryId = 'a1b2c3d4-e5f6-7890-abcd-111111111111';
    const result = await registerModel('', { namespace: 'test-ns', registryId, request });

    expect(result).toEqual(mockResponse);
    expect(mockRestCREATE).toHaveBeenCalledWith(
      '',
      `/automl/api/v1/model-registries/${registryId}/models`,
      request,
      { namespace: 'test-ns' },
      expect.any(Object),
    );
  });

  it('should throw when response format is invalid', async () => {
    mockRestCREATE.mockResolvedValue({ unexpected: true });
    mockIsModArchResponse.mockReturnValue(false);

    const request = {
      s3_path: 's3://bucket/path',
      model_name: 'Model',
      version_name: 'v1',
    };

    await expect(
      registerModel('', { namespace: 'ns', registryId: 'some-uid', request }),
    ).rejects.toThrow('Invalid response format');
  });
});
