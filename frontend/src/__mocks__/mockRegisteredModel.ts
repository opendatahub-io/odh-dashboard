import { RegisteredModel, RegisteredModelState } from '~/concepts/modelRegistry/types';
import { createModelRegistryLabelsObject } from './utils';

type MockRegisteredModelType = {
  id?: string;
  name?: string;
  state?: RegisteredModelState;
  description?: string;
  labels?: string[];
};

export const mockRegisteredModel = ({
  name = 'test',
  state = RegisteredModelState.LIVE,
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
  customProperties: createModelRegistryLabelsObject(labels),
});
