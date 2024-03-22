import { RegisteredModelList } from '~/concepts/modelRegistry/types';
import { mockRegisteredModel } from './mockRegisteredModel';

export const mockRegisteredModelList = (): RegisteredModelList => ({
  items: [mockRegisteredModel({ name: 'test-1' }), mockRegisteredModel({ name: 'test-2' })],
  nextPageToken: '',
  pageSize: 0,
  size: 4,
});
