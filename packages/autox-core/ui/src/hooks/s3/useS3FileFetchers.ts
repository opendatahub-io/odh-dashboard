import type { S3FileFetchers } from '../../api/s3';
import { useAutoXApi } from '../../context';

export function useS3FileFetchers(): S3FileFetchers {
  return useAutoXApi().s3;
}
