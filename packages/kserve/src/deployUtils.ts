import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import {
  assembleSecretSA,
  createSecret,
  deleteSecret,
  replaceSecret,
} from '@odh-dashboard/internal/api/k8s/secrets';
import {
  assembleServiceAccount,
  createServiceAccount,
  getServiceAccount,
} from '@odh-dashboard/internal/api/k8s/serviceAccounts';
import {
  generateRoleInferenceService,
  getRole,
  createRole,
} from '@odh-dashboard/internal/api/k8s/roles';
import {
  generateRoleBindingServiceAccount,
  getRoleBinding,
  createRoleBinding,
} from '@odh-dashboard/internal/api/k8s/roleBindings';
import { addOwnerReference } from '@odh-dashboard/internal/api/k8sUtils';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import {
  SecretKind,
  K8sAPIOptions,
  RoleBindingKind,
  InferenceServiceKind,
  ServiceAccountKind,
  RoleKind,
  SupportedModelFormats,
  MetadataAnnotation,
  KnownLabels,
} from '@odh-dashboard/internal/k8sTypes';
import { getTokenNames } from '@odh-dashboard/internal/pages/modelServing/utils';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { ModelLocationData } from '@odh-dashboard/model-serving/types/form-data';
import type { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { ModelAvailabilityFieldsData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelAvailabilityFields';
import type { RuntimeArgsFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/RuntimeArgsField';
import type { EnvironmentVariablesFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/EnvironmentVariablesField';
import { CreateConnectionData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/CreateConnectionInputFields';
import type { CreatingInferenceServiceObject } from './deployModel';

const is404 = (error: unknown): boolean => {
  return getGenericErrorCode(error) === 404;
};

export const getModelServiceAccountName = (name: string): string => `${name}-sa`;

export const getModelRole = (name: string): string => `${name}-view-role`;
export const getModelRoleBinding = (name: string): string => `${name}-view`;

export const createServiceAccountIfMissing = async (
  serviceAccount: ServiceAccountKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<ServiceAccountKind> =>
  getServiceAccount(serviceAccount.metadata.name, namespace).catch((e: unknown) => {
    if (is404(e)) {
      return createServiceAccount(serviceAccount, opts);
    }
    return Promise.reject(e);
  });

export const createRoleIfMissing = async (
  role: RoleKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RoleKind> =>
  getRole(namespace, role.metadata.name).catch((e: unknown) => {
    if (is404(e)) {
      return createRole(role, opts);
    }
    return Promise.reject(e);
  });

export const createRoleBindingIfMissing = async (
  rolebinding: RoleBindingKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RoleBindingKind> =>
  getRoleBinding(namespace, rolebinding.metadata.name).catch((e: unknown) => {
    if (is404(e)) {
      return createRoleBinding(rolebinding, opts).catch((error: unknown) => {
        if (is404(error) && opts?.dryRun) {
          // If dryRun is enabled and the user is not Cluster Admin it seems that there's a k8s error
          // that raises a 404 trying to find the role, which is missing since it's a dryRun.
          return Promise.resolve(rolebinding);
        }
        return Promise.reject(error);
      });
    }
    return Promise.reject(e);
  });

export const createSecrets = async (
  fillData: CreatingInferenceServiceObject,
  deployedModelName: string,
  namespace: string,
  owner: InferenceServiceKind,
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName } = getTokenNames(deployedModelName, namespace);
  const deletedSecrets =
    existingSecrets
      ?.map((secret) => secret.metadata.name)
      .filter(
        (token: string) => !fillData.tokenAuth?.some((tokenEdit) => tokenEdit.k8sName === token),
      ) || [];
  const tokensToProcess = fillData.tokenAuth || [];

  await Promise.all<K8sStatus | SecretKind>([
    ...tokensToProcess.map((token) => {
      const secretToken = addOwnerReference(
        assembleSecretSA(token.displayName, serviceAccountName, namespace, token.k8sName),
        owner,
      );
      if (token.k8sName) {
        return replaceSecret(secretToken, opts);
      }
      return createSecret(secretToken, opts);
    }),
    ...deletedSecrets.map((secret) => deleteSecret(namespace, secret, opts)),
  ]);
};

export const setUpTokenAuth = async (
  fillData: CreatingInferenceServiceObject,
  deployedModelName: string,
  namespace: string,
  createTokenAuth: boolean,
  owner: InferenceServiceKind,
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName, roleName, roleBindingName } = getTokenNames(
    deployedModelName,
    namespace,
  );

  const serviceAccount = addOwnerReference(
    assembleServiceAccount(serviceAccountName, namespace),
    owner,
  );

  // For KServe, we need the inferenceservice view role
  const role = addOwnerReference(
    generateRoleInferenceService(roleName, deployedModelName, namespace),
    owner,
  );

  const roleBinding = addOwnerReference(
    generateRoleBindingServiceAccount(
      roleBindingName,
      serviceAccountName,
      {
        kind: 'Role',
        name: roleName,
      },
      namespace,
    ),
    owner,
  );

  return (
    createTokenAuth
      ? Promise.all([
          createServiceAccountIfMissing(serviceAccount, namespace, opts),
          createRoleIfMissing(role, namespace, opts),
        ]).then(() => createRoleBindingIfMissing(roleBinding, namespace, opts))
      : Promise.resolve()
  )
    .then(() => createSecrets(fillData, deployedModelName, namespace, owner, existingSecrets, opts))
    .catch((error) => Promise.reject(error));
};

export const applyAuth = (
  inferenceService: InferenceServiceKind,
  tokenAuth: boolean,
  externalRoute: boolean,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
    'security.opendatahub.io/enable-auth': tokenAuth ? 'true' : 'false',
  };

  result.metadata.labels = {
    ...result.metadata.labels,
    ...(externalRoute && { 'networking.kserve.io/visibility': 'exposed' }),
  };

  if (!externalRoute) {
    delete result.metadata.labels['networking.kserve.io/visibility'];
  }

  return result;
};

export const applyAiAvailableAssetAnnotations = (
  inferenceService: InferenceServiceKind,
  aiAvailableAsset: ModelAvailabilityFieldsData,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.metadata.labels = {
    ...result.metadata.labels,
    'opendatahub.io/genai-asset': aiAvailableAsset.saveAsAiAsset ? 'true' : 'false',
  };
  if (!aiAvailableAsset.saveAsAiAsset) {
    delete result.metadata.labels['opendatahub.io/genai-asset'];
  }

  result.metadata.annotations = {
    ...result.metadata.annotations,
    ...(aiAvailableAsset.saveAsAiAsset &&
      aiAvailableAsset.useCase && {
        'opendatahub.io/genai-use-case': aiAvailableAsset.useCase,
      }),
  };
  if (!aiAvailableAsset.saveAsAiAsset || !aiAvailableAsset.useCase) {
    delete result.metadata.annotations['opendatahub.io/genai-use-case'];
  }
  return result;
};

export const applyRuntimeArgs = (
  inferenceService: InferenceServiceKind,
  runtimeArgs: RuntimeArgsFieldData,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.spec.predictor.model = {
    ...result.spec.predictor.model,
    ...(runtimeArgs.enabled && { args: runtimeArgs.args }),
  };

  if (!runtimeArgs.enabled) {
    delete result.spec.predictor.model.args;
  }

  return result;
};

export const applyEnvironmentVariables = (
  inferenceService: InferenceServiceKind,
  environmentVariables: EnvironmentVariablesFieldData,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.spec.predictor.model = {
    ...result.spec.predictor.model,
    ...(environmentVariables.enabled && {
      env: environmentVariables.variables.map((envVar) => ({
        name: envVar.name,
        value: envVar.value,
      })),
    }),
  };

  if (!environmentVariables.enabled) {
    delete result.spec.predictor.model.env;
  }

  return result;
};

export const applyModelFormat = (
  inferenceService: InferenceServiceKind,
  modelFormat?: SupportedModelFormats,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.spec.predictor.model = {
    ...result.spec.predictor.model,
    modelFormat: {
      name: modelFormat?.name ?? 'vLLM',
      version: modelFormat?.version,
    },
  };
  return result;
};

export const applyConnectionData = (
  inferenceService: InferenceServiceKind,
  createConnectionData: CreateConnectionData,
  modelLocationData: ModelLocationData,
  dryRun?: boolean,
  secretName?: string,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  if (createConnectionData.nameDesc?.name) {
    result.metadata.annotations = {
      ...result.metadata.annotations,
    };
    // Apply connection name to the annotations
    if (!dryRun) {
      result.metadata.annotations[MetadataAnnotation.ConnectionName] =
        secretName ?? createConnectionData.nameDesc.name;
    }
    // Apply connection path to the annotations if the connection type is S3ObjectStorage
    if (
      modelLocationData.additionalFields.modelPath &&
      isModelServingCompatible(
        modelLocationData.connectionTypeObject ?? [],
        ModelServingCompatibleTypes.S3ObjectStorage,
      )
    ) {
      result.metadata.annotations = {
        ...result.metadata.annotations,
        'opendatahub.io/connection-path': modelLocationData.additionalFields.modelPath,
      };
    } else {
      // Delete connection path from the annotations if it's not present or the connection type is not S3ObjectStorage
      delete result.metadata.annotations['opendatahub.io/connection-path'];
    }
  }
  if (
    modelLocationData.additionalFields.modelUri &&
    isModelServingCompatible(
      modelLocationData.connectionTypeObject ?? [],
      ModelServingCompatibleTypes.OCI,
    )
  ) {
    result.spec.predictor.model = {
      ...result.spec.predictor.model,
      storageUri: modelLocationData.additionalFields.modelUri,
    };
  }
  return result;
};

export const applyDisplayNameDesc = (
  inferenceService: InferenceServiceKind,
  name: string,
  description: string,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
    'openshift.io/display-name': name,
    'openshift.io/description': description,
  };

  return result;
};

export const applyDashboardResourceLabel = (
  inferenceService: InferenceServiceKind,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.metadata.labels = {
    ...result.metadata.labels,
    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
  };
  return result;
};

export const applyModelType = (
  inferenceService: InferenceServiceKind,
  modelType: ServingRuntimeModelType,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
    'opendatahub.io/model-type': modelType,
  };
  return result;
};
