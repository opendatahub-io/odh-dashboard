import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { ServingRuntimeModel } from '@odh-dashboard/internal/api/index';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { ServingRuntimeKind, type InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import type { ModelServerOption } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelServerTemplateSelectField.js';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { KServeDeployment } from './deployments';

type CreatingServingRuntimeObject = {
  project: string;
  servingRuntime: ServingRuntimeKind;
  name: string;
  scope: string;
  templateName?: string;
};

const assembleServingRuntime = (data: CreatingServingRuntimeObject): ServingRuntimeKind => {
  const { project, name, servingRuntime, scope, templateName } = data;

  const updatedServingRuntime = structuredClone(servingRuntime);

  const annotations = {
    ...(updatedServingRuntime.metadata.annotations ?? {}),
    'openshift.io/display-name': getDisplayNameFromK8sResource(servingRuntime),
    'opendatahub.io/template-name': templateName ?? servingRuntime.metadata.name,
    'opendatahub.io/template-display-name': getDisplayNameFromK8sResource(servingRuntime),
    'opendatahub.io/serving-runtime-scope': scope,
  };

  updatedServingRuntime.metadata.annotations = annotations;
  updatedServingRuntime.metadata.name = name.trim();
  updatedServingRuntime.metadata.namespace = project;

  return updatedServingRuntime;
};

export const createServingRuntime = (
  data: CreatingServingRuntimeObject,
  dryRun?: boolean,
): Promise<ServingRuntimeKind> => {
  const assembledServingRuntime = assembleServingRuntime(data);

  return k8sCreateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
        resource: assembledServingRuntime,
      },
      { dryRun: dryRun ?? false },
    ),
  );
};

export const applyModelRuntime = (
  inferenceService: InferenceServiceKind,
  runtimeK8sName: string,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);
  if (!result.spec.predictor.model?.runtime) {
    result.spec.predictor.model = {
      ...result.spec.predictor.model,
      runtime: runtimeK8sName,
    };
  }
  return result;
};

export const extractModelServerTemplate = (
  KServeDeployment: KServeDeployment,
  dashboardNamespace?: string,
): ModelServerOption | null =>
  KServeDeployment.server
    ? {
        name: KServeDeployment.server.metadata.annotations?.['opendatahub.io/template-name'] ?? '',
        namespace:
          KServeDeployment.server.metadata.annotations?.['opendatahub.io/serving-runtime-scope'] ===
          'global'
            ? dashboardNamespace
            : KServeDeployment.server.metadata.namespace,
        scope:
          KServeDeployment.server.metadata.annotations?.['opendatahub.io/serving-runtime-scope'],
        label:
          KServeDeployment.server.metadata.annotations?.['opendatahub.io/template-display-name'],
      }
    : null;
