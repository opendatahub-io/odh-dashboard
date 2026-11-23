import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { FileRejection } from 'react-dropzone';
import { useS3FileUploadMutation } from '@odh-dashboard/autox-core/ui/hooks';
import { useNotification } from '~/app/hooks/useNotification';
import {
  AUTOML_TRAINING_UPLOAD_MAX_BYTES,
  AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL,
  getTrainingDataDropRejectedNotification,
  isAllowedTrainingDataUploadFile,
  resolveSingleFileDropOutcome,
} from '~/app/utilities/automlTrainingDataFile';

type DatasetUploadOptions = {
  namespace?: string;
  secretName: string;
  bucket: string;
  requestSequenceRef: MutableRefObject<number>;
  onStart: () => void;
  onSuccess: (key: string) => void;
  onUploadingChange: (isUploading: boolean) => void;
};

export default function useDatasetUpload({
  namespace,
  secretName,
  bucket,
  requestSequenceRef,
  onStart,
  onSuccess,
  onUploadingChange,
}: DatasetUploadOptions): {
  uploadFile: (file?: File) => Promise<void>;
  processDrop: (acceptedFiles: File[], fileRejections: FileRejection[]) => void;
} {
  const sequence = requestSequenceRef;
  const connection = useMemo(
    () => ({ namespace, secretName, bucket }),
    [namespace, secretName, bucket],
  );
  const activeConnectionRef = useRef<typeof connection>();
  useLayoutEffect(() => {
    activeConnectionRef.current = connection;
    return () => {
      activeConnectionRef.current = undefined;
    };
  }, [connection]);
  const notification = useNotification();
  const { mutateAsync: uploadFileToS3 } = useS3FileUploadMutation('');
  const uploadFile = useCallback(
    async (file?: File) => {
      // Dropzone may finish extracting files after the connection has changed.
      if (!file || !namespace || activeConnectionRef.current !== connection) {
        return;
      }
      if (file.size > AUTOML_TRAINING_UPLOAD_MAX_BYTES) {
        notification.error('File too large', AUTOML_TRAINING_UPLOAD_TOO_LARGE_DETAIL);
        return;
      }
      if (!isAllowedTrainingDataUploadFile(file)) {
        notification.error('Invalid file type', 'File type must be CSV.');
        return;
      }
      const requestId = ++sequence.current;
      const isCurrentRequest = () =>
        requestId === sequence.current && activeConnectionRef.current === connection;
      onStart();
      onUploadingChange(true);
      try {
        const result = await uploadFileToS3({
          namespace,
          secretName,
          bucket,
          key: file.name,
          file,
        });
        if (isCurrentRequest()) {
          onSuccess(result.key);
        }
      } catch (error) {
        if (isCurrentRequest()) {
          const message = error instanceof Error ? error.message : String(error);
          notification.error(
            'Failed to upload file',
            message.toLowerCase().includes('unique filename')
              ? 'A file with this name already exists and no unique name could be generated. Please rename your file or delete existing files with similar names.'
              : message,
          );
        }
      } finally {
        if (isCurrentRequest()) {
          onUploadingChange(false);
        }
      }
    },
    [
      namespace,
      secretName,
      bucket,
      connection,
      sequence,
      onStart,
      onSuccess,
      onUploadingChange,
      notification,
      uploadFileToS3,
    ],
  );

  const processDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const outcome = resolveSingleFileDropOutcome(acceptedFiles, fileRejections);
      if (outcome.kind === 'reject') {
        const payload = getTrainingDataDropRejectedNotification(outcome.fileRejections);
        if (payload) {
          notification.error(payload.title, payload.description);
        }
      } else if (outcome.kind === 'upload') {
        void uploadFile(outcome.file);
      }
    },
    [notification, uploadFile],
  );

  return { uploadFile, processDrop };
}
