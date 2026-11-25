import React from 'react';
import { TextInput } from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';
import { DashboardEmptyTableView, TableBase } from '@odh-dashboard/ui-core';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import { ArtifactKF, PipelineArtifactTypeKF } from '#~/concepts/pipelines/kfTypes';
import { FilterValue } from '#~/utilities/useFilters';
import { FilterOptions, columns, options } from './constants';
import ArtifactsTableRow from './ArtifactsTableRow';

interface ArtifactsTableProps {
  artifacts: ArtifactKF[];
  nextPageToken: string | undefined;
  isLoaded: boolean;
  page: number;
  pageSize: number;
  filterData: Record<FilterOptions, string | undefined>;
  onFilterUpdate: (key: FilterOptions, value: FilterValue) => void;
  onClearFilters: () => void;
  onNextPage: (nextPage: number) => void;
  onPreviousPage: (previousPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

export const ArtifactsTable: React.FC<ArtifactsTableProps> = ({
  artifacts,
  isLoaded,
  nextPageToken,
  page,
  pageSize,
  filterData,
  onFilterUpdate,
  onClearFilters,
  onNextPage,
  onPreviousPage,
  onPageSizeChange,
}) => {
  const toolbarContent = React.useMemo(
    () => (
      <FilterToolbar<keyof typeof options>
        filterOptions={options}
        filterOptionRenders={{
          [FilterOptions.Artifact]: ({ onChange, ...props }) => (
            <TextInput
              {...props}
              aria-label="Search artifact name"
              placeholder="Search..."
              onChange={(_event, value) => onChange(value)}
              data-testid="artifact-name-filter-input"
            />
          ),
          [FilterOptions.Id]: ({ onChange, ...props }) => (
            <TextInput
              {...props}
              aria-label="Search ID"
              placeholder="Search..."
              onChange={(_event, value) => onChange(value)}
              data-testid="artifact-id-filter-input"
            />
          ),
          [FilterOptions.Type]: ({ value, onChange, ...props }) => (
            <SimpleSelect
              {...props}
              value={value ?? ''}
              aria-label="Search type"
              options={Object.values(PipelineArtifactTypeKF)
                .filter((type) => type !== PipelineArtifactTypeKF.TYPE_UNSPECIFIED)
                .map(
                  (type, index): SimpleSelectOption => ({
                    key: String(index + 1),
                    label: type,
                  }),
                )}
              onChange={(v) => onChange(v)}
              data-testid="artifact-type-filter-select"
              popperProps={{ maxWidth: undefined }}
            />
          ),
        }}
        filterData={filterData}
        onFilterUpdate={onFilterUpdate}
        data-testid="artifacts-table-toolbar"
      />
    ),
    [filterData, onFilterUpdate],
  );

  return (
    <TableBase
      loading={!isLoaded}
      data={artifacts}
      columns={columns}
      enablePagination="compact"
      page={page}
      perPage={pageSize}
      itemCount={(page - 1) * pageSize + artifacts.length + (nextPageToken ? 1 : 0)}
      onNextClick={(_, nextPage) => onNextPage(nextPage)}
      onPreviousClick={(_, prevPage) => onPreviousPage(prevPage)}
      onSetPage={(_, newPage) => {
        if (newPage < page || !isLoaded) {
          onPreviousPage(newPage);
        }
      }}
      onPerPageSelect={(_, newSize) => onPageSizeChange(newSize)}
      toggleTemplate={() => <>{pageSize} per page </>}
      onClearFilters={onClearFilters}
      toolbarContent={toolbarContent}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      rowRenderer={(artifact) => <ArtifactsTableRow artifact={artifact} />}
      variant={TableVariant.compact}
      data-testid="artifacts-list-table"
      id="artifacts-list-table"
    />
  );
};
