import { Button } from '@patternfly/react-core';
import { DesktopIcon, PlusCircleIcon, StorageDomainIcon } from '@patternfly/react-icons';
import type { FileRejection } from 'react-dropzone';
import React, { useCallback, useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router';
import S3FileExplorer from '@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer';
import FileSelector from '~/app/components/common/FileSelector';
import EvaluationFileCreator from '~/app/components/configure/EvaluationFileCreator';
import { useUploadToStorageMutation } from '~/app/hooks/mutations';
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
  const [creatorOpen, setCreatorOpen] = useState(false);

  const form = useFormContext<ConfigureSchema>();
  const {
    formState: { isSubmitting },
  } = form;
  const controller = useController({ control: form.control, name: 'test_data_key' });
  const { field } = controller;

  const [testDataSecretName, displayName, inputDataKey] = useWatch({
    control: form.control,
    name: ['test_data_secret_name', 'display_name', 'input_data_key'],
  });

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
            response = await uploadToStorageMutation.mutateAsync({
              file,
              onProgress: setProgress,
            });
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
            <>
              <DesktopIcon /> Computer
            </>
          ),
          // @ts-expect-error: bypass ts error to allow icon
          clearButtonText: (
            <>
              <StorageDomainIcon /> S3
            </>
          ),
          isClearButtonDisabled: false,
          onClearClick: () => setFileExplorerOpen(true),
        }}
        fileUploadHelperText="Supply a JSON file with test questions and answers to evaluate the quality of Q&A responses."
        extraButtons={
          <Button
            variant="control"
            icon={<PlusCircleIcon />}
            onClick={() => setCreatorOpen(true)}
            isDisabled={isSubmitting || !testDataSecretName}
            data-testid="evaluation-create-button"
          >
            Create
          </Button>
        }
      />
      {creatorOpen && (
        <EvaluationFileCreator
          isOpen
          onClose={() => setCreatorOpen(false)}
          onCreated={(key) => {
            field.onChange(key);
            setCreatorOpen(false);
          }}
          namespace={namespace ?? ''}
          secretName={testDataSecretName}
          experimentName={displayName}
          inputDataKey={inputDataKey}
        />
      )}
      {fileExplorerOpen && (
        <S3FileExplorer
          apiPath="/autorag/api/v1/s3"
          namespace={namespace ?? ''}
          s3SecretName={testDataSecretName}
          isOpen
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
      )}
    </div>
  );
}

export default AutoragEvaluationSelect;
