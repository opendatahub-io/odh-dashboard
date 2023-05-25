import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import NotFound from '~/pages/NotFound';
import { InferenceServiceKind } from '~/k8sTypes';

type InferenceMetricsPathWrapperProps = {
  children: (inferenceService: InferenceServiceKind, projectName: string) => React.ReactNode;
};

const InferenceMetricsPathWrapper: React.FC<InferenceMetricsPathWrapperProps> = ({ children }) => {
  const { project: projectName, inferenceService: modelName } = useParams<{
    project: string;
    inferenceService: string;
  }>();
  const {
    inferenceServices: { data: models, loaded },
  } = React.useContext(ModelServingContext);
  const inferenceService = models.find(
    (model) => model.metadata.name === modelName && model.metadata.namespace === projectName,
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

export default InferenceMetricsPathWrapper;
