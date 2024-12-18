import { ModelRegistryAPIs, ModelState, ModelRegistryMetadataType } from '~/concepts/modelRegistry/types';

export const bumpModelVersionTimestamp = async (
  api: ModelRegistryAPIs,
  modelVersionId: string,
): Promise<void> => {
  try {
    await api.patchModelVersion({}, { state: ModelState.LIVE }, modelVersionId);
  } catch (error) {
  }
};

export const bumpRegisteredModelTimestamp = async (
  api: ModelRegistryAPIs,
  registeredModelId: string,
): Promise<void> => {
  try {
    const currentTime = new Date().toISOString();
    await api.patchRegisteredModel({}, { 
      state: ModelState.LIVE,
      customProperties: {
        '_lastModified': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: currentTime
        }
      }
    }, registeredModelId);
  } catch (error) {
    throw error;
  }
};

export const bumpBothTimestamps = async (
  api: ModelRegistryAPIs,
  modelVersionId: string,
  registeredModelId: string,
): Promise<void> => {
  try {
    const results = await Promise.all([
      bumpModelVersionTimestamp(api, modelVersionId).catch(e => {
        throw e;
      }),
      bumpRegisteredModelTimestamp(api, registeredModelId).catch(e => {
        throw e;
      })
    ]);
  } catch (error) {
    throw error;
  }
};
