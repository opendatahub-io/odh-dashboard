import { createS3Api } from '@odh-dashboard/autox-core/ui/api';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export type {
  UploadFileToS3Params,
  UploadFileToS3Response,
  GetFilesOptions,
} from '@odh-dashboard/autox-core/ui/api';

export const { uploadFileToS3, getFiles } = createS3Api(URL_PREFIX, BFF_API_VERSION);
