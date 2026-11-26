import React from 'react';
import { flushSync } from 'react-dom';
import { Spinner } from '@patternfly/react-core';
import { Tearsheet, TearsheetBody, TearsheetHeader } from '@patternfly/react-component-groups';
import { useS3GetFileSchemaQuery } from '~/app/hooks/useS3GetFileSchemaQuery';
import DatasetSampleTable from './DatasetSampleTable';
import DatasetSamplingError from './DatasetSamplingError';

export type DatasetFilePreviewProps = {
  namespace: string;
  secretName: string;
  bucket?: string;
  fileKey: string;
  onClose: () => void;
  trigger?: HTMLElement;
};

export default function DatasetFilePreview({
  namespace,
  secretName,
  bucket,
  fileKey,
  onClose,
  trigger,
}: DatasetFilePreviewProps): React.JSX.Element {
  const query = useS3GetFileSchemaQuery(namespace, secretName, bucket, fileKey);
  const closePreview = () => {
    // Commit the parent's focus-trap activation before scheduling return focus.
    flushSync(onClose);
    setTimeout(() => {
      if (trigger?.isConnected && !trigger.closest('[aria-hidden="true"]')) {
        trigger.focus();
      }
    }, 0);
  };
  return (
    <Tearsheet
      isOpen
      stackLevel={1}
      modalProps={{ backdropClassName: 'automl-dataset-file-preview-backdrop' }}
      onClose={closePreview}
      onEscapePress={(event) => {
        event.stopPropagation();
        closePreview();
      }}
      // Share the parent's portal subtree so its sibling isolation cannot hide this preview.
      // Append beside the dialog, outside its focus trap's dialog content.
      appendTo={trigger?.closest('[role="dialog"]')?.parentElement ?? undefined}
      aria-label={`Preview ${fileKey}`}
    >
      <TearsheetHeader title={fileKey.split('/').pop() ?? fileKey} />
      <TearsheetBody>
        {query.isFetching ? (
          <Spinner aria-label="Sampling file" />
        ) : query.error ? (
          <DatasetSamplingError
            error={query.error}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          query.sample && (
            <DatasetSampleTable
              sample={query.sample}
              label={`Preview of ${fileKey}`}
              showRowRange={false}
              initialPerPage={20}
              onRetry={() => {
                void query.refetch();
              }}
            />
          )
        )}
      </TearsheetBody>
    </Tearsheet>
  );
}
