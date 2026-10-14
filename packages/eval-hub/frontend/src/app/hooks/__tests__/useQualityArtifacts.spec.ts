/* eslint-disable camelcase */
import { useFetchState } from 'mod-arch-core';
import useQualityArtifacts from '~/app/hooks/useQualityArtifacts';
import { getCatalogQualityArtifacts } from '~/app/api/k8s';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type {
  CatalogQualityArtifact,
  CatalogQualityArtifactList,
} from '~/app/pages/modelCatalog/qualityInsightsTypes';

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
}));

jest.mock('~/app/api/k8s', () => ({
  getCatalogQualityArtifacts: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetCatalogQualityArtifacts = jest.mocked(getCatalogQualityArtifacts);

const emptyList: CatalogQualityArtifactList = {
  items: [],
};

const makeArtifact = (benchmark: string, result: number): CatalogQualityArtifact => ({
  artifactType: 'QualityArtifact',
  customProperties: {
    evaluation: { metadataType: 'MetadataStringValue', string_value: 'Pipeline' },
    category: { metadataType: 'MetadataStringValue', string_value: 'Quality' },
    benchmark: { metadataType: 'MetadataStringValue', string_value: benchmark },
    description: { metadataType: 'MetadataStringValue', string_value: `${benchmark} description` },
    result: { metadataType: 'MetadataDoubleValue', double_value: result },
  },
});

describe('useQualityArtifacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalogQualityArtifacts.mockReturnValue(jest.fn());
    mockUseFetchState.mockReturnValue([emptyList, false, undefined, jest.fn()]);
  });

  it('should return mapped insights when loaded', () => {
    const list: CatalogQualityArtifactList = {
      items: [makeArtifact('Benchmark 1', 0.92)],
    };
    mockUseFetchState.mockReturnValue([list, true, undefined, jest.fn()]);

    const renderResult = testHook(useQualityArtifacts)('source-1', 'model-a', 'ns-1');

    expect(renderResult).hookToStrictEqual({
      insights: [
        {
          evaluation: 'Pipeline',
          category: 'Quality',
          benchmarkName: 'Benchmark 1',
          benchmarkDescription: 'Benchmark 1 description',
          score: 0.92,
          result: '92.0%',
        },
      ],
      loaded: true,
      loadError: undefined,
    });
  });

  it('should fetch and combine all pages while preserving page size', async () => {
    const firstPage = makeArtifact('Benchmark 1', 0.92);
    const secondPage = makeArtifact('Benchmark 2', 0.81);
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce({ items: [firstPage], nextPageToken: 'page-2' })
      .mockResolvedValueOnce({ items: [secondPage], nextPageToken: '' });
    mockGetCatalogQualityArtifacts.mockReturnValue(fetchPage);

    testHook(useQualityArtifacts)('my-source', 'my-model', 'my-ns', 25);

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<CatalogQualityArtifactList>,
    ];
    const result = await fetchCallback({});

    expect(mockGetCatalogQualityArtifacts).toHaveBeenNthCalledWith(
      1,
      '',
      'my-source',
      'my-model',
      'my-ns',
      25,
      undefined,
    );
    expect(mockGetCatalogQualityArtifacts).toHaveBeenNthCalledWith(
      2,
      '',
      'my-source',
      'my-model',
      'my-ns',
      25,
      'page-2',
    );
    expect(result.items).toEqual([firstPage, secondPage]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
