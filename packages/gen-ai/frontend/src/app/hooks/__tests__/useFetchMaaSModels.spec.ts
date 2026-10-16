/* eslint-disable camelcase */
import { waitFor } from '@testing-library/react';
import { restGET } from 'mod-arch-core';
import { mockMaaSModel } from '~/__mocks__/mockMaaSModel';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import useFetchMaaSModels from '~/app/hooks/useFetchMaaSModels';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  restGET: jest.fn(),
}));

jest.mock('~/app/utilities/const', () => ({
  ...jest.requireActual('~/app/utilities/const'),
  API_URL_PREFIX: '/maas-portal/gen-ai',
}));

describe('useFetchMaaSModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch only MaaS models without a namespace and preserve the portal base path', async () => {
    jest.mocked(restGET).mockResolvedValue({
      data: [
        mockMaaSModel(),
        mockMaaSModel({ model_id: 'granite', display_name: 'Granite' }),
        mockMaaSModel({ model_source_type: 'namespace' }),
        mockMaaSModel({ model_source_type: 'custom_endpoint' }),
        null,
      ],
    });
    const result = testHook(useFetchMaaSModels)();
    expect(result.result.current.loaded).toBe(false);

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(restGET).toHaveBeenCalledWith(
      '/maas-portal/gen-ai/api/v1',
      '/aaa/models',
      { sources: 'maas' },
      expect.any(Object),
    );
    expect(restGET).toHaveBeenCalledTimes(1);
    expect(result.result.current.data.map((model) => model.display_name)).toEqual([
      'Llama 3',
      'Granite',
    ]);
    expect(result.result.current.data[0].externalEndpoint).toBe(
      'https://models.example.com/llama-3/v1',
    );
    expect(result).hookToHaveUpdateCount(2);
  });

  it('should handle an empty models list', async () => {
    jest.mocked(restGET).mockResolvedValue({ data: [] });
    const result = testHook(useFetchMaaSModels)();
    await waitFor(() => expect(result.result.current.loaded).toBe(true));
    expect(result.result.current.data).toEqual([]);
    expect(result).hookToHaveUpdateCount(2);
  });

  it('should expose API failures', async () => {
    jest.mocked(restGET).mockRejectedValue(new Error('Service unavailable'));
    const result = testHook(useFetchMaaSModels)();
    await waitFor(() => expect(result.result.current.error).toBeDefined());
    expect(result.result.current.data).toEqual([]);
    expect(result).hookToHaveUpdateCount(2);
  });

  it('should reject an invalid response instead of treating it as an empty list', async () => {
    jest.mocked(restGET).mockResolvedValue({ data: {} });
    const result = testHook(useFetchMaaSModels)();
    await waitFor(() => expect(result.result.current.error).toBeDefined());
    expect(result.result.current.error?.message).toBe(
      'Invalid response from getAAModels: expected an array',
    );
    expect(result).hookToHaveUpdateCount(2);
  });
});
