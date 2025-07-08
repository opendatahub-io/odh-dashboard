import React from 'react';
import useInferenceServices from '@odh-dashboard/internal/pages/modelServing/useInferenceServices';
import useServingRuntimes from '@odh-dashboard/internal/pages/modelServing/useServingRuntimes';
import { ModelVersion } from '@odh-dashboard/internal/concepts/modelRegistry/types';
import ModelVersionRegisteredDeploymentsView from '@odh-dashboard/internal/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionRegisteredDeploymentsView';

const ModelVersionRegisteredViewWrapper: React.FC<{
  mv: ModelVersion;
  mrName?: string;
  refresh: () => void;
}> = ({ mv, mrName, refresh }) => {
  const inferenceServices = useInferenceServices(undefined, mv.registeredModelId, mv.id, mrName);
  const servingRuntimes = useServingRuntimes();

  return (
    <ModelVersionRegisteredDeploymentsView
      inferenceServices={inferenceServices}
      servingRuntimes={servingRuntimes}
      refresh={refresh}
    />
  );
};

export default ModelVersionRegisteredViewWrapper;
