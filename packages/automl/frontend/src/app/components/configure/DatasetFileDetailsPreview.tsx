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
}: Omit<DatasetFilePreviewProps, 'onClose'> & { onViewFile: () => void }): React.JSX.Element {
  const query = useS3GetFileSchemaQuery(namespace, secretName, bucket, fileKey);
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
              isDisabled={!previewRows || query.isFetching || Boolean(query.error)}
            >
              View file
            </Button>
          </FlexItem>
        </Flex>
        {previewRows > 0 && !query.isFetching && !query.error && (
          <Content component="small">Previewing {previewRows} sampled rows.</Content>
        )}
      </StackItem>
      <StackItem>
        {query.isFetching ? (
          <Spinner size="md" aria-label="Sampling file preview" />
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
              compact
              label={`Sample of ${fileKey}`}
              onRetry={() => {
                void query.refetch();
              }}
            />
          )
        )}
      </StackItem>
    </Stack>
  );
}
