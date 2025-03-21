import * as React from 'react';
import { InferenceServiceKind } from '~/k8sTypes';
import { Connection } from '~/concepts/connectionTypes/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';

export const useInferenceServicesForConnection = (
  connection: Connection,
): InferenceServiceKind[] => {
  const {
    inferenceServices: { data: inferenceServices },
  } = React.useContext(ProjectDetailsContext);
  const connectionName = connection.metadata.name;

  return inferenceServices.filter(
    (inferenceService) =>
      inferenceService.spec.predictor.model?.storage?.key === connectionName ||
      inferenceService.spec.predictor.imagePullSecrets?.[0].name === connectionName,
  );
};
