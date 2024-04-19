import { RegisteredModelList } from '~/concepts/modelRegistry/types';
import { mockRegisteredModel } from './mockRegisteredModel';

export const mockRegisteredModelList = ({
  size = 2,
}: Partial<RegisteredModelList>): RegisteredModelList => ({
  items: [mockRegisteredModel({ name: 'test-1' }), mockRegisteredModel({ name: 'test-2' })],
  nextPageToken: '',
  pageSize: 0,
  size,
});
