import React from 'react';
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
};

export default function DatasetFilePreview({
  namespace,
  secretName,
  bucket,
  fileKey,
  onClose,
}: DatasetFilePreviewProps): React.JSX.Element {
  const query = useS3GetFileSchemaQuery(namespace, secretName, bucket, fileKey);
  return (
    <Tearsheet isOpen onClose={onClose} aria-label={`Preview ${fileKey}`}>
      <TearsheetHeader title={fileKey.split('/').pop() ?? fileKey} />
      <TearsheetBody>
        {query.isFetching ? (
          <Spinner aria-label="Sampling file" />
        ) : query.error ? (
          <DatasetSamplingError
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
