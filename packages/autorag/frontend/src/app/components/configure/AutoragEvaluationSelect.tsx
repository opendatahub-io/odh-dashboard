import { Flex } from '@patternfly/react-core';
import { DesktopIcon, StorageDomainIcon } from '@patternfly/react-icons';
import React, { useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router';
import FileSelector from '~/app/components/common/FileSelector';
import S3FileExplorer from '~/app/components/common/S3FileExplorer/S3FileExplorer';
import { useUploadToStorageMutation } from '~/app/hooks/mutations';
import { useSecretsQuery } from '~/app/hooks/queries';
import { useNotification } from '~/app/hooks/useNotification';
import { ConfigureSchema } from '~/app/schemas/configure.schema';

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

  return (
    <>
      <FileSelector
        id={field.name}
        selected={field.value}
        isDisabled={isSubmitting}
        onUpload={async (file, setProgress, setStatus) => {
          let response;
          try {
            response = await uploadToStorageMutation.mutateAsync({ file, onProgress: setProgress });
          } catch (error) {
            notification.error(
              'Failed to upload file',
              error instanceof Error ? error.message : String(error),
            );
            setStatus('danger');
            return;
          }

          field.onChange(response.key);
          setStatus('success');
        }}
        onClear={() => field.onChange('')}
        fileUploadProps={{
          dropzoneProps: { accept: { 'application/json': ['.json'] } },
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
