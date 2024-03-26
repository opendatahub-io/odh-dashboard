import { RegisteredModel, RegisteredModelState } from '~/concepts/modelRegistry/types';

type MockRegisteredModelType = { name?: string; state?: RegisteredModelState };

export const mockRegisteredModel = ({
  name = 'test',
  state = RegisteredModelState.LIVE,
}: MockRegisteredModelType): RegisteredModel => ({
  createTimeSinceEpoch: '1710404288975',
  description: 'test',
  externalID: '1234132asdfasdf',
  id: '1',
  lastUpdateTimeSinceEpoch: '1710404288975',
  name,
  state,
});
