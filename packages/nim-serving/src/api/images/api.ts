import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ConfigMapKind, NIMAccountKind } from '@odh-dashboard/internal/k8sTypes';
import { ConfigMapModel } from '@odh-dashboard/internal/api/models';
import type { NIMImage } from './types';

export const fetchNIMImages = async (account: NIMAccountKind): Promise<NIMImage[]> => {
  const configMapName = account.status?.nimConfig?.name;
  if (!configMapName) {
    return [];
  }

  const { namespace } = account.metadata;
  const configMap = await k8sGetResource<ConfigMapKind>({
    model: ConfigMapModel,
    queryOptions: { name: configMapName, ns: namespace },
  });

  if (!configMap.data || Object.keys(configMap.data).length === 0) {
    return [];
  }

  const nimImages: NIMImage[] = [];
  for (const [key, value] of Object.entries(configMap.data)) {
    try {
      const modelData = JSON.parse(value);
      if (typeof modelData.namespace !== 'string' || !Array.isArray(modelData.tags)) {
        continue;
      }
      nimImages.push({
        name: key,
        displayName: modelData.displayName,
        shortDescription: modelData.shortDescription,
        namespace: modelData.namespace,
        tags: modelData.tags,
        latestTag: modelData.latestTag,
        updatedDate: modelData.updatedDate,
      });
    } catch {
      // skip entries that can't be parsed
    }
  }

  return nimImages;
};
