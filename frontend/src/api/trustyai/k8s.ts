import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, TrustyAIKind } from '#~/k8sTypes';
import { TRUSTYAI_DEFINITION_NAME } from '#~/concepts/trustyai/const';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { TrustyAIApplicationsModel } from '#~/api/models/odh';
import { kindApiVersion } from '#~/concepts/k8s/utils';

export const getTrustyAICR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<TrustyAIKind> =>
  k8sGetResource<TrustyAIKind>(
    applyK8sAPIOptions(
      {
        model: TrustyAIApplicationsModel,
        queryOptions: {
          ns: namespace,
          name: TRUSTYAI_DEFINITION_NAME,
        },
      },
      opts,
    ),
  );

export const createTrustyAICR = async (
  namespace: string,
  secretName: string,
  opts?: K8sAPIOptions,
): Promise<TrustyAIKind> => {
  const resource: TrustyAIKind = {
    apiVersion: kindApiVersion(TrustyAIApplicationsModel),
    kind: TrustyAIApplicationsModel.kind,
    metadata: {
      name: TRUSTYAI_DEFINITION_NAME,
      namespace,
    },
    spec: {
      storage: {
        format: 'DATABASE',
        databaseConfigurations: secretName,
      },
      metrics: {
        schedule: '5s',
      },
    },
  };

  return k8sCreateResource<TrustyAIKind>(
    applyK8sAPIOptions(
      {
        model: TrustyAIApplicationsModel,
        resource,
      },
      opts,
    ),
  );
};

export const deleteTrustyAICR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<TrustyAIKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: TrustyAIApplicationsModel,
        queryOptions: {
          name: TRUSTYAI_DEFINITION_NAME,
          ns: namespace,
        },
      },
      opts,
    ),
  );
