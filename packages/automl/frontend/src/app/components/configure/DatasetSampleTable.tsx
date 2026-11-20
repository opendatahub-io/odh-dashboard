import React from 'react';
import { TableBase } from '@odh-dashboard/ui-core';
import { Td, Tr } from '@patternfly/react-table';
import { Button, Content, Stack, StackItem } from '@patternfly/react-core';
import type { DatasetSample } from '~/app/hooks/useS3GetFileSchemaQuery';
import './DatasetPreview.scss';

export default function DatasetSampleTable({
  sample,
  label,
  heading,
  highlightedColumns = new Set<string>(),
  compact = false,
  showRowRange = true,
  onRetry,
}: {
  sample: DatasetSample;
  label: string;
  heading?: React.ReactNode;
  highlightedColumns?: Set<string>;
  compact?: boolean;
  showRowRange?: boolean;
  onRetry?: () => void;
}): React.JSX.Element {
  const paginationId = React.useId();
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  if (sample.sampleRows.length === 0) {
    return (
      <Stack hasGutter>
        <StackItem>
          <Content component="p">File preview is unavailable.</Content>
        </StackItem>
        {onRetry && (
          <StackItem>
            <Button variant="link" isInline onClick={onRetry}>
              Try again
            </Button>
          </StackItem>
        )}
      </Stack>
    );
  }
  const rowStart = compact ? 0 : (page - 1) * perPage;
  const rows = sample.sampleRows.slice(rowStart, rowStart + (compact ? 3 : perPage));
  return (
    <div className="automl-dataset-preview pf-v6-u-overflow-auto">
      <TableBase
        aria-label={label}
        caption={
          !compact &&
          (heading || showRowRange) && (
            <>
              {heading}
              {showRowRange && (
                <Content component="small">
                  Previewing rows {rowStart + 1}–{rowStart + rows.length} of{' '}
                  {sample.sampleRows.length}
                </Content>
              )}
            </>
          )
        }
        widgetId={paginationId}
        variant="compact"
        data={rows}
        columns={sample.columns.map((column, index) => ({
          label: column.name,
          field: String(index),
          sortable: false,
          className: highlightedColumns.has(column.name)
            ? 'automl-dataset-preview__mismatch'
            : undefined,
        }))}
        enablePagination={!compact && sample.sampleRows.length > 0}
        showBottomPagination={false}
        itemCount={sample.sampleRows.length}
        page={page}
        perPage={perPage}
        onSetPage={(_event, value) => setPage(value)}
        onPerPageSelect={(_event, value) => {
          setPerPage(value);
          setPage(1);
        }}
        emptyTableView={<Content>No sampled rows are available for this file.</Content>}
        rowRenderer={(row, rowIndex) => (
          <Tr key={rowIndex}>
            {sample.columns.map((column, index) => (
              <Td
                key={`${column.name}-${index}`}
                dataLabel={column.name}
                className={
                  highlightedColumns.has(column.name)
                    ? 'automl-dataset-preview__mismatch'
                    : undefined
                }
              >
                {row[index] || '—'}
              </Td>
            ))}
          </Tr>
        )}
      />
    </div>
  );
}
