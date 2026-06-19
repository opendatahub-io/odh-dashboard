import { KnownLabels } from '@odh-dashboard/k8s-core';
import type { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import {
  k8sCreateResource,
  k8sPatchResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { createPatchesFromDiff } from '@odh-dashboard/internal/api/k8sUtils';
import type {
  EnvironmentVariablesFieldData,
  RuntimeArgsFieldData,
} from '@odh-dashboard/model-serving/types/form-data';
import type { HardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { applyHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/utils';
import {
  KSERVE_AUTH_ANNOTATION,
  KSERVE_VISIBILITY_LABEL,
  KServeVisibility,
} from '@odh-dashboard/kserve/deployUtils';
import { NIMServiceModel, type NIMServiceKind } from './types';
import { NIM_SERVICE_HARDWARE_PROFILE_PATHS } from './utils';

export const createNIMService = (
  nimService: NIMServiceKind,
  opts?: K8sAPIOptions,
): Promise<NIMServiceKind> =>
  k8sCreateResource<NIMServiceKind>(
    applyK8sAPIOptions(
      {
        model: NIMServiceModel,
        resource: nimService,
      },
      opts,
    ),
  );

export const updateNIMService = (
  nimService: NIMServiceKind,
  opts?: K8sAPIOptions,
): Promise<NIMServiceKind> =>
  k8sUpdateResource<NIMServiceKind>(
    applyK8sAPIOptions(
      {
        model: NIMServiceModel,
        resource: nimService,
      },
      opts,
    ),
  );

export const patchNIMService = (
  existingNimService: NIMServiceKind,
  newNimService: NIMServiceKind,
  opts?: K8sAPIOptions,
): Promise<NIMServiceKind> => {
  const patches = createPatchesFromDiff(existingNimService, newNimService);

  if (patches.length === 0) {
    return Promise.resolve(newNimService);
  }

  return k8sPatchResource<NIMServiceKind>(
    applyK8sAPIOptions(
      {
        model: NIMServiceModel,
        queryOptions: {
          name: newNimService.metadata.name,
          ns: newNimService.metadata.namespace,
        },
        patches,
      },
      opts,
    ),
  );
};

const baseNIMService = (
  name: string,
  namespace: string,
  annotations?: Record<string, string>,
): NIMServiceKind => ({
  apiVersion: 'apps.nvidia.com/v1alpha1',
  kind: 'NIMService',
  metadata: {
    name,
    namespace,
    annotations: annotations ?? {},
  },
  spec: {
    inferencePlatform: 'kserve',
    image: {
      repository: '',
      pullPolicy: 'IfNotPresent',
    },
    expose: {
      service: {
        type: 'ClusterIP',
        port: 8000,
      },
    },
  },
});

type AssembleNIMServiceParams = {
  projectName: string;
  k8sName: string;
  displayName?: string;
  description?: string;
  replicas?: number;
  externalRoute?: boolean;
  tokenAuth?: boolean;
  runtimeArgs?: RuntimeArgsFieldData;
  environmentVariables?: EnvironmentVariablesFieldData;
  hardwareProfile: HardwareProfileConfig;
  authSecret?: string;
  pullSecrets?: string[];
};

export const assembleNIMService = (
  params: AssembleNIMServiceParams,
  existingNimService?: NIMServiceKind,
): NIMServiceKind => {
  const {
    projectName,
    k8sName,
    displayName,
    description,
    replicas = 1,
    externalRoute,
    tokenAuth,
    runtimeArgs,
    environmentVariables,
    hardwareProfile,
    authSecret,
    pullSecrets,
  } = params;

  let nimService: NIMServiceKind = existingNimService
    ? structuredClone(existingNimService)
    : baseNIMService(k8sName, projectName, {
        ...(displayName && { 'openshift.io/display-name': displayName }),
        ...(description && { 'openshift.io/description': description }),
      });

  nimService.metadata.name = k8sName;
  nimService.metadata.namespace = projectName;

  if (!nimService.metadata.annotations) {
    nimService.metadata.annotations = {};
  }
  if (displayName) {
    nimService.metadata.annotations['openshift.io/display-name'] = displayName;
  }
  if (description !== undefined) {
    nimService.metadata.annotations['openshift.io/description'] = description;
  }

  if (!nimService.metadata.labels) {
    nimService.metadata.labels = {};
  }
  nimService.metadata.labels[KnownLabels.DASHBOARD_RESOURCE] = 'true';

  nimService.spec.replicas = replicas;

  if (externalRoute) {
    nimService.spec.labels = {
      ...nimService.spec.labels,
      [KSERVE_VISIBILITY_LABEL]: KServeVisibility.Exposed,
    };
  } else if (nimService.spec.labels) {
    delete nimService.spec.labels[KSERVE_VISIBILITY_LABEL];
  }

  if (!nimService.spec.annotations) {
    nimService.spec.annotations = {};
  }
  nimService.spec.annotations[KSERVE_AUTH_ANNOTATION] = tokenAuth ? 'true' : 'false';

  if (environmentVariables?.enabled) {
    nimService.spec.env = environmentVariables.variables.map((v) => ({
      name: v.name,
      value: v.value,
    }));
  } else {
    delete nimService.spec.env;
  }

  if (runtimeArgs?.enabled && runtimeArgs.args.length > 0) {
    nimService.spec.args = runtimeArgs.args;
  } else {
    delete nimService.spec.args;
  }

  if (authSecret) {
    nimService.spec.authSecret = authSecret;
  }
  if (pullSecrets && pullSecrets.length > 0) {
    nimService.spec.image.pullSecrets = pullSecrets;
  }

  nimService = applyHardwareProfileConfig(
    nimService,
    hardwareProfile,
    NIM_SERVICE_HARDWARE_PROFILE_PATHS,
  );

  return nimService;
};
