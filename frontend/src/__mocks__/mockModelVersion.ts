import { ModelVersion, ModelState } from '~/concepts/modelRegistry/types';
import { createModelRegistryLabelsObject } from './utils';

type MockModelVersionType = {
  author?: string;
  id?: string;
  registeredModelId?: string;
  name?: string;
  labels?: string[];
  state?: ModelState;
  description?: string;
};

export const mockModelVersion = ({
  author = 'Test author',
  registeredModelId = '1',
  name = 'new model version',
  labels = [],
  id = '1',
  state = ModelState.LIVE,
  description = 'Description of model version',
}: MockModelVersionType): ModelVersion => ({
  author,
  createTimeSinceEpoch: '1712234877179',
  customProperties: createModelRegistryLabelsObject(labels),
  id,
  lastUpdateTimeSinceEpoch: '1712234877179',
  name,
  state,
  registeredModelId,
  description,
});
