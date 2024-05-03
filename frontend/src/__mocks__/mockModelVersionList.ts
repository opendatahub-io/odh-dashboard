import { ModelVersionList } from '~/concepts/modelRegistry/types';
import { mockModelVersion } from './mockModelVersion';

export const mockModelVersionList = (): ModelVersionList => ({
  items: [mockModelVersion({ author: 'Author 1', registeredModelId: '1' })],
  nextPageToken: '',
  pageSize: 0,
  size: 1,
});
