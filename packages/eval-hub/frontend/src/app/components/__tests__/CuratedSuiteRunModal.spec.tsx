/* eslint-disable camelcase */
import * as React from 'react';
import { act, render } from '@testing-library/react';
import { cloneCollection } from '~/app/api/k8s';
import { useCollectionsContext } from '~/app/context/CollectionsContext';
import { useDeleteCollectionMutation } from '~/app/hooks/collections';
import { useNotification } from '~/app/hooks/useNotification';
import { findReusableCollectionCopy } from '~/app/utils/collectionReuse';
import type { Collection, CollectionResolution } from '~/app/types';
import CuratedSuiteRunModal from '~/app/components/CuratedSuiteRunModal';

const mockStartEvaluationRunModal = jest.fn();
const mockCloneCollection = jest.mocked(cloneCollection);
const mockFindReusableCollectionCopy = jest.mocked(findReusableCollectionCopy);
const mockUseCollectionsContext = jest.mocked(useCollectionsContext);
const mockUseDeleteCollectionMutation = jest.mocked(useDeleteCollectionMutation);
const mockUseNotification = jest.mocked(useNotification);

jest.mock('~/app/api/k8s', () => ({
  cloneCollection: jest.fn(),
}));

jest.mock('~/app/context/CollectionsContext', () => ({
  useCollectionsContext: jest.fn(),
}));

jest.mock('~/app/hooks/collections', () => ({
  useDeleteCollectionMutation: jest.fn(),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(),
}));

jest.mock('~/app/utils/collectionReuse', () => ({
  findReusableCollectionCopy: jest.fn(),
}));

jest.mock('~/app/components/StartEvaluationRunModal', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<typeof import('../StartEvaluationRunModal').default>) => {
    mockStartEvaluationRunModal(props);
    return <div data-testid="start-evaluation-run-modal" />;
  },
}));

const sourceCollection: Collection = {
  resource: { id: 'curated-suite' },
  name: 'Curated suite',
  benchmarks: [{ id: 'benchmark-a', provider_id: 'provider-a' }],
};

const copiedCollection: Collection = {
  ...sourceCollection,
  resource: { id: 'copied-suite' },
  name: 'Copied suite',
};

const renderModal = () => {
  const onClose = jest.fn();
  const onSuccess = jest.fn();

  render(
    <CuratedSuiteRunModal
      isOpen
      onClose={onClose}
      namespace="test-namespace"
      collection={sourceCollection}
      trackingSource="curated_gallery"
      onSuccess={onSuccess}
    />,
  );

  return { onClose, onSuccess };
};

const getRunModalProps = () =>
  mockStartEvaluationRunModal.mock.calls.at(-1)?.[0] as React.ComponentProps<
    typeof import('../StartEvaluationRunModal').default
  >;

