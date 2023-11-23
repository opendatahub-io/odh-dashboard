import * as React from 'react';
import { BiasMetricType } from '~/api';
import { ExplainabilityContext } from '~/concepts/explainability/ExplainabilityContext';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import useBiasChartsBrowserStorage from '~/pages/modelServing/screens/metrics/bias/useBiasChartsBrowserStorage';
import { byNotId } from '~/pages/modelServing/screens/metrics/utils';

type DeleteBiasConfigurationModalProps = {
  configurationToDelete?: BiasMetricConfig;
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
  } = React.useContext(ExplainabilityContext);

  const [selectedBiasConfigCharts, setSelectedBiasConfigCharts] = useBiasChartsBrowserStorage();

  const deselectDeleted = (biasConfigId: string) => {
    setSelectedBiasConfigCharts(selectedBiasConfigCharts.filter(byNotId(biasConfigId)));
  };

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setDeleting(false);
    setError(undefined);
  };

  const displayName = configurationToDelete ? configurationToDelete.name : 'this bias metric';
  return (
    <DeleteModal
      title="Delete bias metric?"
      isOpen={!!configurationToDelete}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete bias metric"
      onDelete={() => {
        if (configurationToDelete) {
          setDeleting(true);
          const deleteFunc =
            configurationToDelete.metricType === BiasMetricType.DIR
              ? api.deleteDirRequest
              : api.deleteSpdRequest;
          deleteFunc({}, configurationToDelete.id)
            .then(() => onBeforeClose(true))
            .then(() => deselectDeleted(configurationToDelete.id))
            .catch((e) => {
              setError(e);
              setDeleting(false);
            });
        }
      }}
      deleting={isDeleting}
      error={error}
      deleteName={displayName}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteBiasConfigurationModal;
