import {
  k8sGetResource,
  k8sListResource,
  k8sCreateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { LmEvalFormData } from '#~/pages/lmEval/types';
import { K8sAPIOptions, LMEvalKind } from '#~/k8sTypes';
import { LMEvalModel } from '#~/api/models';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { kindApiVersion, translateDisplayNameForK8s } from '#~/concepts/k8s/utils';
import { convertModelArgs } from '#~/pages/lmEval/lmEvalForm/utils.ts';

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
): LMEvalKind => ({
  apiVersion: kindApiVersion(LMEvalModel),
  kind: LMEvalModel.kind,
  metadata: {
    name: data.evaluationName || `eval-${translateDisplayNameForK8s(data.model.name)}`,
    namespace,
  },
  spec: {
    allowCodeExecution: data.allowRemoteCode,
    allowOnline: data.allowOnline,
    ...(batchSize && { batchSize }),
    logSamples: true,
    model: data.modelType,
    modelArgs: convertModelArgs(data.model),
    taskList: {
      taskNames: data.tasks,
    },
    outputs: {
      pvcManaged: {
        size: '100Mi',
      },
    },
  },
});

export const createModelEvaluation = (
  data: LmEvalFormData,
  namespace: string,
  batchSize?: string,
  opts?: K8sAPIOptions,
): Promise<LMEvalKind> => {
  const resource = assembleModelEvaluation(data, namespace, batchSize);
  return k8sCreateResource<LMEvalKind>(
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
