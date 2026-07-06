import { Flex } from '@patternfly/react-core';
import { DesktopIcon, StorageDomainIcon } from '@patternfly/react-icons';
import type { FileRejection } from 'react-dropzone';
import React, { useCallback, useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router';
import FileSelector from '~/app/components/common/FileSelector';
import S3FileExplorer from '~/app/components/common/S3FileExplorer/S3FileExplorer';
import { useUploadToStorageMutation } from '~/app/hooks/mutations';
import { useSecretsQuery } from '~/app/hooks/queries';
import { useNotification } from '~/app/hooks/useNotification';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import {
  AUTORAG_UPLOAD_MAX_BYTES,
  AUTORAG_UPLOAD_MAX_FILES,
  AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
} from '~/app/utilities/dropzoneFileUpload';
import {
  EVALUATION_FILE_ACCEPT,
  getEvaluationDropRejectedNotification,
  isAllowedEvaluationJsonFile,
} from '~/app/utilities/autoragEvaluationFile';

function AutoragEvaluationSelect(): React.JSX.Element {
  const { namespace } = useParams();

  const notification = useNotification();

  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);

  const form = useFormContext<ConfigureSchema>();
  const {
    formState: { isSubmitting },
  } = form;
  const controller = useController({ control: form.control, name: 'test_data_key' });
  const { field } = controller;

  const [testDataSecretName] = useWatch({ control: form.control, name: ['test_data_secret_name'] });

  const { data: secrets } = useSecretsQuery(namespace ?? '', 'storage');
  const uploadToStorageMutation = useUploadToStorageMutation(namespace ?? '', testDataSecretName);

  const handleEvaluationDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
      const payload = getEvaluationDropRejectedNotification(fileRejections);
      if (payload) {
        notification.error(payload.title, payload.description);
      }
    },
    [notification],
  );

  return (
    <div data-testid="evaluation-file-selector">
      <FileSelector
        id={field.name}
        selected={field.value}
        isDisabled={isSubmitting}
        onDropRejected={handleEvaluationDropRejected}
        onUpload={async (file, setProgress, setStatus) => {
          if (file.size > AUTORAG_UPLOAD_MAX_BYTES) {
            notification.error('File too large', AUTORAG_UPLOAD_TOO_LARGE_DETAIL);
            setStatus('danger');
            return;
          }
          if (!isAllowedEvaluationJsonFile(file)) {
            notification.error(
              'Invalid file type',
              'Evaluation dataset must be a JSON file (.json).',
            );
            setStatus('danger');
            return;
          }

          let response;
          try {
            response = await uploadToStorageMutation.mutateAsync({ file, onProgress: setProgress });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isConflict = errorMessage.toLowerCase().includes('unique filename');

            notification.error(
              'Failed to upload file',
              isConflict
                ? 'A file with this name already exists and no unique name could be generated. Please rename your file or delete existing files with similar names.'
                : errorMessage,
            );
            setStatus('danger');
            return;
          }

          field.onChange(response.key);
          setStatus('success');
        }}
        onClear={() => field.onChange('')}
        fileUploadProps={{
          'data-testid': 'evaluation-upload-zone',
          dropzoneProps: {
            accept: EVALUATION_FILE_ACCEPT,
            maxFiles: AUTORAG_UPLOAD_MAX_FILES,
            maxSize: AUTORAG_UPLOAD_MAX_BYTES,
            multiple: false,
          },
          filenamePlaceholder: 'Drag and drop or browse from...',
          // @ts-expect-error: bypass ts error to allow icon
          browseButtonText: (
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapXs' }}>
              <DesktopIcon />
              <span>Computer</span>
            </Flex>
          ),
          // @ts-expect-error: bypass ts error to allow icon
          clearButtonText: (
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapXs' }}>
              <StorageDomainIcon />
              <span>S3</span>
            </Flex>
          ),
          isClearButtonDisabled: false,
          onClearClick: () => setFileExplorerOpen(true),
        }}
        fileUploadHelperText="Supply a JSON file with test questions and answers to evaluate the quality of Q&A responses."
      />
      <S3FileExplorer
        namespace={namespace ?? ''}
        s3Secret={secrets?.find((secret) => secret.name === testDataSecretName)}
        isOpen={fileExplorerOpen}
        onClose={() => setFileExplorerOpen(false)}
        onSelectFiles={(files) => {
          if (files.length > 0) {
            const file = files[0];
            const filePath = file.path.replace(/^\//, '');
            field.onChange(filePath);
          }
        }}
        allowFolderSelection={false}
        selectableExtensions={['json']}
        unselectableReason="You can only select JSON files"
      />
    </div>
  );
}

export default AutoragEvaluationSelect;
