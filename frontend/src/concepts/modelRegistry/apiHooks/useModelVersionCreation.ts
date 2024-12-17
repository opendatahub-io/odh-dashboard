import * as React from 'react';
import { CreateModelVersionData, ModelVersion } from '~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { bumpRegisteredModelTimestamp } from '~/concepts/modelRegistry/utils/updateTimestamps';

export const useModelVersionCreation = (): {
  createVersionWithTimestampUpdate: (
    registeredModelId: string,
    data: CreateModelVersionData,
    opts?: Record<string, unknown>,
  ) => Promise<ModelVersion>;
  apiAvailable: boolean;
} => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const createVersionWithTimestampUpdate = React.useCallback(
    async (
      registeredModelId: string,
      data: CreateModelVersionData,
      opts = {},
    ): Promise<ModelVersion> => {
      if (!apiAvailable) {
        throw new Error('API not yet available');
      }

      // First create the version
      const newVersion = await api.createModelVersionForRegisteredModel(
        opts,
        registeredModelId,
        data,
      );

      // Then bump the registered model's timestamp
      await bumpRegisteredModelTimestamp(api, registeredModelId);

      return newVersion;
    },
    [api, apiAvailable],
  );

  return {
    createVersionWithTimestampUpdate,
    apiAvailable,
  };
};
