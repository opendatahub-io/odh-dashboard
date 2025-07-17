import * as React from 'react';
import { InferenceServiceKind } from '#~/k8sTypes';
import { Connection } from '#~/concepts/connectionTypes/types';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';

export const useInferenceServicesForConnection = (
  connection?: Connection,
): InferenceServiceKind[] => {
  const {
    inferenceServices: {
      data: { items: inferenceServices },
    },
  } = React.useContext(ProjectDetailsContext);
  const connectionName = connection?.metadata.name;
  if (!connection) {
    return [];
  }

  return inferenceServices.filter(
    (inferenceService) =>
      // Known issue: this only works for OCI and S3 connections
      inferenceService.spec.predictor.model?.storage?.key === connectionName ||
      inferenceService.spec.predictor.imagePullSecrets?.[0].name === connectionName,
  );
};
