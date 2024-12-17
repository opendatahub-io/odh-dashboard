import { ModelRegistryAPIs, ModelState } from '~/concepts/modelRegistry/types';

export const bumpModelVersionTimestamp = async (
  api: ModelRegistryAPIs,
  modelVersionId: string,
): Promise<void> => {
  await api.patchModelVersion({}, { state: ModelState.LIVE }, modelVersionId);
};

export const bumpRegisteredModelTimestamp = async (
  api: ModelRegistryAPIs,
  registeredModelId: string,
): Promise<void> => {
  await api.patchRegisteredModel({}, { state: ModelState.LIVE }, registeredModelId);
};

export const bumpBothTimestamps = async (
  api: ModelRegistryAPIs,
  modelVersionId: string,
  registeredModelId: string,
): Promise<void> => {
  await Promise.all([
    bumpModelVersionTimestamp(api, modelVersionId),
    bumpRegisteredModelTimestamp(api, registeredModelId),
  ]);
};
