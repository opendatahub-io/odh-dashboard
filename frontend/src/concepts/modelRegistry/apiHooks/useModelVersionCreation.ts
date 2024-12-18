import * as React from 'react';
import { CreateModelVersionData, ModelVersion, ModelState } from '~/concepts/modelRegistry/types';
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
      opts: Record<string, unknown> = {},
    ): Promise<ModelVersion> => {      
      const newVersion = await api.createModelVersionForRegisteredModel(opts, registeredModelId, data);
      await api.patchRegisteredModel(opts, { state: ModelState.LIVE }, registeredModelId).then(response => {
      });
      
      return newVersion;
    },
    [api],
  );

  return {
    createVersionWithTimestampUpdate,
    apiAvailable,
  };
};
