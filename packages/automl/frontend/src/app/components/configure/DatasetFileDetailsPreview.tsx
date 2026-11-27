import React from 'react';
import { Button, Content, Flex, FlexItem, Spinner, Stack, StackItem } from '@patternfly/react-core';
import { useS3GetFileSchemaQuery } from '~/app/hooks/useS3GetFileSchemaQuery';
import type { DatasetFilePreviewProps } from './DatasetFilePreview';
import DatasetSampleTable from './DatasetSampleTable';
import DatasetSamplingError from './DatasetSamplingError';

export default function DatasetFileDetailsPreview({
  namespace,
  secretName,
  bucket,
  fileKey,
  onViewFile,
}: Omit<DatasetFilePreviewProps, 'onClose' | 'trigger'> & {
  onViewFile: (event: React.MouseEvent<HTMLButtonElement>) => void;
}): React.JSX.Element {
  const query = useS3GetFileSchemaQuery(namespace, secretName, bucket, fileKey);
  const hasSample = Boolean(query.sample?.columns.length && query.sample.sampleRows.length);
  let loadingMessage = 'Sampling file preview…';
  if (query.isPaused) {
    loadingMessage = 'Waiting for connection…';
  } else if (hasSample) {
    loadingMessage = 'Refreshing file preview…';
  }
  const previewRows = Math.min(3, query.sample?.sampleRows.length ?? 0);
  return (
    <Stack hasGutter>
      <StackItem>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <strong>File preview</strong>
          </FlexItem>
          <FlexItem>
            <Button
              variant="link"
              isInline
              onClick={onViewFile}
              isDisabled={!hasSample || Boolean(query.error)}
            >
              View file
            </Button>
          </FlexItem>
        </Flex>
        {previewRows > 0 && !query.error && (
          <Content component="small">Previewing {previewRows} sampled rows.</Content>
        )}
      </StackItem>
      <StackItem>
        {(query.isPaused || query.isFetching) && (
          <Flex alignItems={{ default: 'alignItemsCenter' }} role="status">
            <Spinner size="sm" aria-label="Sampling file preview" />
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
            compact
            label={`Sample of ${fileKey}`}
            onRetry={() => {
              void query.refetch();
            }}
          />
        )}
      </StackItem>
    </Stack>
  );
}
