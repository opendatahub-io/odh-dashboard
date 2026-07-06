import * as React from 'react';
import { BiasMetricType } from '#~/api';
import { TrustyAIContext } from '#~/concepts/trustyai/context/TrustyAIContext';
import { BiasMetricConfig } from '#~/concepts/trustyai/types';
import DeleteModal from '#~/pages/projects/components/DeleteModal';

type DeleteBiasConfigurationModalProps = {
  configurationToDelete: BiasMetricConfig;
  onClose: (deleted: boolean) => void;
};

const DeleteBiasConfigurationModal: React.FC<DeleteBiasConfigurationModalProps> = ({
  onClose,
  configurationToDelete,
}) => {
  const [isDeleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const {
    apiState: { api },
  } = React.useContext(TrustyAIContext);

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setDeleting(false);
    setError(undefined);
  };

  return (
    <DeleteModal
      title="Delete bias metric?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete bias metric"
      onDelete={() => {
        setDeleting(true);
        const deleteFunc =
          configurationToDelete.metricType === BiasMetricType.DIR
            ? api.deleteDirRequest
            : api.deleteSpdRequest;
        deleteFunc({}, configurationToDelete.id)
          .then(() => onBeforeClose(true))
          .catch((e) => {
            setError(e);
            setDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={configurationToDelete.name}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteBiasConfigurationModal;
