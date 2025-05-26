import {
  k8sGetResource,
  k8sListResource,
  k8sCreateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, InferenceServiceKind, LMEvaluationKind } from '~/k8sTypes';
import { InferenceServiceModel, LMEvalModel } from '~/api/models';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { kindApiVersion, translateDisplayNameForK8s } from '~/concepts/k8s/utils';

/**
 * List all deployed models that can be evaluated
 */
export const listDeployedModels = async (namespace: string): Promise<InferenceServiceKind[]> =>
  k8sListResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);

/**
 * Get a specific deployed model by name
 */
export const getDeployedModel = (name: string, namespace: string): Promise<InferenceServiceKind> =>
  k8sGetResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    queryOptions: { name, ns: namespace },
  });

/**
 * List all model evaluations
 */
export const listModelEvaluations = async (namespace: string): Promise<LMEvaluationKind[]> =>
  k8sListResource<LMEvaluationKind>({
    model: LMEvalModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);

/**
 * Assembles an evaluation request for a deployed model
 */
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

/**
 * Create a new model evaluation
 */
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

/**
 * Get evaluation results for a model
 */
export const getModelEvaluationResult = (
  name: string,
  namespace: string,
): Promise<LMEvaluationKind> =>
  k8sGetResource<LMEvaluationKind>({
    model: LMEvalModel,
    queryOptions: { name, ns: namespace },
  });
