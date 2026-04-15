import {
  ModelRegistryAPIs,
  ModelState,
  ModelRegistryMetadataType,
  RegisteredModel,
} from '#~/concepts/modelRegistry/types';

type MinimalModelRegistryAPI = Pick<ModelRegistryAPIs, 'patchRegisteredModel'>;

export const bumpRegisteredModelTimestamp = async (
  api: MinimalModelRegistryAPI,
  registeredModel: RegisteredModel,
): Promise<void> => {
  if (!registeredModel.id) {
    throw new Error('Registered model ID is required');
  }

  try {
    const currentTime = new Date().toISOString();
    await api.patchRegisteredModel(
      {},
      {
        state: ModelState.LIVE,
        customProperties: {
          ...registeredModel.customProperties,
          // This is a workaround to update the timestamp on the backend. There is a bug opened for model registry team
          // to fix this issue. see https://issues.redhat.com/browse/RHOAIENG-17614
          _lastModified: {
            metadataType: ModelRegistryMetadataType.STRING,
            // eslint-disable-next-line camelcase
            string_value: currentTime,
          },
        },
      },
      registeredModel.id,
    );
  } catch (error) {
    throw new Error(
      `Failed to update registered model timestamp: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};
