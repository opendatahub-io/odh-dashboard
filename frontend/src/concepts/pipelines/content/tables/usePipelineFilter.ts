/* eslint-disable camelcase */
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PipelinesFilterOp, PipelinesFilterPredicate } from '~/concepts/pipelines/kfTypes';

import { PipelinesFilter } from '~/concepts/pipelines/types';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import FilterToolbar from '~/components/FilterToolbar';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunVersionsContext } from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import { PipelineRunExperimentsContext } from '~/pages/pipelines/global/runs/PipelineRunExperimentsContext';

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
  [FilterOptions.PIPELINE_VERSION]: undefined,
};

const usePipelineFilter = (
  setFilter: (filter?: PipelinesFilter) => void,
  initialFilterData?: Partial<FilterProps['filterData']>,
  persistInUrl = false,
): FilterProps => {
  // extract filters set in URL
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { api } = usePipelinesAPI();
  const { versions, loaded: versionsLoaded } = React.useContext(PipelineRunVersionsContext);
  const { experiments, loaded: experimentsLoaded } = React.useContext(
    PipelineRunExperimentsContext,
  );

  const [filterData, setFilterData] = React.useState(() => {
    const urlFilterData = {
      ...defaultFilterData,
      ...initialFilterData,
    };

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

  const experimentLabelUpdateAttempted = React.useRef(false);
  const pipelineVersionLabelUpdateAttempted = React.useRef(false);

  // update labels for experiments and pipeline versions if they are missing on load
  React.useEffect(() => {
    // update experiment label
    if (
      filterData[FilterOptions.EXPERIMENT] &&
      typeof filterData[FilterOptions.EXPERIMENT] === 'string' &&
      !experimentLabelUpdateAttempted.current &&
      experimentsLoaded
    ) {
      const experiment = experiments.find(
        (e) => e.experiment_id === filterData[FilterOptions.EXPERIMENT],
      );
      setFilterData((prev) => ({
        ...prev,
        [FilterOptions.EXPERIMENT]: experiment
          ? {
              value: experiment.experiment_id,
              label: experiment.display_name,
            }
          : undefined,
      }));
      experimentLabelUpdateAttempted.current = true;
    }

    // update pipeline version label
    if (
      filterData[FilterOptions.PIPELINE_VERSION] &&
      typeof filterData[FilterOptions.PIPELINE_VERSION] === 'string' &&
      !pipelineVersionLabelUpdateAttempted.current &&
      versionsLoaded
    ) {
      const pipelineVersion = versions.find(
        (v) => v.pipeline_version_id === filterData[FilterOptions.PIPELINE_VERSION],
      );
      setFilterData((prev) => ({
        ...prev,
        [FilterOptions.PIPELINE_VERSION]: pipelineVersion
          ? {
              value: pipelineVersion.pipeline_version_id,
              label: pipelineVersion.display_name,
            }
          : undefined,
      }));
      pipelineVersionLabelUpdateAttempted.current = true;
    }
  }, [filterData, api, versions, versionsLoaded, experimentsLoaded, experiments]);

  const toolbarProps: FilterProps = {
    filterData,
    onFilterUpdate: React.useCallback(
      (key, value) => setFilterData((oldValues) => ({ ...oldValues, [key]: value })),
      [],
    ),
    onClearFilters: React.useCallback(() => {
      setFilterData(defaultFilterData);
      if (persistInUrl) {
        const currentSearchParams = new URLSearchParams(window.location.search);
        currentSearchParams.delete(FilterOptions.NAME);
        currentSearchParams.delete(FilterOptions.CREATED_AT);
        currentSearchParams.delete(FilterOptions.STATUS);
        currentSearchParams.delete(FilterOptions.EXPERIMENT);
        currentSearchParams.delete(FilterOptions.PIPELINE_VERSION);
        navigate(
          {
            pathname: window.location.pathname,
            search: currentSearchParams.toString(),
          },
          { replace: true },
        );
      }
    }, [persistInUrl, navigate]),
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
        urlSearchParams.set(FilterOptions.NAME, runName);
      } else {
        urlSearchParams.delete(FilterOptions.NAME);
      }

      if (startedDateTime) {
        predicates.push({
          key: 'created_at',
          operation: PipelinesFilterOp.GREATER_THAN_EQUALS,
          timestamp_value: new Date(startedDateTime).toISOString(),
        });
        urlSearchParams.set(FilterOptions.CREATED_AT, startedDateTime);
      } else {
        urlSearchParams.delete(FilterOptions.CREATED_AT);
      }

      if (state) {
        predicates.push({
          key: 'state',
          operation: PipelinesFilterOp.EQUALS,
          string_value: state,
        });
        urlSearchParams.set(FilterOptions.STATUS, state);
      } else {
        urlSearchParams.delete(FilterOptions.STATUS);
      }

      if (experimentId) {
        predicates.push({
          key: 'experiment_id',
          operation: PipelinesFilterOp.EQUALS,
          string_value: experimentId,
        });
        urlSearchParams.set(FilterOptions.EXPERIMENT, experimentId);
      } else {
        urlSearchParams.delete(FilterOptions.EXPERIMENT);
      }

      if (pipelineVersionId) {
        predicates.push({
          key: 'pipeline_version_id',
          operation: PipelinesFilterOp.EQUALS,
          string_value: pipelineVersionId,
        });
        urlSearchParams.set(FilterOptions.PIPELINE_VERSION, pipelineVersionId);
      } else {
        urlSearchParams.delete(FilterOptions.PIPELINE_VERSION);
      }

      // Only update URL if useSearchParams is true
      if (persistInUrl) {
        // Get current search params
        const currentSearchParams = new URLSearchParams(window.location.search);

        // Remove any existing filter params
        currentSearchParams.delete(FilterOptions.NAME);
        currentSearchParams.delete(FilterOptions.CREATED_AT);
        currentSearchParams.delete(FilterOptions.STATUS);
        currentSearchParams.delete(FilterOptions.EXPERIMENT);
        currentSearchParams.delete(FilterOptions.PIPELINE_VERSION);

        // Add new filter params
        for (const [key, value] of urlSearchParams.entries()) {
          currentSearchParams.set(key, value);
        }

        navigate(
          {
            pathname: window.location.pathname,
            search: currentSearchParams.toString(),
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
    [persistInUrl, setFilter, navigate],
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
