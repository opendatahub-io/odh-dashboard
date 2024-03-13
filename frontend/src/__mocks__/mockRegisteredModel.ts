import { RegisteredModel, RegisteredModelState } from '~/concepts/modelRegistry/types';

export const mockRegisteredModel = ({
  name = 'test',
  state = RegisteredModelState.LIVE,
}: Partial<RegisteredModel>): RegisteredModel => ({
  createTimeSinceEpoch: '1710404288975',
  description: 'test',
  externalID: '1234132asdfasdf',
  id: '1',
  lastUpdateTimeSinceEpoch: '1710404288975',
  name,
  state,
});
