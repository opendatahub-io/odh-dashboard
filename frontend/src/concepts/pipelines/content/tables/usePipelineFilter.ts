/* eslint-disable camelcase */
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PipelinesFilterOp, PipelinesFilterPredicate } from '~/concepts/pipelines/kfTypes';

import { PipelinesFilter } from '~/concepts/pipelines/types';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import FilterToolbar from '~/components/FilterToolbar';

export enum FilterOptions {
  NAME = 'name',
  CREATED_AT = 'create_at',
  STATUS = 'status',
  EXPERIMENT = 'experiment',
  PIPELINE_VERSION = 'pipeline_version',
}

export const getDataValue = (data: string | { value: string } | undefined): string | undefined => {
  if (typeof data === 'string' || typeof data === 'undefined') {
    return data;
  }
  return data.value;
};

export type FilterProps = Pick<
  React.ComponentProps<typeof FilterToolbar>,
  'filterData' | 'onFilterUpdate'
> & { onClearFilters: () => void };

const defaultFilterData: FilterProps['filterData'] = {
  [FilterOptions.NAME]: '',
  [FilterOptions.CREATED_AT]: '',
  [FilterOptions.STATUS]: '',
  [FilterOptions.EXPERIMENT]: undefined,
  [FilterOptions.PIPELINE_VERSION]: '',
};

const usePipelineFilter = (
  setFilter: (filter?: PipelinesFilter) => void,
  initialFilterData?: Partial<FilterProps['filterData']>,
  persistInUrl = false,
): FilterProps => {
  // extract filters set in URL
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [filterData, setFilterData] = React.useState(() => {
    const urlFilterData = {
      ...defaultFilterData,
      ...initialFilterData,
    };

    // console.log(searchParams);

    // Only parse URL search params if useSearchParams is true
    if (persistInUrl) {
      // Parse URL search params into initial filter data
      if (searchParams.has(FilterOptions.NAME)) {
        urlFilterData[FilterOptions.NAME] = searchParams.get(FilterOptions.NAME) || '';
      }
      if (searchParams.has(FilterOptions.CREATED_AT)) {
        urlFilterData[FilterOptions.CREATED_AT] = searchParams.get(FilterOptions.CREATED_AT) || '';
      }
      if (searchParams.has(FilterOptions.STATUS)) {
        urlFilterData[FilterOptions.STATUS] = searchParams.get(FilterOptions.STATUS) || '';
      }
      if (searchParams.has(FilterOptions.EXPERIMENT)) {
        urlFilterData[FilterOptions.EXPERIMENT] = searchParams.get(FilterOptions.EXPERIMENT) || '';
      }
      if (searchParams.has(FilterOptions.PIPELINE_VERSION)) {
        urlFilterData[FilterOptions.PIPELINE_VERSION] =
          searchParams.get(FilterOptions.PIPELINE_VERSION) || '';
      }
    }

    return urlFilterData;
  });

  const toolbarProps: FilterProps = {
    filterData,
    onFilterUpdate: React.useCallback(
      (key, value) => setFilterData((oldValues) => ({ ...oldValues, [key]: value })),
      [],
    ),
    onClearFilters: React.useCallback(() => setFilterData(defaultFilterData), []),
  };

  const doSetFilter = React.useCallback(
    (data: FilterProps['filterData']) => {
      const predicates: PipelinesFilterPredicate[] = [];
      const runName = getDataValue(data[FilterOptions.NAME]);
      const startedDateTime = getDataValue(data[FilterOptions.CREATED_AT]);
      const state = getDataValue(data[FilterOptions.STATUS]);
      const experimentId = getDataValue(data[FilterOptions.EXPERIMENT]);
      const pipelineVersionId = getDataValue(data[FilterOptions.PIPELINE_VERSION]);

      // Build search params
      const urlSearchParams = new URLSearchParams();

      if (runName) {
        predicates.push({
          key: 'name',
          operation: PipelinesFilterOp.IS_SUBSTRING,
          string_value: runName,
        });
        urlSearchParams.set('name', runName);
      }

      if (startedDateTime) {
        predicates.push({
          key: 'created_at',
          operation: PipelinesFilterOp.GREATER_THAN_EQUALS,
          timestamp_value: new Date(startedDateTime).toISOString(),
        });
        urlSearchParams.set('created_at', startedDateTime);
      }

      if (state) {
        predicates.push({
          key: 'state',
          operation: PipelinesFilterOp.EQUALS,
          string_value: state,
        });
        urlSearchParams.set('status', state);
      }

      if (experimentId) {
        predicates.push({
          key: 'experiment_id',
          operation: PipelinesFilterOp.EQUALS,
          string_value: experimentId,
        });
        urlSearchParams.set('experiment', experimentId);
      }

      if (pipelineVersionId) {
        predicates.push({
          key: 'pipeline_version_id',
          operation: PipelinesFilterOp.EQUALS,
          string_value: pipelineVersionId,
        });
        urlSearchParams.set('pipeline_version', pipelineVersionId);
      }

      // Only update URL if useSearchParams is true
      if (persistInUrl) {
        // Get current search params
        const currentSearchParams = new URLSearchParams(window.location.search);

        // Remove any existing filter params
        currentSearchParams.delete('name');
        currentSearchParams.delete('created_at');
        currentSearchParams.delete('status');
        currentSearchParams.delete('experiment');
        currentSearchParams.delete('pipeline_version');

        // Add new filter params
        for (const [key, value] of urlSearchParams.entries()) {
          currentSearchParams.set(key, value);
        }

        navigate(
          {
            pathname: window.location.pathname,
            search: currentSearchParams.toString() ? `?${currentSearchParams.toString()}` : '',
          },
          { replace: true },
        );
      }

      setFilter(
        predicates.length > 0
          ? {
              predicates,
            }
          : undefined,
      );
    },
    [navigate, setFilter, persistInUrl],
  );

  const doSetFilterDebounced = useDebounceCallback(doSetFilter);
  const {
    [FilterOptions.NAME]: name,
    [FilterOptions.CREATED_AT]: createdAt,
    [FilterOptions.STATUS]: state,
    [FilterOptions.PIPELINE_VERSION]: pipelineVersionId,
    [FilterOptions.EXPERIMENT]: experimentId,
  } = filterData;

  React.useEffect(() => {
    doSetFilterDebounced(filterData);
    // debounce filter change for name changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, doSetFilterDebounced]);

  React.useEffect(() => {
    doSetFilterDebounced.cancel();
    doSetFilter(filterData);
    // perform filter change immediately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdAt, state, pipelineVersionId, experimentId, doSetFilter]);

  return toolbarProps;
};

export default usePipelineFilter;
