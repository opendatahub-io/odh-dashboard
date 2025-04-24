import {
  ModelVersion,
  ModelState,
  ModelRegistryCustomProperties,
} from '~/concepts/modelRegistry/types';

type MockModelVersionType = {
  author?: string;
  id?: string;
  registeredModelId?: string;
  name?: string;
  state?: ModelState;
  description?: string;
  createTimeSinceEpoch?: string;
  lastUpdateTimeSinceEpoch?: string;
  customProperties?: ModelRegistryCustomProperties;
  modelSourceKind?: string;
  modelSourceClass?: string;
  modelSourceGroup?: string;
  modelSourceId?: string;
  modelSourceName?: string;
};

export const mockModelVersion = ({
  author = 'Test author',
  registeredModelId = '1',
  name = 'new model version',
  customProperties = {},
  id = '1',
  state = ModelState.LIVE,
  description = 'Description of model version',
  createTimeSinceEpoch = '1712234877179',
  lastUpdateTimeSinceEpoch = '1712234877179',
}: MockModelVersionType): ModelVersion => ({
  author,
  createTimeSinceEpoch,
  customProperties,
  id,
  lastUpdateTimeSinceEpoch,
  name,
  state,
  registeredModelId,
  description,
});
