import React from 'react';
import { TextInput } from '@patternfly/react-core';
import FilterToolbar from '~/components/FilterToolbar';
import {
  FilterOptions,
  getMlmdExecutionState,
  options,
} from '~/pages/pipelines/global/experiments/executions/const';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { ExecutionStatus, ExecutionType } from '~/concepts/pipelines/kfTypes';
import { useMlmdListContext } from '~/concepts/pipelines/context';

type ExecutionsTableToolbarProps = {
  filterData: Record<FilterOptions, string | undefined>;
  setFilterData: React.Dispatch<React.SetStateAction<Record<FilterOptions, string | undefined>>>;
};

const ExecutionsTableToolbar: React.FC<ExecutionsTableToolbarProps> = ({
  filterData,
  setFilterData,
}) => {
  const { setFilterQuery } = useMlmdListContext();
  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  React.useEffect(() => {
    if (Object.values(filterData).some((filterOption) => !!filterOption)) {
      let filterQuery = '';

      if (filterData[FilterOptions.Execution]) {
        const executionNameQuery = `custom_properties.display_name.string_value LIKE '%${encodeURIComponent(
          filterData[FilterOptions.Execution],
        )}%'`;
        filterQuery += filterQuery.length ? ` AND ${executionNameQuery}` : executionNameQuery;
      }

      if (filterData[FilterOptions.Id]) {
        const executionIdQuery = `id = cast(${filterData[FilterOptions.Id]} as int64)`;
        filterQuery += filterQuery.length ? ` AND ${executionIdQuery}` : executionIdQuery;
      }

      if (filterData[FilterOptions.Type]) {
        const executionTypeQuery = `type LIKE '%${filterData[FilterOptions.Type]}%'`;
        filterQuery += filterQuery.length ? ` AND ${executionTypeQuery}` : executionTypeQuery;
      }
      if (filterData[FilterOptions.Status]) {
        const executionStatusQuery = `cast(last_known_state as int64) = ${getMlmdExecutionState(
          filterData[FilterOptions.Status],
        )}`;
        filterQuery += filterQuery.length ? ` AND ${executionStatusQuery}` : executionStatusQuery;
      }

      setFilterQuery(filterQuery);
    } else {
      setFilterQuery('');
    }
  }, [filterData, setFilterQuery]);

  return (
    <FilterToolbar<keyof typeof options>
      filterOptions={options}
      filterOptionRenders={{
        [FilterOptions.Execution]: ({ onChange, ...props }) => (
          <TextInput
            {...props}
            aria-label="Search execution name"
            placeholder="Search..."
            onChange={(_event, value) => onChange(value)}
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
          />
        ),
        [FilterOptions.Type]: ({ value, onChange, ...props }) => (
          <SimpleSelect
            {...props}
            value={value ?? ''}
            aria-label="Search type"
            options={Object.values(ExecutionType).map(
              (v): SimpleSelectOption => ({
                key: v,
                label: v,
              }),
            )}
            onChange={(v) => onChange(v)}
            popperProps={{ maxWidth: undefined }}
          />
        ),
        [FilterOptions.Status]: ({ value, onChange, ...props }) => (
          <SimpleSelect
            {...props}
            value={value ?? ''}
            aria-label="Search status"
            options={Object.values(ExecutionStatus).map(
              (v): SimpleSelectOption => ({
                key: v,
                label: v,
              }),
            )}
            onChange={(v) => onChange(v)}
            popperProps={{ maxWidth: undefined }}
          />
        ),
      }}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
    />
  );
};

export default ExecutionsTableToolbar;
