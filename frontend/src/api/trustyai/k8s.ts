import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, K8sStatus, RouteKind, TrustyAIKind } from '~/k8sTypes';
import { getRoute } from '~/api';
import { TRUSTYAI_DEFINITION_NAME, TRUSTYAI_ROUTE_NAME } from '~/concepts/explainability/const';
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

export const getTrustyAIAPIRoute = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind> => getRoute(TRUSTYAI_ROUTE_NAME, namespace, opts);

export const getTrustyAICR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<TrustyAIKind> =>
  k8sGetResource<TrustyAIKind>(
    applyK8sAPIOptions(opts, {
      model: TrustyAIApplicationsModel,
      queryOptions: {
        ns: namespace,
        name: TRUSTYAI_DEFINITION_NAME,
      },
    }),
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
    applyK8sAPIOptions(opts, {
      model: TrustyAIApplicationsModel,
      resource,
    }),
  );
};

export const deleteTrustyAICR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<TrustyAIKind, K8sStatus>(
    applyK8sAPIOptions(opts, {
      model: TrustyAIApplicationsModel,
      queryOptions: {
        name: TRUSTYAI_DEFINITION_NAME,
        ns: namespace,
      },
    }),
  );
