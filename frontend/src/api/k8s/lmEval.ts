import {
  k8sGetResource,
  k8sListResource,
  k8sCreateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, LMEvalKind } from '#~/k8sTypes';
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
  model: string,
  evalConfig: {
    batchSize?: string;
    timeout?: number;
    taskList: {
      taskNames: string[];
    };
  },
  namespace: string,
  name?: string,
): LMEvalKind => ({
  apiVersion: kindApiVersion(LMEvalModel),
  kind: LMEvalModel.kind,
  metadata: {
    name: name || `eval-${translateDisplayNameForK8s(model)}`,
    namespace,
  },
  spec: {
    model,
    ...evalConfig,
  },
});

export const createModelEvaluation = (
  model: string,
  evalConfig: {
    batchSize?: string;
    timeout?: number;
    taskList: {
      taskNames: string[];
    };
  },
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<LMEvalKind> => {
  const resource = assembleModelEvaluation(model, evalConfig, namespace);
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
