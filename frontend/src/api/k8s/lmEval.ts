import {
  k8sGetResource,
  k8sListResource,
  k8sCreateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, InferenceServiceKind, LMEvaluationKind } from '~/k8sTypes';
import { InferenceServiceModel, LMEvalModel } from '~/api/models';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { kindApiVersion, translateDisplayNameForK8s } from '~/concepts/k8s/utils';

export const listDeployedModels = async (namespace: string): Promise<InferenceServiceKind[]> =>
  k8sListResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);

export const getDeployedModel = (name: string, namespace: string): Promise<InferenceServiceKind> =>
  k8sGetResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    queryOptions: { name, ns: namespace },
  });

export const listModelEvaluations = async (namespace: string): Promise<LMEvaluationKind[]> =>
  k8sListResource<LMEvaluationKind>({
    model: LMEvalModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);

const assembleModelEvaluation = (
  modelName: string,
  evalConfig: {
    evalDataset: string;
    evalMetrics: string[];
    batchSize?: number;
    timeout?: number;
  },
  namespace: string,
  name?: string,
): LMEvaluationKind => ({
  apiVersion: kindApiVersion(LMEvalModel),
  kind: LMEvalModel.kind,
  metadata: {
    name: name || `eval-${translateDisplayNameForK8s(modelName)}`,
    namespace,
    annotations: {
      'opendatahub.io/modified-date': new Date().toISOString(),
    },
  },
  spec: {
    modelName,
    ...evalConfig,
  },
});

export const createModelEvaluation = (
  modelName: string,
  evalConfig: {
    evalDataset: string;
    evalMetrics: string[];
    batchSize?: number;
    timeout?: number;
  },
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<LMEvaluationKind> => {
  const resource = assembleModelEvaluation(modelName, evalConfig, namespace);
  return k8sCreateResource<LMEvaluationKind>(
    applyK8sAPIOptions(
      {
        model: LMEvalModel,
        resource,
      },
      opts,
    ),
  );
};

export const getModelEvaluationResult = (
  name: string,
  namespace: string,
): Promise<LMEvaluationKind> =>
  k8sGetResource<LMEvaluationKind>({
    model: LMEvalModel,
    queryOptions: { name, ns: namespace },
  });
