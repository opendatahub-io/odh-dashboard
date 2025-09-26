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
};

const assembleServingRuntime = (data: CreatingServingRuntimeObject): ServingRuntimeKind => {
  const { project, name, servingRuntime, scope } = data;

  const annotations = { ...servingRuntime.metadata.annotations };

  const templateDisplayName = getDisplayNameFromK8sResource(servingRuntime);
  annotations['openshift.io/display-name'] = templateDisplayName;
  annotations['opendatahub.io/template-name'] = servingRuntime.metadata.name;
  annotations['opendatahub.io/template-display-name'] = templateDisplayName;
  annotations['opendatahub.io/serving-runtime-scope'] = scope;

  servingRuntime.metadata.annotations = annotations;
  servingRuntime.metadata.name = name.trim();
  servingRuntime.metadata.namespace = project;

  return servingRuntime;
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
