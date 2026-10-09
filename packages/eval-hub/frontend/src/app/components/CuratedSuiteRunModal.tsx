import * as React from 'react';
import { useCollectionsContext } from '~/app/context/CollectionsContext';
import { cloneCollection } from '~/app/api/k8s';
import { useDeleteCollectionMutation } from '~/app/hooks/collections';
import { useNotification } from '~/app/hooks/useNotification';
import { findReusableCollectionCopy } from '~/app/utils/collectionReuse';
import type { Collection, CollectionResolution } from '~/app/types';
import StartEvaluationRunModal from './StartEvaluationRunModal';

const CURATED_SUITE_RUN_DESCRIPTION =
  'An unchanged copy of this benchmark suite will be reused if one already exists in your project; otherwise, it will be copied before the evaluation starts.';

type CuratedSuiteRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
  namespace: string | undefined;
  collection: Collection;
  trackingSource: string;
  onSuccess: () => void;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const CuratedSuiteRunModal: React.FC<CuratedSuiteRunModalProps> = ({
  isOpen,
  onClose,
  namespace,
  collection,
  trackingSource,
  onSuccess,
}) => {
  const notification = useNotification();
  const { refresh: refreshCollections } = useCollectionsContext();
  const { mutateAsync: deleteCollection } = useDeleteCollectionMutation(namespace ?? '');

  const resolveCollection = React.useCallback(
    async (signal?: AbortSignal): Promise<CollectionResolution | undefined> => {
      if (!namespace || signal?.aborted) {
        return undefined;
      }

      let reusableCollection: Collection | undefined;
      try {
        reusableCollection = await findReusableCollectionCopy(collection, namespace, signal);
      } catch (error) {
        if (!signal?.aborted) {
          notification.error(
            'Failed to find existing suite copy',
            getErrorMessage(error, 'Unable to check for an existing suite copy.'),
          );
        }
        throw error;
      }

      if (signal?.aborted) {
        return undefined;
      }

      if (reusableCollection) {
        return { collection: reusableCollection, wasCreated: false };
      }

      try {
        const copiedCollection = await cloneCollection(
          '',
          namespace,
          collection.resource.id,
          {},
        )({ signal });

        if (signal?.aborted) {
          return undefined;
        }

        refreshCollections();
        return { collection: copiedCollection, wasCreated: true };
      } catch (error) {
        if (!signal?.aborted) {
          notification.error(
            'Failed to copy suite',
            getErrorMessage(error, 'Unable to copy suite.'),
          );
        }
        return undefined;
      }
    },
    [collection, namespace, notification, refreshCollections],
  );

  const handleRunFailure = React.useCallback(
    async (_error: unknown, copiedCollection?: Collection, wasCreated = false) => {
      if (!namespace || !copiedCollection || !wasCreated) {
        return;
      }

      try {
        await deleteCollection(copiedCollection.resource.id);
      } catch (cleanupError) {
        return new Error(
          `The copied suite "${copiedCollection.name}" could not be removed. ${getErrorMessage(
            cleanupError,
            'Please remove it from your benchmark suites.',
          )}`,
        );
      }
      return undefined;
    },
    [deleteCollection, namespace],
  );

  return (
    <StartEvaluationRunModal
      isOpen={isOpen}
      onClose={onClose}
      namespace={namespace}
      collection={collection}
      isCollectionFlow
      description={CURATED_SUITE_RUN_DESCRIPTION}
      modalId="curated-suite-start-evaluation-run-modal"
      resolveCollection={resolveCollection}
      trackingSource={trackingSource}
      onRunFailure={handleRunFailure}
      onSuccess={onSuccess}
    />
  );
};

export default CuratedSuiteRunModal;
