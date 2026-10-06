import * as React from 'react';
import { useCollectionsContext } from '~/app/context/CollectionsContext';
import { cloneCollection } from '~/app/api/k8s';
import { useDeleteCollectionMutation } from '~/app/hooks/collections';
import { useNotification } from '~/app/hooks/useNotification';
import type { Collection } from '~/app/types';
import StartEvaluationRunModal from './StartEvaluationRunModal';

const CURATED_SUITE_RUN_DESCRIPTION =
  'This benchmark suite will be copied to your project as-is before the evaluation starts.';

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
    async (signal?: AbortSignal): Promise<Collection | undefined> => {
      if (!namespace || signal?.aborted) {
        return undefined;
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
        return copiedCollection;
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
    [collection.resource.id, namespace, notification, refreshCollections],
  );

  const handleRunFailure = React.useCallback(
    async (_error: unknown, copiedCollection?: Collection) => {
      if (
        !namespace ||
        !copiedCollection ||
        copiedCollection.resource.id === collection.resource.id
      ) {
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
    [collection.resource.id, deleteCollection, namespace],
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
