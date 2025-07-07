import React from 'react';
import useInferenceServices from '@odh-dashboard/internal/pages/modelServing/useInferenceServices';
import useServingRuntimes from '@odh-dashboard/internal/pages/modelServing/useServingRuntimes';
import { ModelVersion } from '@odh-dashboard/internal/concepts/modelRegistry/types';
import ModelVersionRegisteredDeploymentsView from '@odh-dashboard/internal/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionRegisteredDeploymentsView';

const ModelVersionRegisteredViewWrapper: React.FC<{ mv: ModelVersion; refresh: () => void }> = ({
  mv,
  refresh,
}) => {
  const inferenceServices = useInferenceServices(mv.id);
  const servingRuntimes = useServingRuntimes(mv.id);

  return (
    <ModelVersionRegisteredDeploymentsView
      inferenceServices={inferenceServices}
      servingRuntimes={servingRuntimes}
      refresh={refresh}
    />
  );
};

export default ModelVersionRegisteredViewWrapper;
