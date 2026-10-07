/* eslint-disable camelcase */
import { getCollections } from '~/app/api/k8s';
import {
  findReusableCollectionCopy,
  getAllTenantCollections,
  isReusableCollectionCopy,
} from '~/app/utils/collectionReuse';
import type { Collection } from '~/app/types';

jest.mock('~/app/api/k8s', () => ({
  getCollections: jest.fn(),
}));

const mockGetCollections = jest.mocked(getCollections);

const sourceCollection: Collection = {
  resource: { id: 'curated-suite', created_at: '2026-10-01T12:00:00Z' },
  name: 'Knowledge & Reasoning v1',
  category: 'knowledge',
  description: 'Knowledge and reasoning benchmark suite.',
  tags: ['curated', 'reasoning'],
  domains: ['knowledge'],
  tasks: ['question_answering'],
  modalities: ['text'],
  industries: ['general'],
  evaluation_targets: ['model'],
  curation_order: 1,
  custom: { owner: 'eval-hub' },
  pass_criteria: { threshold: 0.7 },
  benchmarks: [
    {
      id: 'mmlu',
      provider_id: 'lm-evaluation-harness',
      weight: 1,
      primary_score: { metric: 'accuracy', lower_is_better: false },
      pass_criteria: { threshold: 0.7 },
      parameters: { few_shot: 5 },
    },
  ],
};

const unchangedCopy: Collection = {
  ...sourceCollection,
  resource: { id: 'tenant-copy', created_at: '2026-10-06T12:00:00Z' },
  curation_order: undefined,
  derived_from: 'curated-suite',
};

describe('isReusableCollectionCopy', () => {
  it('should match an unchanged child with top-level lineage while ignoring resource metadata', () => {
    expect(isReusableCollectionCopy(sourceCollection, unchangedCopy)).toBe(true);
  });

  it('should support legacy nested lineage metadata', () => {
    expect(
      isReusableCollectionCopy(sourceCollection, {
        ...unchangedCopy,
        derived_from: undefined,
        state: { derived_from: 'curated-suite', run_count: 2, pinned_order: 3 },
      }),
    ).toBe(true);
  });

  it('should reject a child with a different parent', () => {
    expect(
      isReusableCollectionCopy(sourceCollection, {
        ...unchangedCopy,
        derived_from: 'another-suite',
      }),
    ).toBe(false);
  });

  it('should reject a child with customized collection metadata', () => {
    expect(
      isReusableCollectionCopy(sourceCollection, {
        ...unchangedCopy,
        description: 'Customized description',
      }),
    ).toBe(false);
  });

  it('should reject a child with customized benchmark configuration', () => {
    expect(
      isReusableCollectionCopy(sourceCollection, {
        ...unchangedCopy,
        benchmarks: [{ ...unchangedCopy.benchmarks![0], parameters: { few_shot: 0 } }],
      }),
    ).toBe(false);
  });
});

describe('getAllTenantCollections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch every tenant collection page and forward the abort signal', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...sourceCollection,
      resource: { id: `other-suite-${index}` },
      state: { derived_from: `other-parent-${index}` },
    }));
    const secondPage = [unchangedCopy];
    const firstRequest = jest.fn().mockResolvedValue({
      items: firstPage,
      total_count: 101,
    });
    const secondRequest = jest.fn().mockResolvedValue({
      items: secondPage,
      total_count: 101,
    });
    mockGetCollections.mockImplementation((_hostPath, params) =>
      params.offset === 100 ? secondRequest : firstRequest,
    );
    const { signal } = new AbortController();

    await expect(getAllTenantCollections('test-namespace', signal)).resolves.toHaveLength(101);

    expect(mockGetCollections).toHaveBeenNthCalledWith(1, '', {
      namespace: 'test-namespace',
      scope: 'tenant',
      limit: 100,
      offset: 0,
    });
    expect(mockGetCollections).toHaveBeenNthCalledWith(2, '', {
      namespace: 'test-namespace',
      scope: 'tenant',
      limit: 100,
      offset: 100,
    });
    expect(firstRequest).toHaveBeenCalledWith({ signal });
    expect(secondRequest).toHaveBeenCalledWith({ signal });
  });

  it('should fail when a page repeats before all collections are fetched', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...sourceCollection,
      resource: { id: `other-suite-${index}` },
    }));
    mockGetCollections.mockReturnValue(
      jest.fn().mockResolvedValue({ items: firstPage, total_count: 200 }),
    );

    await expect(getAllTenantCollections('test-namespace')).rejects.toThrow(
      'collection page repeated before all collections were fetched',
    );

    expect(mockGetCollections).toHaveBeenCalledTimes(2);
  });

  it('should preserve results when a repeated page has no total count', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...sourceCollection,
      resource: { id: `other-suite-${index}` },
    }));
    mockGetCollections.mockReturnValue(jest.fn().mockResolvedValue({ items: firstPage }));

    await expect(getAllTenantCollections('test-namespace')).resolves.toHaveLength(100);

    expect(mockGetCollections).toHaveBeenCalledTimes(2);
  });

  it('should fail after reaching the maximum number of pages before all collections are fetched', async () => {
    mockGetCollections.mockImplementation((_hostPath, params) =>
      jest.fn().mockResolvedValue({
        items: Array.from({ length: 100 }, (_, index) => ({
          ...sourceCollection,
          resource: { id: `other-suite-${params.offset}-${index}` },
        })),
        total_count: 10_001,
      }),
    );

    await expect(getAllTenantCollections('test-namespace')).rejects.toThrow(
      'maximum page limit reached',
    );

    expect(mockGetCollections).toHaveBeenCalledTimes(100);
  });

  it('should preserve results when the final page reaches the maximum page count', async () => {
    mockGetCollections.mockImplementation((_hostPath, params) =>
      jest.fn().mockResolvedValue({
        items: Array.from({ length: 100 }, (_, index) => ({
          ...sourceCollection,
          resource: { id: `other-suite-${params.offset}-${index}` },
        })),
        total_count: 10_000,
      }),
    );

    await expect(getAllTenantCollections('test-namespace')).resolves.toHaveLength(10_000);

    expect(mockGetCollections).toHaveBeenCalledTimes(100);
  });
});

describe('findReusableCollectionCopy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the first unchanged child from the tenant collection list', async () => {
    mockGetCollections.mockReturnValue(
      jest.fn().mockResolvedValue({ items: [sourceCollection, unchangedCopy], total_count: 2 }),
    );

    await expect(findReusableCollectionCopy(sourceCollection, 'test-namespace')).resolves.toEqual(
      unchangedCopy,
    );
  });

  it('should propagate collection lookup failures', async () => {
    mockGetCollections.mockReturnValue(jest.fn().mockRejectedValue(new Error('lookup failed')));

    await expect(findReusableCollectionCopy(sourceCollection, 'test-namespace')).rejects.toThrow(
      'lookup failed',
    );
  });
});

/* eslint-enable camelcase */