describe('CuratedSuiteRunModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const refreshCollections = jest.fn();
    mockUseCollectionsContext.mockReturnValue({
      response: { items: [], total_count: 0 },
      loaded: true,
      loadError: undefined,
      refresh: refreshCollections,
    });
    mockUseNotification.mockReturnValue({
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      remove: jest.fn(),
    });
    mockUseDeleteCollectionMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      error: null,
      reset: jest.fn(),
    } as unknown as ReturnType<typeof useDeleteCollectionMutation>);
    mockFindReusableCollectionCopy.mockResolvedValue(undefined);
    mockCloneCollection.mockReturnValue(jest.fn().mockResolvedValue(copiedCollection));
  });

  it('configures the run modal with curated-suite resolution and a user-facing description', () => {
    renderModal();

    const props = getRunModalProps();
    expect(props.description).toContain('An unchanged copy of this benchmark suite');
    expect(props.resolveCollection).toEqual(expect.any(Function));
    expect(props.onRunFailure).toEqual(expect.any(Function));
    expect(props.modalId).toBe('curated-suite-start-evaluation-run-modal');
  });

  it('reuses an unchanged collection without cloning', async () => {
    mockFindReusableCollectionCopy.mockResolvedValue(copiedCollection);
    renderModal();

    const resolution = await getRunModalProps().resolveCollection?.();

    expect(resolution).toEqual<CollectionResolution>({
      collection: copiedCollection,
      wasCreated: false,
    });
    expect(mockCloneCollection).not.toHaveBeenCalled();
  });

  it('clones when no reusable collection exists and refreshes collections', async () => {
    const refreshCollections = jest.fn();
    mockUseCollectionsContext.mockReturnValue({
      response: { items: [], total_count: 0 },
      loaded: true,
      loadError: undefined,
      refresh: refreshCollections,
    });
    renderModal();

    const resolution = await getRunModalProps().resolveCollection?.();

    expect(mockCloneCollection).toHaveBeenCalledWith('', 'test-namespace', 'curated-suite', {});
    expect(resolution).toEqual<CollectionResolution>({
      collection: copiedCollection,
      wasCreated: true,
    });
    expect(refreshCollections).toHaveBeenCalledTimes(1);
  });

  it('reports clone failures and does not start a run with an incomplete resolution', async () => {
    const cloneError = new Error('clone failed');
    mockCloneCollection.mockReturnValue(jest.fn().mockRejectedValue(cloneError));
    const notification = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      remove: jest.fn(),
    };
    mockUseNotification.mockReturnValue(notification);
    renderModal();

    await expect(getRunModalProps().resolveCollection?.()).resolves.toBeUndefined();
    expect(notification.error).toHaveBeenCalledWith('Failed to copy suite', 'clone failed');
  });

  it('reports lookup failures without attempting to clone', async () => {
    const lookupError = new Error('lookup failed');
    mockFindReusableCollectionCopy.mockRejectedValue(lookupError);
    const notification = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      remove: jest.fn(),
    };
    mockUseNotification.mockReturnValue(notification);
    renderModal();

    await expect(getRunModalProps().resolveCollection?.()).rejects.toThrow('lookup failed');
    expect(notification.error).toHaveBeenCalledWith(
      'Failed to find existing suite copy',
      'lookup failed',
    );
    expect(mockCloneCollection).not.toHaveBeenCalled();
  });

  it('deletes only newly created copies after a run failure', async () => {
    const deleteCollection = jest.fn().mockResolvedValue(undefined);
    mockUseDeleteCollectionMutation.mockReturnValue({
      mutateAsync: deleteCollection,
      isPending: false,
      error: null,
      reset: jest.fn(),
    } as unknown as ReturnType<typeof useDeleteCollectionMutation>);
    renderModal();

    const onRunFailure = getRunModalProps().onRunFailure as (
      error: unknown,
      collection?: Collection,
      collectionWasCreated?: boolean,
    ) => unknown;

    await act(async () => {
      await onRunFailure(new Error('run failed'), copiedCollection, true);
      await onRunFailure(new Error('run failed'), copiedCollection, false);
    });

    expect(deleteCollection).toHaveBeenCalledTimes(1);
    expect(deleteCollection).toHaveBeenCalledWith('copied-suite');
  });

  it('returns cleanup errors so the caller can report that the copy was retained', async () => {
    const cleanupError = new Error('delete failed');
    mockUseDeleteCollectionMutation.mockReturnValue({
      mutateAsync: jest.fn().mockRejectedValue(cleanupError),
      isPending: false,
      error: null,
      reset: jest.fn(),
    } as unknown as ReturnType<typeof useDeleteCollectionMutation>);
    renderModal();

    const onRunFailure = getRunModalProps().onRunFailure as (
      error: unknown,
      collection?: Collection,
      collectionWasCreated?: boolean,
    ) => unknown;
    const result = await onRunFailure(new Error('run failed'), copiedCollection, true);

    expect(result).toEqual(
      new Error('The copied suite "Copied suite" could not be removed. delete failed'),
    );
  });
});

/* eslint-enable camelcase */
