import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sPatchResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { DataSciencePipelineApplicationModel } from '#~/api/models';
import {
  DSPipelineKind,
  DSPipelineManagedPipelinesKind,
  K8sAPIOptions,
  RouteKind,
  SecretKind,
} from '#~/k8sTypes';
import { getRoute } from '#~/api/k8s/routes';
import { getSecret } from '#~/api/k8s/secrets';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { DEFAULT_PIPELINE_DEFINITION_NAME } from '#~/concepts/pipelines/const';
import { ELYRA_SECRET_NAME } from '#~/concepts/pipelines/elyra/const';
import { DEV_MODE } from '#~/utilities/const';
import { kindApiVersion } from '#~/concepts/k8s/utils';

export const getElyraSecret = async (namespace: string, opts: K8sAPIOptions): Promise<SecretKind> =>
  getSecret(namespace, ELYRA_SECRET_NAME, opts);

export const getPipelineAPIRoute = async (
  namespace: string,
  name: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind> => getRoute(name, namespace, opts);

/** Debug note for investigating issues on production */
const DEV_MODE_SETTINGS: Pick<DSPipelineKind['spec'], 'mlpipelineUI'> = {
  mlpipelineUI: {
    image: 'quay.io/opendatahub/ds-pipelines-frontend:latest',
  },
};

export const createPipelinesCR = async (
  namespace: string,
  spec: DSPipelineKind['spec'],
  opts?: K8sAPIOptions,
): Promise<DSPipelineKind> => {
  const resource: DSPipelineKind = {
    apiVersion: kindApiVersion(DataSciencePipelineApplicationModel),
    kind: DataSciencePipelineApplicationModel.kind,
    metadata: {
      name: DEFAULT_PIPELINE_DEFINITION_NAME,
      namespace,
    },
    spec: {
      ...(DEV_MODE ? DEV_MODE_SETTINGS : {}),
      ...spec,
    },
  };

  return k8sCreateResource<DSPipelineKind>(
    applyK8sAPIOptions(
      {
        model: DataSciencePipelineApplicationModel,
        resource,
      },
      opts,
    ),
  );
};

export const updatePipelineCaching = (
  namespace: string,
  cacheEnabled: boolean,
  name = 'dspa',
): Promise<DSPipelineKind> =>
  k8sPatchResource<DSPipelineKind>({
    model: DataSciencePipelineApplicationModel,
    queryOptions: { name, ns: namespace },
    patches: [
      {
        op: 'replace',
        path: '/spec/apiServer/cacheEnabled',
        value: cacheEnabled,
      },
    ],
  });

export const getPipelinesCR = async (
  namespace: string,
  name: string,
  opts?: K8sAPIOptions,
): Promise<DSPipelineKind> =>
  k8sGetResource<DSPipelineKind>(
    applyK8sAPIOptions(
      {
        model: DataSciencePipelineApplicationModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const listPipelinesCR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<DSPipelineKind[]> =>
  k8sListResource<DSPipelineKind>(
    applyK8sAPIOptions(
      {
        model: DataSciencePipelineApplicationModel,
        queryOptions: { ns: namespace },
      },
      opts,
    ),
  ).then((r) => r.items);

export const deletePipelineCR = async (
  namespace: string,
  name: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<DSPipelineKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: DataSciencePipelineApplicationModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const toggleInstructLabState = (
  namespace: string,
  name: string,
  managedPipelines: DSPipelineManagedPipelinesKind,
): Promise<DSPipelineKind> =>
  k8sPatchResource<DSPipelineKind>({
    model: DataSciencePipelineApplicationModel,
    queryOptions: { name, ns: namespace },
    patches: [
      {
        op: 'replace',
        path: '/spec/apiServer/managedPipelines',
        value: managedPipelines,
      },
    ],
  });
