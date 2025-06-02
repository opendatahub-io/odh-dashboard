import {
  k8sGetResource,
  k8sListResource,
  k8sCreateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { LmEvalFormData } from '#~/pages/lmEval/types';
import { convertModelArgs } from '#~/pages/lmEval/utils';
import { K8sAPIOptions, LMEvaluationKind } from '#~/k8sTypes';
import { LMEvalModel } from '#~/api/models';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { kindApiVersion, translateDisplayNameForK8s } from '#~/concepts/k8s/utils';

export const listModelEvaluations = async (namespace: string): Promise<LMEvalKind[]> =>
  k8sListResource<LMEvalKind>({
    model: LMEvalModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);

const assembleModelEvaluation = (
  data: LmEvalFormData,
  namespace: string,
  batchSize?: string,
): LMEvaluationKind => ({
  apiVersion: kindApiVersion(LMEvalModel),
  kind: LMEvalModel.kind,
  metadata: {
    name: data.evaluationName || `eval-${translateDisplayNameForK8s(data.model.name)}`,
    namespace,
  },
  spec: {
    allowCodeExecution: data.allowRemoteCode,
    allowOnline: data.allowOnline,
    batchSize,
    logSamples: true,
    model: data.modelType,
    modelArgs: convertModelArgs(data.model),
    taskList: {
      taskNames: data.tasks,
    },
    outputs: {
      pvcManaged: {
        size: '5Gi',
      },
    },
  },
});

export const createModelEvaluation = (
  data: LmEvalFormData,
  batchSize?: string,
  opts?: K8sAPIOptions,
): Promise<LMEvaluationKind> => {
  const resource = assembleModelEvaluation(data, data.deploymentNamespace, batchSize);
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

export const getModelEvaluationResult = (name: string, namespace: string): Promise<LMEvalKind> =>
  k8sGetResource<LMEvalKind>({
    model: LMEvalModel,
    queryOptions: { name, ns: namespace },
  });
