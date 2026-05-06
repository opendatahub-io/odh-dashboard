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

/** Matches BFF upload limit and knowledge-document dropzone (`32 MiB`). */
const EVAL_JSON_UPLOAD_MAX_BYTES = 32 * 1024 * 1024;

function isAllowedEvaluationJsonFile(file: File): boolean {
  const dot = file.name.lastIndexOf('.');
  const ext = dot === -1 ? '' : file.name.slice(dot).toLowerCase();
  if (ext === '.json') {
    return true;
  }
  return file.type === 'application/json' || file.type === 'text/json';
}

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
      if (fileRejections.length === 0) {
        return;
      }
      const { file, errors } = fileRejections[0];
      const codes = new Set(errors.map((e) => e.code));
      if (codes.has('file-too-large')) {
        notification.error('File too large', 'File size must be 32 MiB or less.');
        return;
      }
      if (codes.has('too-many-files')) {
        notification.error('Too many files', 'Only one file can be uploaded at a time.');
        return;
      }
      if (codes.has('file-invalid-type')) {
        notification.error('Invalid file type', 'Evaluation dataset must be a JSON file (.json).');
        return;
      }
      notification.error(
        'File not accepted',
        errors.map((e) => e.message).join(' ') || `“${file.name}” could not be added.`,
      );
    },
    [notification],
  );

  return (
    <>
      <FileSelector
        id={field.name}
        selected={field.value}
        isDisabled={isSubmitting}
        onUpload={async (file, setProgress, setStatus) => {
          if (file.size > EVAL_JSON_UPLOAD_MAX_BYTES) {
            notification.error('File too large', 'File size must be 32 MiB or less.');
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
          dropzoneProps: {
            accept: { 'application/json': ['.json'] },
            maxFiles: 1,
            maxSize: EVAL_JSON_UPLOAD_MAX_BYTES,
            multiple: false,
            onDropRejected: handleEvaluationDropRejected,
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
    </>
  );
}

export default AutoragEvaluationSelect;
