import React from 'react';
import {
  Bullseye,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  SearchInput,
  Skeleton,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { Table, Thead, Tbody, Tr, Th, Td, type ThProps } from '@patternfly/react-table';
import { useS3GetFileSchemaQuery, type ColumnSchema } from '~/app/hooks/useS3GetFileSchemaQuery';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import {
  buildModelSchema,
  buildSamplePayload,
  formatColumnType,
  formatSamplePayloadJson,
  getTargetColumn,
  type ModelSchemaRow,
} from '~/app/utilities/modelSchemaUtils';

type SortColumn = 'position' | 'name' | 'type';

const sortRows = (rows: ModelSchemaRow[], column: SortColumn, direction: 'asc' | 'desc') => {
  const mult = direction === 'asc' ? 1 : -1;
  return rows.toSorted((a, b) => {
    if (column === 'name') {
      return mult * a.name.localeCompare(b.name);
    }
    if (column === 'position') {
      return mult * (a.position - b.position);
    }
    return mult * formatColumnType(a.dtype).localeCompare(formatColumnType(b.dtype));
  });
};

const ModelSchemaTab: React.FC<TabContentProps> = ({
  namespace,
  model,
  taskType,
  parameters,
  featureImportance,
  backTesting,
  isArtifactsLoading,
  print,
}) => {
  const [searchValue, setSearchValue] = React.useState('');
  // Default sort is by position ascending, which is training-data column order — the order
  // to use when constructing positional scoring requests. Sorting by position again after
  // sorting by name/type restores the original order.
  const [sortColumn, setSortColumn] = React.useState<SortColumn>('position');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  // Table and scoring-request template are switched with a toggle group;
  // the table is the default view.
  const [activeTab, setActiveTab] = React.useState<'table' | 'json'>('table');

  // model.json's inference.input_data_schema is the authoritative source for column names,
  // data types, and order — the model's actual serving contract. It is absent in older
  // model.json files, in which case the training CSV schema is fetched from S3 as a fallback
  // (the query is disabled when the input schema is present, so no fetch happens).
  const inputFields = model.inference?.input_data_schema?.instances?.fields;
  const hasInputSchema = Boolean(inputFields?.length);

  // Column schema of the training CSV — fallback source for dtypes and order; the location
  // and the target column come from the run parameters, both already available to this tab.
  const schemaQuery = useS3GetFileSchemaQuery(
    namespace,
    hasInputSchema ? undefined : parameters?.train_data_secret_name,
    hasInputSchema ? undefined : parameters?.train_data_bucket_name,
    hasInputSchema ? undefined : parameters?.train_data_file_key,
  );

  // Feature importance (tabular) resolves which columns AutoGluon actually used;
  // back-testing data (timeseries) carries the authoritative target/id/timestamp columns.
  const isLoading = schemaQuery.isLoading || Boolean(isArtifactsLoading);
  const columns: ColumnSchema[] = React.useMemo(() => schemaQuery.data ?? [], [schemaQuery.data]);

  const rows = React.useMemo(
    () =>
      buildModelSchema(columns, taskType, parameters, featureImportance, backTesting, inputFields),
    [columns, taskType, parameters, featureImportance, backTesting, inputFields],
  );

  const payloadJson = React.useMemo(
    () => formatSamplePayloadJson(buildSamplePayload(rows)),
    [rows],
  );

  const targetColumn = getTargetColumn(taskType, parameters, backTesting);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortBy = {
    index: sortColumn === 'position' ? 0 : sortColumn === 'name' ? 1 : 2,
    direction: sortDirection,
  };

  const positionSortParams: ThProps['sort'] = {
    sortBy,
    onSort: () => handleSort('position'),
    columnIndex: 0,
  };

  const nameSortParams: ThProps['sort'] = {
    sortBy,
    onSort: () => handleSort('name'),
    columnIndex: 1,
  };

  const typeSortParams: ThProps['sort'] = {
    sortBy,
    onSort: () => handleSort('type'),
    columnIndex: 2,
  };

  if (isLoading) {
    return (
      <Table aria-label="Model schema loading" variant="compact" gridBreakPoint="">
        <Thead>
          <Tr>
            <Th sort={positionSortParams} className="automl-model-schema-position-header">
              Order
            </Th>
            <Th sort={nameSortParams}>Column name</Th>
            <Th sort={typeSortParams}>Data type</Th>
            <Th>Role</Th>
          </Tr>
        </Thead>
        <Tbody>
          {Array.from({ length: 5 }, (_, i) => (
            <Tr key={i}>
              <Td>
                <Skeleton width="40%" />
              </Td>
              <Td>
                <Skeleton width="60%" />
              </Td>
              <Td>
                <Skeleton width="40%" />
              </Td>
              <Td>
                <Skeleton width="40%" />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    );
  }

  if (schemaQuery.isError) {
    return (
      <Bullseye>
        <EmptyState
          variant={EmptyStateVariant.sm}
          titleText="Unable to load model schema"
          data-testid="model-schema-error-empty-state"
        >
          <EmptyStateBody>
            {`The training data schema could not be loaded.${
              schemaQuery.error instanceof Error ? ` ${schemaQuery.error.message}` : ''
            }`}
          </EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  const hasSchemaData = rows.length > 0;

  const matching = hasSchemaData
    ? rows.filter((row) => row.name.toLowerCase().includes(searchValue.toLowerCase()))
    : [];
  const filtered = sortRows(matching, sortColumn, sortDirection);

  // The table renders even without schema data so the no-data empty state stays reachable.
  const tableContent = (
    <>
      {/* Native table layout: PF's default gridBreakPoint="gridMd" uses display:grid
        below the md container width, which Firefox cannot print. Feature summary
        opts out the same way. */}
      <Table
        aria-label="Model schema"
        variant="compact"
        className="automl-model-schema-table"
        gridBreakPoint=""
      >
        <Thead>
          <Tr>
            <Th sort={positionSortParams} className="automl-model-schema-position-header">
              Order
            </Th>
            <Th sort={nameSortParams}>Column name</Th>
            <Th sort={typeSortParams}>Data type</Th>
            <Th>Role</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filtered.length === 0 ? (
            <Tr>
              <Td colSpan={4}>
                <Bullseye>
                  {searchValue ? (
                    <EmptyState
                      variant={EmptyStateVariant.sm}
                      icon={SearchIcon}
                      titleText="No matching columns"
                      data-testid="model-schema-search-empty-state"
                    >
                      <EmptyStateBody>
                        No columns match your search. Try adjusting your search criteria.
                      </EmptyStateBody>
                    </EmptyState>
                  ) : (
                    <EmptyState
                      variant={EmptyStateVariant.sm}
                      titleText="No schema data available"
                      data-testid="model-schema-no-data-empty-state"
                    >
                      <EmptyStateBody>
                        The model schema is not available for this model. Training data details were
                        not found in the run parameters.
                      </EmptyStateBody>
                    </EmptyState>
                  )}
                </Bullseye>
              </Td>
            </Tr>
          ) : (
            filtered.map((row) => (
              <Tr
                key={row.name}
                data-testid={`model-schema-row-${row.name}`}
                className={row.isUsed ? undefined : 'automl-model-schema-row--unused'}
              >
                <Td dataLabel="Order">{row.position}</Td>
                <Td dataLabel="Column name">{row.name}</Td>
                <Td dataLabel="Data type">{formatColumnType(row.dtype)}</Td>
                <Td dataLabel="Role">
                  {row.isUsed ? (
                    row.role
                  ) : (
                    <Label variant="outline" data-testid={`model-schema-unused-${row.name}`}>
                      Not used by this model
                    </Label>
                  )}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </>
  );

  const jsonContent = (
    <CodeBlock
      className="automl-model-schema-json-codeblock"
      actions={
        <CodeBlockAction>
          <ClipboardCopyButton
            id="model-schema-json-copy"
            aria-label="Copy model schema JSON to clipboard"
            onClick={() => {
              try {
                void navigator.clipboard.writeText(payloadJson);
              } catch {
                // Clipboard API unavailable (e.g. insecure context) — nothing to do.
              }
            }}
          >
            Copy to clipboard
          </ClipboardCopyButton>
        </CodeBlockAction>
      }
    >
      <CodeBlockCode data-testid="model-schema-json-code">{payloadJson}</CodeBlockCode>
    </CodeBlock>
  );

  return (
    <>
      {hasSchemaData && (
        <p className="automl-model-schema-target-note" data-testid="model-schema-target-note">
          {targetColumn
            ? `Shows input columns and data types required by this model to predict "${targetColumn}".`
            : 'Shows input columns and data types required by this model.'}
        </p>
      )}
      {/* The table is the default view; print (PDF) output shows both contents
          stacked without the toggle-group chrome so neither is hidden behind a view. */}
      {print ? (
        <>
          {tableContent}
          {hasSchemaData && jsonContent}
        </>
      ) : (
        <>
          {/* Toggle group switches between the table and JSON views; the column
              search sits in the same row beside the JSON toggle and only applies
              to the table view. */}
          <Toolbar className="automl-model-schema-toolbar" data-testid="model-schema-view-toolbar">
            <ToolbarContent>
              <ToolbarItem>
                <ToggleGroup aria-label="Model schema view" data-testid="model-schema-view-toggle">
                  <ToggleGroupItem
                    text="Table"
                    buttonId="model-schema-view-table"
                    isSelected={activeTab === 'table'}
                    onChange={() => setActiveTab('table')}
                  />
                  {hasSchemaData && (
                    <ToggleGroupItem
                      text="JSON"
                      buttonId="model-schema-view-json"
                      isSelected={activeTab === 'json'}
                      onChange={() => setActiveTab('json')}
                    />
                  )}
                </ToggleGroup>
              </ToolbarItem>
              {activeTab === 'table' && (
                <ToolbarItem>
                  <SearchInput
                    placeholder="Search by column name"
                    value={searchValue}
                    onChange={(_e, value) => setSearchValue(value)}
                    onClear={() => setSearchValue('')}
                    data-testid="model-schema-search"
                    inputProps={{ 'data-testid': 'model-schema-search-input' }}
                  />
                </ToolbarItem>
              )}
            </ToolbarContent>
          </Toolbar>
          {activeTab === 'table' ? tableContent : jsonContent}
        </>
      )}
    </>
  );
};

export default ModelSchemaTab;
