import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Pagination,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import CompareBenchmarksTable from '~/app/components/compare/CompareBenchmarksTable';
import { useCollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import { useEvaluationJobs } from '~/app/hooks/useEvaluationJobs';
import { EvaluationJob } from '~/app/types';
import { getBenchmarkDisplayName, getEvaluationName } from '~/app/utilities/evaluationUtils';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import {
  COMPARE_RUNS_PAGE_TITLE,
  buildMlflowCompareSearchParams,
  filterJobsForCompareBenchmarkSearch,
  getComparableRunsForJob,
  getBenchmarkSelectionsFromKeys,
  parseCsvParam,
  resolveComparableRunsFromSelections,
} from '~/app/utilities/compareEvaluationsUtils';
import {
  DEFAULT_TABLE_PER_PAGE,
  TABLE_PER_PAGE_OPTIONS,
} from '~/app/utilities/tablePaginationConstants';
import { evaluationCompareRoute, evaluationsBaseRoute } from '~/app/routes';

const ChooseCompareBenchmarksPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { collectionNameMap, loaded: collectionsLoaded } = useCollectionNameMap();

  const selectedJobIds = React.useMemo(
    () => parseCsvParam(searchParams.get('jobIds') ?? ''),
    [searchParams],
  );
  const [allJobs, jobsLoaded, loadError] = useEvaluationJobs({ namespace });
  const loaded = jobsLoaded && collectionsLoaded;

  const selectedJobs = React.useMemo(() => {
    const jobsById = new Map(allJobs.map((job) => [job.resource.id, job]));
    return selectedJobIds
      .map((selectedJobId) => jobsById.get(selectedJobId))
      .filter((job): job is EvaluationJob => Boolean(job));
  }, [allJobs, selectedJobIds]);

  const [selectedBenchmarkKeys, setSelectedBenchmarkKeys] = React.useState<Set<string>>(new Set());
  const [searchText, setSearchText] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_TABLE_PER_PAGE);

  React.useEffect(() => {
    setPage(1);
  }, [searchText, selectedJobs]);

  const filteredJobs = React.useMemo(
    () => filterJobsForCompareBenchmarkSearch(selectedJobs, searchText),
    [searchText, selectedJobs],
  );

  const paginatedJobs = React.useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredJobs.slice(start, start + perPage);
  }, [filteredJobs, page, perPage]);

  const canCompare = selectedBenchmarkKeys.size >= 2;
  const isSearchEmpty = filteredJobs.length === 0 && searchText.trim().length > 0;

  const onCompare = React.useCallback(() => {
    if (!namespace || !canCompare) {
      return;
    }

    const jobsById = new Map(selectedJobs.map((job) => [job.resource.id, job]));
    const selections = getBenchmarkSelectionsFromKeys(selectedBenchmarkKeys);
    const selectedRuns = resolveComparableRunsFromSelections(selectedJobs, selections);

    if (selectedRuns.length < 2) {
      return;
    }

    const totalAvailable = selectedJobs.reduce(
      (sum, job) => sum + getComparableRunsForJob(job).length,
      0,
    );
    const benchmarkNames = [
      ...new Set(selections.map((s) => getBenchmarkDisplayName(s.benchmarkId))),
    ];

    fireMiscTrackingEvent(EVAL_HUB_EVENTS.COMPARE_BENCHMARK_CHOSEN, {
      countOfBenchmarks: selections.length,
      totalAvailable,
      benchmarkNames: JSON.stringify(benchmarkNames),
    });

    navigate({
      pathname: evaluationCompareRoute(namespace),
      search: buildMlflowCompareSearchParams(selectedRuns, (run) => {
        const selectedJob = jobsById.get(run.jobId);
        return selectedJob ? getEvaluationName(selectedJob) : run.jobId;
      }),
    });
  }, [canCompare, namespace, navigate, selectedBenchmarkKeys, selectedJobs]);

  const handleSelectionChange = React.useCallback((selectionKeys: string[], checked: boolean) => {
    setSelectedBenchmarkKeys((prev) => {
      const next = new Set(prev);
      selectionKeys.forEach((selectionKey) => {
        if (checked) {
          next.add(selectionKey);
        } else {
          next.delete(selectionKey);
        }
      });
      return next;
    });
  }, []);

  const handleClearSearch = React.useCallback(() => {
    setSearchText('');
    setPage(1);
  }, []);

  const pagination = (
    <Pagination
      itemCount={filteredJobs.length}
      perPage={perPage}
      page={page}
      onSetPage={(_event, newPage) => setPage(newPage)}
      onPerPageSelect={(_event, newPerPage, newPage) => {
        setPerPage(newPerPage);
        setPage(newPage);
      }}
      perPageOptions={TABLE_PER_PAGE_OPTIONS}
      variant="top"
      widgetId="choose-compare-benchmarks-pagination"
      menuAppendTo="inline"
      titles={{ paginationAriaLabel: 'Compare runs table pagination' }}
    />
  );

  return (
    <ApplicationsPage
      title={COMPARE_RUNS_PAGE_TITLE}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
          />
          <BreadcrumbItem isActive>Choose benchmarks</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      loadError={loadError}
      empty={selectedJobIds.length === 0 || selectedJobs.length < 2}
      emptyMessage="Select at least two runs to choose benchmarks for comparison."
      provideChildrenPadding
    >
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
        <FlexItem>
          <Toolbar
            inset={{ default: 'insetNone' }}
            className="pf-v6-u-w-100"
            clearAllFilters={searchText ? handleClearSearch : undefined}
            data-testid="choose-compare-benchmarks-toolbar"
          >
            <ToolbarContent>
              <ToolbarGroup variant="filter-group">
                <ToolbarItem>
                  <SearchInput
                    aria-label="Search name"
                    placeholder="Search name"
                    value={searchText}
                    onChange={(_event, value) => setSearchText(value)}
                    onClear={() => setSearchText('')}
                    style={{ minWidth: '35ch' }}
                    data-testid="choose-compare-benchmarks-search"
                  />
                </ToolbarItem>
              </ToolbarGroup>
              <ToolbarGroup>
                <ToolbarItem>
                  <Button
                    variant="primary"
                    isDisabled={!canCompare}
                    onClick={onCompare}
                    data-testid="compare-selected-benchmarks-button"
                  >
                    Compare
                  </Button>
                </ToolbarItem>
              </ToolbarGroup>
              <ToolbarItem
                variant="pagination"
                align={{ default: 'alignEnd' }}
                className="pf-v6-u-pr-lg"
              >
                {pagination}
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        </FlexItem>
        <FlexItem>
          {isSearchEmpty ? (
            <DashboardEmptyTableView
              onClearFilters={handleClearSearch}
              variant={EmptyStateVariant.sm}
            />
          ) : (
            <CompareBenchmarksTable
              jobs={paginatedJobs}
              collectionNameMap={collectionNameMap}
              searchText={searchText}
              selectedBenchmarkKeys={selectedBenchmarkKeys}
              onSelectionChange={handleSelectionChange}
            />
          )}
        </FlexItem>
      </Flex>
    </ApplicationsPage>
  );
};

export default ChooseCompareBenchmarksPage;
