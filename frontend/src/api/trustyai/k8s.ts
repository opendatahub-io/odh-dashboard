import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, TrustyAIKind } from '~/k8sTypes';
import { TRUSTYAI_DEFINITION_NAME } from '~/concepts/trustyai/const';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { TrustyAIApplicationsModel } from '~/api/models/trustyai';

const trustyAIDefaultCRSpec: TrustyAIKind['spec'] = {
  storage: {
    format: 'PVC',
    folder: '/inputs',
    size: '1Gi',
  },
  data: {
    filename: 'data.csv',
    format: 'CSV',
  },
  metrics: {
    schedule: '5s',
  },
};

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
  opts?: K8sAPIOptions,
): Promise<TrustyAIKind> => {
  const resource: TrustyAIKind = {
    apiVersion: `${TrustyAIApplicationsModel.apiGroup}/${TrustyAIApplicationsModel.apiVersion}`,
    kind: TrustyAIApplicationsModel.kind,
    metadata: {
      name: TRUSTYAI_DEFINITION_NAME,
      namespace,
    },
    spec: trustyAIDefaultCRSpec,
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
