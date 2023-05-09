import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { DataSciencePipelineApplicationModel } from '~/api/models';
import { DSPipelineKind, K8sAPIOptions, K8sStatus, RouteKind, SecretKind } from '~/k8sTypes';
import { getRoute } from '~/api/k8s/routes';
import { getSecret } from '~/api/k8s/secrets';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { PIPELINE_DEFINITION_NAME, PIPELINE_ROUTE_NAME } from '~/concepts/pipelines/const';
import { ELYRA_SECRET_NAME } from '~/concepts/pipelines/elyra/const';

export const getElyraSecret = async (namespace: string, opts: K8sAPIOptions): Promise<SecretKind> =>
  getSecret(namespace, ELYRA_SECRET_NAME, opts);

export const getPipelineAPIRoute = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind> => getRoute(PIPELINE_ROUTE_NAME, namespace, opts);

export const createPipelinesCR = async (
  namespace: string,
  spec: DSPipelineKind['spec'],
  opts?: K8sAPIOptions,
): Promise<DSPipelineKind> => {
  const resource: DSPipelineKind = {
    apiVersion: `${DataSciencePipelineApplicationModel.apiGroup}/${DataSciencePipelineApplicationModel.apiVersion}`,
    kind: DataSciencePipelineApplicationModel.kind,
    metadata: {
      name: PIPELINE_DEFINITION_NAME,
      namespace,
    },
    spec: {
      apiServer: {
        enableSamplePipelines: false,
      },
      mlpipelineUI: {
        image: 'quay.io/opendatahub/odh-ml-pipelines-frontend-container:beta-ui',
      },
      ...spec,
    },
  };

  return k8sCreateResource<DSPipelineKind>(
    applyK8sAPIOptions(opts, {
      model: DataSciencePipelineApplicationModel,
      resource,
    }),
  );
};

export const getPipelinesCR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<DSPipelineKind> =>
  k8sGetResource<DSPipelineKind>(
    applyK8sAPIOptions(opts, {
      model: DataSciencePipelineApplicationModel,
      queryOptions: { name: PIPELINE_DEFINITION_NAME, ns: namespace },
    }),
  );

export const deletePipelineCR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<DSPipelineKind, K8sStatus>(
    applyK8sAPIOptions(opts, {
      model: DataSciencePipelineApplicationModel,
      queryOptions: { name: PIPELINE_DEFINITION_NAME, ns: namespace },
    }),
  );
