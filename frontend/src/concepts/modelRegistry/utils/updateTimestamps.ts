import {
  ModelRegistryAPIs,
  ModelState,
  ModelRegistryMetadataType,
  RegisteredModel,
  ModelVersion,
} from '~/concepts/modelRegistry/types';

type MinimalModelRegistryAPI = Pick<ModelRegistryAPIs, 'patchRegisteredModel'>;

export const bumpModelVersionTimestamp = async (
  api: ModelRegistryAPIs,
  modelVersions: ModelVersion,
): Promise<void> => {
  if (!modelVersions.id) {
    throw new Error('Model version ID is required');
  }

  try {
    const currentTime = new Date().toISOString();
    await api.patchModelVersion(
      {},
      {
        // This is a workaround to update the timestamp on the backend. There is a bug opened for model registry team
        // to fix this issue. see https://issues.redhat.com/browse/RHOAIENG-17614
        state: ModelState.LIVE,
        customProperties: {
          ...modelVersions.customProperties,
          _lastModified: {
            metadataType: ModelRegistryMetadataType.STRING,
            // eslint-disable-next-line camelcase
            string_value: currentTime,
          },
        },
      },
      modelVersions.id,
    );
  } catch (error) {
    throw new Error(
      `Failed to update model version timestamp: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

export const bumpRegisteredModelTimestamp = async (
  api: MinimalModelRegistryAPI,
  registeredModels: RegisteredModel,
): Promise<void> => {
  if (!registeredModels.id) {
    throw new Error('Registered model ID is required');
  }

  try {
    const currentTime = new Date().toISOString();
    await api.patchRegisteredModel(
      {},
      {
        state: ModelState.LIVE,
        customProperties: {
          ...registeredModels.customProperties,
          // This is a workaround to update the timestamp on the backend. There is a bug opened for model registry team
          // to fix this issue. see https://issues.redhat.com/browse/RHOAIENG-17614
          _lastModified: {
            metadataType: ModelRegistryMetadataType.STRING,
            // eslint-disable-next-line camelcase
            string_value: currentTime,
          },
        },
      },
      registeredModels.id,
    );
  } catch (error) {
    throw new Error(
      `Failed to update registered model timestamp: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

export const bumpBothTimestamps = async (
  api: ModelRegistryAPIs,
  registeredModels: RegisteredModel,
  modelVersions: ModelVersion,
): Promise<void> => {
  await Promise.all([
    bumpModelVersionTimestamp(api, modelVersions),
    bumpRegisteredModelTimestamp(api, registeredModels),
  ]);
};
