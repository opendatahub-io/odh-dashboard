import * as React from 'react';
import { InferenceServiceKind, MetadataAnnotation, PersistentVolumeClaimKind } from '#~/k8sTypes';
import { Connection } from '#~/concepts/connectionTypes/types';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { getPVCNameFromURI } from '#~/pages/modelServing/screens/projects/utils';

const isConnectionWithUri = (
  conn: Connection | PersistentVolumeClaimKind,
): conn is Connection & { data: { URI: string } } => {
  const { annotations } = conn.metadata;
  return (
    !!annotations &&
    ('opendatahub.io/connection-type' in annotations ||
      'opendatahub.io/connection-type-ref' in annotations) &&
    'data' in conn &&
    conn.data != null &&
    typeof conn.data === 'object' &&
    'URI' in conn.data &&
    typeof conn.data.URI === 'string'
  );
};

const getDecodedConnectionUri = (
  connection: Connection | PersistentVolumeClaimKind,
): string | undefined => {
  if (!isConnectionWithUri(connection)) {
    return undefined;
  }
  try {
    return atob(connection.data.URI);
  } catch {
    return undefined;
  }
};

export const useInferenceServicesForConnection = (
  connection?: Connection | PersistentVolumeClaimKind,
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

  const connectionUri = getDecodedConnectionUri(connection);

  return inferenceServices.filter((inferenceService) => {
    const storageUri = inferenceService.spec.predictor.model?.storageUri;
    return (
      inferenceService.metadata.annotations?.[MetadataAnnotation.ConnectionName] ===
        connectionName ||
      inferenceService.spec.predictor.model?.storage?.key === connectionName ||
      inferenceService.spec.predictor.imagePullSecrets?.[0]?.name === connectionName ||
      getPVCNameFromURI(storageUri ?? '') === connection.metadata.name ||
      (connectionUri != null && storageUri === connectionUri)
    );
  });
};
