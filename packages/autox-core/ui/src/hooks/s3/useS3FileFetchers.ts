import type { S3FileFetchers } from '../../api/s3';
import { useProductContext } from '../../context';

export function useS3FileFetchers(): S3FileFetchers {
  return useProductContext().api.s3;
}
