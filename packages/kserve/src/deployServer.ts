import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { ServingRuntimeModel } from '@odh-dashboard/internal/api/index';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';

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
