export {
  createS3FileFetchers,
  type FetchS3FileOptions,
  type FetchS3JsonOptions,
  type S3FileFetchers,
} from '../../api/s3';
import { useProductContext } from '../../context';
import type { S3FileFetchers } from '../../api/s3';

export function useS3FileFetchers(): S3FileFetchers {
  return useProductContext().api.s3;
}
