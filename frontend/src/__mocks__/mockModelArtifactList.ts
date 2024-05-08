/* eslint-disable camelcase */
import { ModelArtifactList } from '~/concepts/modelRegistry/types';
import { mockModelArtifact } from './mockModelArtifact';

export const mockModelArtifactList = (): ModelArtifactList => ({
  items: [mockModelArtifact()],
  nextPageToken: '',
  pageSize: 0,
  size: 1,
});
