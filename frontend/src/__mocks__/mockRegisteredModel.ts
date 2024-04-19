import {
  ModelRegistryBase,
  RegisteredModel,
  RegisteredModelState,
} from '~/concepts/modelRegistry/types';

type MockRegisteredModelType = {
  id?: string;
  name?: string;
  state?: RegisteredModelState;
  description?: string;
  customProperties?: ModelRegistryBase['customProperties'];
};

export const mockRegisteredModel = ({
  name = 'test',
  state = RegisteredModelState.LIVE,
  description = '',
  customProperties = {},
  id = '1',
}: MockRegisteredModelType): RegisteredModel => ({
  createTimeSinceEpoch: '1710404288975',
  description,
  externalID: '1234132asdfasdf',
  id,
  lastUpdateTimeSinceEpoch: '1710404288975',
  name,
  state,
  customProperties,
});
