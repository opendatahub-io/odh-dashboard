import {
  applyK8sAPIOptions,
  getDisplayNameFromK8sResource,
  K8sAPIOptions,
} from '@odh-dashboard/k8s-core';
import { ServingRuntimeModel } from '@odh-dashboard/internal/api/index';
import { type InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import type { ModelServerSelectFieldData } from '@odh-dashboard/model-serving/shared/wizard-fields';
import { k8sCreateResource, k8sUpdateResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { KServeDeployment } from './types';

type CreatingServingRuntimeObject = {
  project: string;
  servingRuntime: ServingRuntimeKind;
  name: string;
  scope?: string;
  templateName?: string;
};

export const assembleServingRuntime = (data: CreatingServingRuntimeObject): ServingRuntimeKind => {
  const { project, name, servingRuntime, scope, templateName } = data;

  const updatedServingRuntime = structuredClone(servingRuntime);

  const annotations = {
    ...(updatedServingRuntime.metadata.annotations ?? {}),
    'openshift.io/display-name': getDisplayNameFromK8sResource(servingRuntime),
    'opendatahub.io/template-name': templateName ?? servingRuntime.metadata.name,
    'opendatahub.io/template-display-name': getDisplayNameFromK8sResource(servingRuntime),
    ...(scope && { 'opendatahub.io/serving-runtime-scope': scope }),
  };

  updatedServingRuntime.metadata.annotations = annotations;
  updatedServingRuntime.metadata.name = name.trim();
  updatedServingRuntime.metadata.namespace = project;

  return updatedServingRuntime;
};

export const createServingRuntime = (
  servingRuntime: ServingRuntimeKind,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind> => {
  return k8sCreateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
        resource: servingRuntime,
      },
      opts,
    ),
  );
};

export const updateServingRuntime = (
  servingRuntime: ServingRuntimeKind,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind> =>
  k8sUpdateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
        resource: servingRuntime,
      },
      opts,
    ),
  );

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
): { data: ModelServerSelectFieldData } | null => {
  const templateDisplayName =
    KServeDeployment.server?.metadata.annotations?.['opendatahub.io/template-display-name'];
  const displayName = KServeDeployment.server?.metadata.annotations?.['openshift.io/display-name'];
  const label = templateDisplayName ?? displayName;
  return KServeDeployment.server
    ? {
        data: {
          selection: {
            name:
              KServeDeployment.server.metadata.annotations?.['opendatahub.io/template-name'] ?? '',
            namespace:
              KServeDeployment.server.metadata.annotations?.[
                'opendatahub.io/serving-runtime-scope'
              ] === 'global'
                ? dashboardNamespace
                : KServeDeployment.server.metadata.namespace,
            scope:
              KServeDeployment.server.metadata.annotations?.[
                'opendatahub.io/serving-runtime-scope'
              ],
            label,
          },
        },
      }
    : null;
};
