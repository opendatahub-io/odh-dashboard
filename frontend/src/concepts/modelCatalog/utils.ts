import { CatalogModel, CatalogModelDetailsParams } from '#~/concepts/modelCatalog/types';
import { RESERVED_ILAB_LABELS } from '#~/concepts/modelCatalog/const';
import { DEPLOY_BUTTON_TOOLTIP } from '#~/pages/modelServing/screens/const';

export const encodeParams = (params: CatalogModelDetailsParams): CatalogModelDetailsParams =>
  Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      encodeURIComponent(value).replace(/\./g, '%252E'),
    ]),
  );

export const getTagFromModel = (model: CatalogModel): string | undefined =>
  model.artifacts?.[0]?.tags?.[0];

export const getILabLabels = (labels?: string[]): string[] =>
  labels?.filter((l) => RESERVED_ILAB_LABELS.some((ril) => ril === l)) ?? [];

export const removeILabLabels = (labels?: string[]): string[] =>
  labels?.filter((l) => !RESERVED_ILAB_LABELS.some((ril) => ril === l)) ?? [];

export function getDeployButtonState({
  isModelServingEnabled,
  platformEnabledCount,
  isKServeEnabled,
  isOciModel,
}: {
  isModelServingEnabled: boolean;
  platformEnabledCount: number;
  isKServeEnabled: boolean;
  isOciModel: boolean;
}): { visible: boolean; enabled?: boolean; tooltip?: string } {
  if (!isModelServingEnabled) {
    return { visible: false };
  }
  if (platformEnabledCount === 0) {
    return {
      visible: true,
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_MODEL_SERVING_PLATFORM,
    };
  }
  if (isOciModel && !isKServeEnabled) {
    return {
      visible: true,
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_SINGLE_MODEL_SERVING,
    };
  }
  return { visible: true, enabled: true };
}
