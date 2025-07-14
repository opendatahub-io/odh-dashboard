import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { BuildConfigModel, BuildModel } from '#~/api/models';
import { BuildConfigKind, BuildKind } from '#~/k8sTypes';

export const getNotebookBuildConfigs = (namespace: string): Promise<BuildConfigKind[]> =>
  k8sListResource<BuildConfigKind>({
    model: BuildConfigModel,
    queryOptions: {
      ns: namespace,
      queryParams: { labelSelector: 'opendatahub.io/build_type=notebook_image' },
    },
  }).then((r) => r.items);

export const getBuildsForBuildConfig = (namespace: string, name: string): Promise<BuildKind[]> =>
  k8sListResource<BuildKind>({
    model: BuildModel,
    queryOptions: {
      ns: namespace,
      queryParams: { labelSelector: `buildconfig=${name}` },
    },
  }).then((r) => r.items);
