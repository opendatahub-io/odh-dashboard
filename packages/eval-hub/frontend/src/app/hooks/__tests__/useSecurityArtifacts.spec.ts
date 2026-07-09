/* eslint-disable camelcase */
import { useFetchState } from 'mod-arch-core';
import useSecurityArtifacts from '~/app/hooks/useSecurityArtifacts';
import { getCatalogSecurityArtifacts } from '~/app/api/k8s';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type {
  CatalogSecurityArtifact,
  CatalogSecurityArtifactList,
} from '~/app/pages/modelCatalog/securityInsightsTypes';

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
}));

jest.mock('~/app/api/k8s', () => ({
  getCatalogSecurityArtifacts: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetCatalogSecurityArtifacts = jest.mocked(getCatalogSecurityArtifacts);

const emptyList: CatalogSecurityArtifactList = {
  items: [],
};

const mockArtifact: CatalogSecurityArtifact = {
  artifactType: 'SecurityArtifact',
  id: 'art-1',
  customProperties: {
    evaluation: { metadataType: 'MetadataStringValue', string_value: 'Pipeline' },
    category: { metadataType: 'MetadataStringValue', string_value: 'Security' },
    benchmark: { metadataType: 'MetadataStringValue', string_value: 'Toxicity' },
    description: { metadataType: 'MetadataStringValue', string_value: 'Measures toxic output' },
    result: { metadataType: 'MetadataDoubleValue', double_value: 0.92 },
  },
};

describe('useSecurityArtifacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalogSecurityArtifacts.mockReturnValue(jest.fn());
    mockUseFetchState.mockReturnValue([emptyList, false, undefined, jest.fn()]);
  });

  it('should return loading state with empty insights', () => {
    const renderResult = testHook(useSecurityArtifacts)('source-1', 'model-a', 'ns-1');

    expect(renderResult).hookToStrictEqual({
      insights: [],
      loaded: false,
      loadError: undefined,
    });
  });

  it('should return mapped insights when loaded', () => {
    const list: CatalogSecurityArtifactList = {
      items: [mockArtifact],
    };
    mockUseFetchState.mockReturnValue([list, true, undefined, jest.fn()]);

    const renderResult = testHook(useSecurityArtifacts)('source-1', 'model-a', 'ns-1');

    expect(renderResult).hookToStrictEqual({
      insights: [
        {
          evaluation: 'Pipeline',
          category: 'Security',
          benchmarkName: 'Toxicity',
          benchmarkDescription: 'Measures toxic output',
          result: '92.0%',
        },
      ],
      loaded: true,
      loadError: undefined,
    });
  });

  it('should return loadError when fetch fails', () => {
    const loadError = new Error('Network error');
    mockUseFetchState.mockReturnValue([emptyList, false, loadError, jest.fn()]);

    const renderResult = testHook(useSecurityArtifacts)('source-1', 'model-a', 'ns-1');

    expect(renderResult).hookToStrictEqual({
      insights: [],
      loaded: false,
      loadError,
    });
  });

  it('should call getCatalogSecurityArtifacts with correct arguments', () => {
    const mockFetcher = jest.fn().mockResolvedValue(emptyList);
    mockGetCatalogSecurityArtifacts.mockReturnValue(mockFetcher);

    testHook(useSecurityArtifacts)('my-source', 'my-model', 'my-ns');

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<CatalogSecurityArtifactList>,
    ];
    const mockOpts = {};
    fetchCallback(mockOpts);

    expect(mockGetCatalogSecurityArtifacts).toHaveBeenCalledWith(
      '',
      'my-source',
      'my-model',
      'my-ns',
      undefined,
    );
    expect(mockFetcher).toHaveBeenCalledWith(mockOpts);
  });

  it('should pass pageSize when provided', () => {
    const mockFetcher = jest.fn().mockResolvedValue(emptyList);
    mockGetCatalogSecurityArtifacts.mockReturnValue(mockFetcher);

    testHook(useSecurityArtifacts)('my-source', 'my-model', 'my-ns', 25);

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<CatalogSecurityArtifactList>,
    ];
    fetchCallback({});

    expect(mockGetCatalogSecurityArtifacts).toHaveBeenCalledWith(
      '',
      'my-source',
      'my-model',
      'my-ns',
      25,
    );
  });
});
