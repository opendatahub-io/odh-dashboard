import {
  k8sGetResource,
  k8sListResource,
  k8sCreateResource,
  k8sDeleteResource,
  K8sStatus,
  useK8sWatchResource,
  WatchK8sResult,
} from '@openshift/dynamic-plugin-sdk-utils';
import { LmEvalFormData } from '#~/pages/lmEval/types';
import { K8sAPIOptions, LMEvalKind } from '#~/k8sTypes';
import { LMEvalModel } from '#~/api/models';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { kindApiVersion, translateDisplayNameForK8s } from '#~/concepts/k8s/utils';
import { convertModelArgs } from '#~/pages/lmEval/lmEvalForm/utils.ts';
import { groupVersionKind } from '#~/api/k8sUtils';

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
    annotations: {
      'openshift.io/display-name': data.evaluationName.trim(),
    },
    name: data.k8sName || translateDisplayNameForK8s(data.evaluationName),
    namespace,
  },
  spec: {
    allowCodeExecution: data.allowRemoteCode,
    allowOnline: data.allowOnline,
    batchSize: batchSize ?? '1',
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

export const deleteModelEvaluation = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<LMEvalKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: LMEvalModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const getModelEvaluationResult = (name: string, namespace: string): Promise<LMEvalKind> =>
  k8sGetResource<LMEvalKind>({
    model: LMEvalModel,
    queryOptions: { name, ns: namespace },
  });

export const useLMEvalJobStatus = (name: string, namespace: string): WatchK8sResult<LMEvalKind> =>
  useK8sWatchResource(
    {
      isList: false,
      groupVersionKind: groupVersionKind(LMEvalModel),
      namespace,
      name,
    },
    LMEvalModel,
  );
