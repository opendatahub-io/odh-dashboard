import { ModelRegistryBase, ModelVersion, ModelVersionState } from '~/concepts/modelRegistry/types';

type MockModelVersionType = {
  author?: string;
  id?: string;
  registeredModelId?: string;
  name?: string;
  customProperties?: ModelRegistryBase['customProperties'];
};

export const mockModelVersion = ({
  author = 'Test author',
  registeredModelId = '1',
  name = 'new model version',
  customProperties = {},
  id = '',
}: MockModelVersionType): ModelVersion => ({
  author,
  createTimeSinceEpoch: '1712234877179',
  customProperties,
  id,
  lastUpdateTimeSinceEpoch: '1712234877179',
  name,
  state: ModelVersionState.ARCHIVED,
  registeredModelId,
  description: 'Description of model version',
});
