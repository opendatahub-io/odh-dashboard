import { Flex } from '@patternfly/react-core';
import { DesktopIcon, StorageDomainIcon } from '@patternfly/react-icons';
import React, { useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router';
import { useUploadToStorageMutation } from '~/app/hooks/mutations';
import { useSecretsQuery } from '~/app/hooks/queries';
import { useNotification } from '~/app/hooks/useNotification';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import FileSelector from '../common/FileSelector';
import S3FileExplorer from '../common/S3FileExplorer/S3FileExplorer';

// watches secret and bucket fields
// show error documenting file size limit (seems like there is a hidden one set to around 40-50 MB)
// change uploadToStorageMutation to use FormData, and specify a path to upload, which will be hardcoded to root for now

// use FileUpload, change `clearButtonText` to `Browse from S3`, change `onClearClick` to open FileExplorer
// on upload, open FileExplorer, and allow user to select which folder to upload files to
// on successful upload, auto-select all the files that were uploaded (for MVP, it will only be 1 file/folder)

function AutoragEvaluationSelect(): React.JSX.Element {
  const { namespace } = useParams();

  const notification = useNotification();

  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);

  const { data: secrets } = useSecretsQuery(namespace ?? '', 'storage');
  const uploadToStorageMutation = useUploadToStorageMutation(namespace ?? '');

  const form = useFormContext<ConfigureSchema>();
  const controller = useController({ control: form.control, name: 'test_data_key' });
  const { field } = controller;

  const [testDataSecretName] = useWatch({ control: form.control, name: ['test_data_secret_name'] });

  return (
    <>
      <FileSelector
        id={field.name}
        selected={field.value}
        onUpload={async (file, setProgress, setStatus) => {
          try {
            await uploadToStorageMutation.mutateAsync({ file, onProgress: setProgress });
          } catch (error) {
            notification.error(
              'Failed to upload file',
              error instanceof Error ? error.message : String(error),
            );
            setStatus('danger');
            return;
          }

          field.onChange(file.name);
          setStatus('success');
        }}
        onClear={() => field.onChange('')}
        fileUploadProps={{
          filenamePlaceholder: 'Drag or drop or browse from...',
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
