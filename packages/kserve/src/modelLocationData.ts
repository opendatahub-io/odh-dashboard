import {
  getPVCNameFromURI,
  isPVCUri,
} from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';
import { MetadataAnnotation, InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import { ModelServingCompatibleTypes } from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import {
  ModelLocationData,
  ModelLocationType,
} from '../../model-serving/src/components/deploymentWizard/fields/modelLocationFields/types';

export const getModelLocationUri = (deployment: InferenceServiceKind): string | undefined => {
  return deployment.spec.predictor.model?.storageUri;
};

const extractAdditionalFields = (deployment: InferenceServiceKind): Record<string, string> => {
  const additionalFields: Record<string, string> = {};
  const { predictor } = deployment.spec;
  const connectionType = predictor.model?.storage?.key
    ? ModelServingCompatibleTypes.S3ObjectStorage
    : predictor.imagePullSecrets?.length
    ? ModelServingCompatibleTypes.OCI
    : predictor.model?.storageUri && !isPVCUri(predictor.model.storageUri)
    ? ModelServingCompatibleTypes.URI
    : undefined;

  if (connectionType === ModelServingCompatibleTypes.S3ObjectStorage) {
    additionalFields.modelPath = predictor.model?.storage?.path || '';
  }

  if (connectionType === ModelServingCompatibleTypes.OCI) {
    additionalFields.modelUri = predictor.model?.storageUri || '';
  }

  return additionalFields;
};

export const extractKServeModelLocationData = (deployment: {
  model: InferenceServiceKind;
}): ModelLocationData => {
  const uri = getModelLocationUri(deployment.model);
  if (uri && isPVCUri(uri)) {
    return {
      type: ModelLocationType.PVC,
      fieldValues: { URI: uri },
      additionalFields: {
        pvcConnection: getPVCNameFromURI(uri),
      },
    };
  }

  const connectionName =
    deployment.model.metadata.annotations?.[MetadataAnnotation.ConnectionName] ||
    deployment.model.spec.predictor.model?.storage?.key ||
    deployment.model.spec.predictor.imagePullSecrets?.[0]?.name;

  const additionalFields = extractAdditionalFields(deployment.model);

  if (connectionName) {
    return {
      type: ModelLocationType.EXISTING,
      connection: connectionName,
      fieldValues: {},
      additionalFields,
    };
  }

  return {
    type: ModelLocationType.NEW,
    fieldValues: { URI: uri },
    additionalFields,
  };
};
