/* eslint-disable camelcase */
import { ArtifactStorage } from '~/concepts/pipelines/types';

type MockArtifactStorageType = {
  namespace: string;
  artifactId: string;
};

export const mockArtifactStorage = ({
  namespace = 'test',
  artifactId = '1',
}: MockArtifactStorageType): ArtifactStorage => ({
  artifact_id: artifactId,
  storage_provider: 's3',
  storage_path:
    'iris-training-pipeline/caf9116b-501e-491c-88e3-7772ba2b3334/create-dataset/iris_dataset',
  uri: 's3://aballant-pipelines/metrics-visualization-pipeline/16dbff18-a3d5-4684-90ac-4e6198a9da0f/markdown-visualization/markdown_artifact',
  download_url:
    'http://test-bucket.s3.dualstack.ap-south.amazonaws.com/metrics-visualization-pipeline',
  namespace,
  artifact_type: 'system.Dataset',
  artifact_size: '5098',
  created_at: '2024-06-19T12:27:19.827Z',
  last_updated_at: '2024-06-19T12:27:19.827Z',
});
