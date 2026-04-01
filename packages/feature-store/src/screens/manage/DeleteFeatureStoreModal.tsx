import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import { FeatureStoreKind } from '../../k8sTypes';
import { deleteFeatureStore } from '../../api/featureStores';

type DeleteFeatureStoreModalProps = {
  featureStore: FeatureStoreKind;
  onClose: (deleted: boolean) => void;
};

const DeleteFeatureStoreModal: React.FC<DeleteFeatureStoreModalProps> = ({
  featureStore,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const { name: deleteName, namespace } = featureStore.metadata;

  return (
    <DeleteModal
      title={`Delete feature store "${deleteName}"?`}
      onClose={() => onClose(false)}
      submitButtonLabel="Delete feature store"
      onDelete={() => {
        setIsDeleting(true);
        deleteFeatureStore(namespace, deleteName)
          .then(() => onClose(true))
          .catch((e) => {
            setError(e instanceof Error ? e : new Error(String(e)));
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={deleteName}
    >
      The feature store <strong>{deleteName}</strong> in namespace <strong>{namespace}</strong> and
      all of its associated resources will be permanently deleted. This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteFeatureStoreModal;
