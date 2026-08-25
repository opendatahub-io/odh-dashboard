import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { useHostApi } from '@odh-dashboard/plugin-core/host-api';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';

type ModelMetricsPathWrapperProps = {
  children: (inferenceService: InferenceServiceKind, projectName: string) => React.ReactNode;
};

const ModelMetricsPathWrapper: React.FC<ModelMetricsPathWrapperProps> = ({ children }) => {
  const { namespace: projectName, inferenceService: modelName } = useParams<{
    namespace: string;
    inferenceService: string;
  }>();
  const { contexts } = useHostApi();
  const {
    inferenceServices: {
      data: { items: models },
      loaded,
    },
  } = React.useContext(contexts.ModelServingContext);
  const inferenceService = models.find(
    (model: InferenceServiceKind) =>
      model.metadata.name === modelName && model.metadata.namespace === projectName,
  );
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }
  if (!inferenceService || !projectName) {
    return <NotFound />;
  }

  return <>{children(inferenceService, projectName)}</>;
};

export default ModelMetricsPathWrapper;
