import {
  RegisteredModel,
  ModelState,
  ModelRegistryCustomProperties,
} from '~/concepts/modelRegistry/types';

type MockRegisteredModelType = {
  id?: string;
  name?: string;
  owner?: string;
  state?: ModelState;
  description?: string;
  customProperties?: ModelRegistryCustomProperties;
  modelSourceGroup?: string;
  modelSourceId?: string;
  modelSourceName?: string;
};

export const mockRegisteredModel = ({
  name = 'test',
  owner = 'Author 1',
  state = ModelState.LIVE,
  description = '',
  customProperties = {},
  id = '1',
  modelSourceGroup = '',
  modelSourceId = '',
  modelSourceName = '',
}: MockRegisteredModelType): RegisteredModel => ({
  createTimeSinceEpoch: '1710404288975',
  description,
  externalID: '1234132asdfasdf',
  id,
  lastUpdateTimeSinceEpoch: '1710404288975',
  name,
  state,
  owner,
  customProperties,
  modelSourceGroup,
  modelSourceId,
  modelSourceName,
});
