/* eslint-disable camelcase */
import { ArtifactStorage } from '~/concepts/pipelines/types';

type MockArtifactStorageType = {
  namespace?: string;
  artifactId?: string;
  storage_path?: string;
  uri?: string;
  download_url?: string;
  render_url?: string;
  artifact_type?: string;
  artifact_size?: string;
};

export const mockArtifactStorage = ({
  namespace = 'test',
  artifactId = '1',
  storage_path = 'metrics-visualization-pipeline/5e873c64-39fa-4dd4-83db-eff0cdd1e274/html-visualization/html_artifact',
  uri = 's3://aballant-pipelines/metrics-visualization-pipeline/5e873c64-39fa-4dd4-83db-eff0cdd1e274/html-visualization/html_artifact',
  download_url = 'https://test.s3.dualstack.us-east-1.amazonaws.com/metrics-visualization-pipeline/5e873c64-39fa-4dd4-83db-eff0cdd1e274/html-visualization/html_artifact?X-Amz-Algorithm=AWS4-HMAC-SHA256\u0026X-Amz-Credential=AKIAYQPE7PSILMBBLXMO%2F20240808%2Fus-east-1%2Fs3%2Faws4_request\u0026X-Amz-Date=20240808T070034Z\u0026X-Amz-Expires=15\u0026X-Amz-SignedHeaders=host\u0026response-content-disposition=attachment%3B%20filename%3D%22%22\u0026X-Amz-Signature=de39ee684dd606e75da3b07c1b9f0820f7442ea7a037ae1bffccea9e33610ea9',
  render_url = 'https://test.s3.dualstack.us-east-1.amazonaws.com/metrics-visualization-pipeline/5e873c64-39fa-4dd4-83db-eff0cdd1e274/html-visualization/html_artifact?X-Amz-Algorithm=AWS4-HMAC-SHA256\u0026X-Amz-Credential=AKIAYQPE7PSILMBBLXMO%2F20240808%2Fus-east-1%2Fs3%2Faws4_request\u0026X-Amz-Date=20240808T070034Z\u0026X-Amz-Expires=15\u0026X-Amz-SignedHeaders=host\u0026response-content-disposition=attachment%3B%20filename%3D%22%22\u0026X-Amz-Signature=de39ee684dd606e75da3b07c1b9f0820f7442ea7a037ae1bffccea9e33610ea9',
  artifact_type = 'system.Markdown',
  artifact_size = '61',
}: MockArtifactStorageType): ArtifactStorage => ({
  artifact_id: artifactId,
  storage_provider: 's3',
  storage_path,
  uri,
  download_url,
  render_url,
  namespace,
  artifact_size,
  artifact_type,
  created_at: '2024-06-19T12:27:19.827Z',
  last_updated_at: '2024-06-19T12:27:19.827Z',
});
