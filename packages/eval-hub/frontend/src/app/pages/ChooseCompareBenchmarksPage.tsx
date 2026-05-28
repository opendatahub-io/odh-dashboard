import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Pagination,
  SearchInput,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import CompareBenchmarksTable from '~/app/components/compare/CompareBenchmarksTable';
import { useCollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import { useEvaluationJobs } from '~/app/hooks/useEvaluationJobs';
import { EvaluationJob } from '~/app/types';
import {
  BenchmarkSelection,
  buildCompareBenchmarksPageTitle,
  filterJobsForCompareBenchmarkSearch,
  getComparableRunsForJob,
  getRunDisplayTitle,
  parseCsvParam,
  serializeMlflowArrayParam,
} from '~/app/utilities/compareEvaluationsUtils';
import { evaluationCompareRoute, evaluationsBaseRoute } from '~/app/routes';

const DEFAULT_PER_PAGE = 20;
const PER_PAGE_OPTIONS = [
  { title: '5', value: 5 },
  { title: '10', value: 10 },
  { title: '20', value: 20 },
];

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

  const pageTitle = React.useMemo(
    () => buildCompareBenchmarksPageTitle(selectedJobs),
    [selectedJobs],
  );

  const [selectedBenchmarkKeys, setSelectedBenchmarkKeys] = React.useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = React.useState('');
  const [searchText, setSearchText] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);

  React.useEffect(() => {
    setPage(1);
  }, [searchText, selectedJobs]);

  const filteredJobMatches = React.useMemo(
    () => filterJobsForCompareBenchmarkSearch(selectedJobs, collectionNameMap, searchText),
    [collectionNameMap, searchText, selectedJobs],
  );

  const paginatedJobMatches = React.useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredJobMatches.slice(start, start + perPage);
  }, [filteredJobMatches, page, perPage]);

  const selectionSummary = React.useMemo(() => {
    const selectedSelections = Array.from(selectedBenchmarkKeys)
      .map((key) => {
        const [jobId, benchmarkId, benchmarkIndexRaw] = key.split('|');
        if (!jobId || !benchmarkId) {
          return null;
        }
        const parsedIndex = benchmarkIndexRaw === '' ? undefined : Number(benchmarkIndexRaw);
        return {
          jobId,
          benchmarkId,
          benchmarkIndex: Number.isFinite(parsedIndex) ? parsedIndex : undefined,
        } satisfies BenchmarkSelection;
      })
      .filter((value): value is BenchmarkSelection => value !== null);

    const selectedJobIdsSet = new Set(selectedSelections.map((selection) => selection.jobId));
    return {
      selectedSelections,
      selectedRunCount: selectedJobIdsSet.size,
    };
  }, [selectedBenchmarkKeys]);

  const canCompare = selectionSummary.selectedRunCount >= 2;
  const isSearchEmpty = filteredJobMatches.length === 0 && searchText.trim().length > 0;

  const onCompare = React.useCallback(() => {
    if (!namespace || !canCompare) {
      return;
    }

    const jobsById = new Map(selectedJobs.map((job) => [job.resource.id, job]));

    const selectedRuns = selectionSummary.selectedSelections
      .map((selection) => {
        const selectedJob = jobsById.get(selection.jobId);
        if (!selectedJob) {
          return null;
        }

        const matchingComparableRun = getComparableRunsForJob(selectedJob).find(
          (run) =>
            run.benchmarkId === selection.benchmarkId &&
            (selection.benchmarkIndex === undefined ||
              run.benchmarkIndex === selection.benchmarkIndex),
        );

        if (!matchingComparableRun) {
          return null;
        }

        return {
          ...matchingComparableRun,
          jobId: selection.jobId,
        };
      })
      .filter((run): run is NonNullable<typeof run> => run !== null);

    if (selectedRuns.length < 2) {
      return;
    }

    const search = new URLSearchParams();
    search.set('runs', serializeMlflowArrayParam(selectedRuns.map((run) => run.runUuid)));
    search.set(
      'experiments',
      serializeMlflowArrayParam(selectedRuns.map((run) => run.experimentId)),
    );
    search.set(
      'names',
      serializeMlflowArrayParam(
        Array.from(
          new Set(
            selectedRuns.map((run) => {
              const selectedJob = jobsById.get(run.jobId);
              return selectedJob ? getRunDisplayTitle(selectedJob) : run.jobId;
            }),
          ),
        ),
      ),
    );
    navigate({
      pathname: evaluationCompareRoute(namespace),
      search: search.toString(),
    });
  }, [canCompare, namespace, navigate, selectedJobs, selectionSummary.selectedSelections]);

  const updateBenchmarkSelection = React.useCallback(
    (selectionKeys: string[], checked: boolean) => {
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
    },
    [],
  );

  const handleBenchmarkSelectionChange = React.useCallback(
    (selectionKey: string, checked: boolean) => {
      updateBenchmarkSelection([selectionKey], checked);
    },
    [updateBenchmarkSelection],
  );

  const handleRunBenchmarksSelectionChange = React.useCallback(
    (selectionKeys: string[], checked: boolean) => {
      updateBenchmarkSelection(selectionKeys, checked);
    },
    [updateBenchmarkSelection],
  );

  const handleSelectAllChange = React.useCallback(
    (selectionKeys: string[], checked: boolean) => {
      updateBenchmarkSelection(selectionKeys, checked);
    },
    [updateBenchmarkSelection],
  );

  const handleClearSearch = React.useCallback(() => {
    setSearchInput('');
    setSearchText('');
    setPage(1);
  }, []);

  const pagination = (
    <Pagination
      itemCount={filteredJobMatches.length}
      perPage={perPage}
      page={page}
      onSetPage={(_event, newPage) => setPage(newPage)}
      onPerPageSelect={(_event, newPerPage, newPage) => {
        setPerPage(newPerPage);
        setPage(newPage);
      }}
      perPageOptions={PER_PAGE_OPTIONS}
      isCompact
    />
  );

  return (
    <ApplicationsPage
      title={pageTitle}
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
          <Title headingLevel="h2" size="xl" data-testid="choose-compare-benchmarks-subtitle">
            Choose benchmarks to compare
          </Title>
        </FlexItem>
        <FlexItem>
          <Toolbar data-testid="choose-compare-benchmarks-toolbar-top">
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  placeholder="Search by name"
                  value={searchInput}
                  onChange={(_event, value) => setSearchInput(value)}
                  onSearch={(_event, value) => setSearchText(value)}
                  onClear={handleClearSearch}
                  data-testid="choose-compare-benchmarks-search"
                />
              </ToolbarItem>
              <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
                {pagination}
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        </FlexItem>
        <FlexItem>
          {isSearchEmpty ? (
            <Bullseye>
              <EmptyState
                headingLevel="h2"
                titleText="No results found"
                variant={EmptyStateVariant.sm}
                data-testid="choose-compare-benchmarks-empty-filter"
                icon={SearchIcon}
              >
                <EmptyStateBody>Adjust your search and try again.</EmptyStateBody>
                <EmptyStateFooter>
                  <Button
                    variant="link"
                    onClick={handleClearSearch}
                    data-testid="choose-compare-benchmarks-clear-search"
                  >
                    Clear search
                  </Button>
                </EmptyStateFooter>
              </EmptyState>
            </Bullseye>
          ) : (
            <CompareBenchmarksTable
              jobMatches={paginatedJobMatches}
              collectionNameMap={collectionNameMap}
              selectedBenchmarkKeys={selectedBenchmarkKeys}
              onBenchmarkSelectionChange={handleBenchmarkSelectionChange}
              onRunBenchmarksSelectionChange={handleRunBenchmarksSelectionChange}
              onSelectAllChange={handleSelectAllChange}
            />
          )}
        </FlexItem>
        {!isSearchEmpty ? (
          <FlexItem>
            <Toolbar data-testid="choose-compare-benchmarks-toolbar-bottom">
              <ToolbarContent>
                <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
                  {pagination}
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
          </FlexItem>
        ) : null}
        <FlexItem>
          <Flex spaceItems={{ default: 'spaceItemsMd' }}>
            <FlexItem>
              <Button
                variant="primary"
                isDisabled={!canCompare}
                onClick={onCompare}
                data-testid="compare-selected-benchmarks-button"
              >
                Compare
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                variant="link"
                onClick={() => navigate(evaluationsBaseRoute(namespace))}
                data-testid="choose-compare-benchmarks-cancel"
              >
                Cancel
              </Button>
            </FlexItem>
          </Flex>
        </FlexItem>
      </Flex>
    </ApplicationsPage>
  );
};

export default ChooseCompareBenchmarksPage;
