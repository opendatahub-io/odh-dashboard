import React from 'react';
import { flushSync } from 'react-dom';
import { Flex, Spinner } from '@patternfly/react-core';
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
  const hasSample = Boolean(query.sample?.columns.length && query.sample.sampleRows.length);
  let loadingMessage = 'Sampling file preview…';
  if (query.isPaused) {
    loadingMessage = 'Waiting for connection…';
  } else if (hasSample) {
    loadingMessage = 'Refreshing file preview…';
  }
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
        {(query.isPaused || query.isFetching) && (
          <Flex alignItems={{ default: 'alignItemsCenter' }} role="status">
            <Spinner size="sm" aria-label="Sampling file" />
            <span>{loadingMessage}</span>
          </Flex>
        )}
        {query.error && (
          <DatasetSamplingError
            error={query.error}
            isRetrying={query.isFetching}
            onRetry={() => {
              void query.refetch();
            }}
          />
        )}
        {query.sample && (hasSample || (!query.isFetching && !query.isPaused && !query.error)) && (
          <DatasetSampleTable
            sample={query.sample}
            label={`Preview of ${fileKey}`}
            showRowRange={false}
            initialPerPage={20}
            onRetry={() => {
              void query.refetch();
            }}
          />
        )}
      </TearsheetBody>
    </Tearsheet>
  );
}
