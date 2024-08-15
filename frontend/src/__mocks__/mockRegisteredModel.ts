import { RegisteredModel, ModelState } from '~/concepts/modelRegistry/types';
import { createModelRegistryLabelsObject } from './utils';

type MockRegisteredModelType = {
  id?: string;
  name?: string;
  author?: string;
  owner?: string;
  state?: ModelState;
  description?: string;
  labels?: string[];
};

export const mockRegisteredModel = ({
  name = 'test',
  author = 'Author 1',
  owner = 'Author 1',
  state = ModelState.LIVE,
  description = '',
  labels = [],
  id = '1',
}: MockRegisteredModelType): RegisteredModel => ({
  createTimeSinceEpoch: '1710404288975',
  description,
  externalID: '1234132asdfasdf',
  id,
  lastUpdateTimeSinceEpoch: '1710404288975',
  name,
  state,
  author,
  owner,
  customProperties: createModelRegistryLabelsObject(labels),
});
