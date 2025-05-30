import React from 'react';
import { TextInput } from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';
import { Artifact } from '#~/third_party/mlmd';
import { TableBase } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { ArtifactType } from '#~/concepts/pipelines/kfTypes';
import { useMlmdListContext } from '#~/concepts/pipelines/context';
import FilterToolbar from '#~/components/FilterToolbar';
import { FilterOptions, columns, initialFilterData, options } from './constants';
import ArtifactsTableRow from './ArtifactsTableRow';

interface ArtifactsTableProps {
  artifacts: Artifact[] | null | undefined;
  nextPageToken: string | undefined;
  isLoaded: boolean;
}

export const ArtifactsTable: React.FC<ArtifactsTableProps> = ({
  artifacts,
  isLoaded,
  nextPageToken,
}) => {
  const {
    maxResultSize,
    setFilterQuery,
    setPageToken: setRequestToken,
    setMaxResultSize,
  } = useMlmdListContext(nextPageToken);
  const [page, setPage] = React.useState(1);
  const [filterData, setFilterData] = React.useState(initialFilterData);
  const onClearFilters = React.useCallback(() => setFilterData(initialFilterData), []);
  const [pageTokens, setPageTokens] = React.useState<Record<number, string>>({});

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [],
  );

  const onNextPageClick = React.useCallback(
    (_: React.SyntheticEvent<HTMLButtonElement>, nextPage: number) => {
      if (nextPageToken) {
        setPageTokens((prevTokens) => ({ ...prevTokens, [nextPage]: nextPageToken }));
        setRequestToken(nextPageToken);
        setPage(nextPage);
      }
    },
    [nextPageToken, setRequestToken],
  );

  const onPrevPageClick = React.useCallback(
    (_: React.SyntheticEvent<HTMLButtonElement>, prevPage: number) => {
      if (pageTokens[prevPage]) {
        setRequestToken(pageTokens[prevPage]);
        setPage(prevPage);
      } else {
        setRequestToken(undefined);
      }
    },
    [pageTokens, setRequestToken],
  );

  React.useEffect(() => {
    if (Object.values(filterData).some((filterOption) => !!filterOption)) {
      let filterQuery = '';

      if (filterData[FilterOptions.Artifact]) {
        const artifactNameQuery = `custom_properties.display_name.string_value LIKE '%${encodeURIComponent(
          filterData[FilterOptions.Artifact],
        )}%'`;
        filterQuery += filterQuery.length ? ` AND ${artifactNameQuery}` : artifactNameQuery;
      }

      if (filterData[FilterOptions.Id]) {
        const artifactIdQuery = `id = cast(${filterData[FilterOptions.Id]} as int64)`;
        filterQuery += filterQuery.length ? ` AND ${artifactIdQuery}` : artifactIdQuery;
      }

      if (filterData[FilterOptions.Type]) {
        const artifactTypeQuery = `type LIKE '%${filterData[FilterOptions.Type]}%'`;
        filterQuery += filterQuery.length ? ` AND ${artifactTypeQuery}` : artifactTypeQuery;
      }

      setFilterQuery(filterQuery);
    } else {
      setFilterQuery('');
    }
  }, [filterData, setFilterQuery]);

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
              type="number"
              min={1}
              onChange={(_event, value) => onChange(value)}
              data-testid="artifact-id-filter-input"
            />
          ),
          [FilterOptions.Type]: ({ value, onChange, ...props }) => (
            <SimpleSelect
              {...props}
              value={value ?? ''}
              aria-label="Search type"
              options={Object.values(ArtifactType).map(
                (v): SimpleSelectOption => ({
                  key: v,
                  label: v,
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
      data={artifacts ?? []}
      columns={columns}
      enablePagination="compact"
      page={page}
      perPage={maxResultSize}
      disableItemCount
      onNextClick={onNextPageClick}
      onPreviousClick={onPrevPageClick}
      onSetPage={(_, newPage) => {
        if (newPage < page || !isLoaded) {
          setPage(newPage);
        }
      }}
      onPerPageSelect={(_, newSize) => setMaxResultSize(newSize)}
      toggleTemplate={() => <>{maxResultSize} per page </>}
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
