import * as React from 'react';
import {
  Content,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  getResizeObserver,
} from '@patternfly/react-core';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import BorrowingLendingChart from './BorrowingLendingChart';
import useCohorts from '../hooks/useCohorts';
import useBorrowingLendingMetrics, { CQMetricSeries } from '../hooks/useBorrowingLendingMetrics';

const ALL_COHORTS = '__all__';
const NOT_IN_COHORT = '__none__';

const filterSeries = (
  series: CQMetricSeries[],
  selectedCohort: string,
  cqNameFilter: string,
): CQMetricSeries[] => {
  let filtered = series;

  filtered = filtered.filter((s) => {
    if (selectedCohort === ALL_COHORTS) {
      return s.cohortName !== '';
    }
    if (selectedCohort === NOT_IN_COHORT) {
      return s.cohortName === '';
    }
    return s.cohortName === selectedCohort;
  });

  const trimmed = cqNameFilter.trim().toLowerCase();
  if (trimmed) {
    filtered = filtered.filter(
      (s) =>
        s.cqName.toLowerCase().includes(trimmed) || s.cohortName.toLowerCase().includes(trimmed),
    );
  }

  return filtered;
};

const BorrowingLendingSection: React.FC = () => {
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = React.useState(0);

  React.useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) {
      return undefined;
    }
    const handleResize = () => setChartWidth(el.clientWidth);
    const cleanup = getResizeObserver(el, handleResize);
    handleResize();
    return cleanup;
  }, []);

  const [selectedCohort, setSelectedCohort] = React.useState<string>(ALL_COHORTS);
  const [cqNameFilter, setCqNameFilter] = React.useState('');

  const { data: cohorts, loaded: cohortsLoaded } = useCohorts();
  const { series, loaded: metricsLoaded, error } = useBorrowingLendingMetrics(cohorts);

  const cohortSelectOptions = React.useMemo((): SimpleSelectOption[] => {
    const options: SimpleSelectOption[] = [
      { key: ALL_COHORTS, label: 'All cohorts' },
      { key: NOT_IN_COHORT, label: 'Not in a cohort' },
    ];
    cohorts
      .filter((c) => c.state !== 'standalone' && c.name)
      .forEach((c) => {
        options.push({ key: c.name, label: c.name });
      });
    return options;
  }, [cohorts]);

  const visibleSeries = React.useMemo(
    () => filterSeries(series, selectedCohort, cqNameFilter),
    [series, selectedCohort, cqNameFilter],
  );

  // Scope the denominator to the current cohort selection so "Showing X of Y"
  // only counts CQs reachable by the name filter in this view.
  const scopedSeries = React.useMemo(
    () => filterSeries(series, selectedCohort, ''),
    [series, selectedCohort],
  );

  const totalCQCount = scopedSeries.length;
  const visibleCQCount = visibleSeries.length;

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem className="gpuaas-cohort-select-toolbar-item">
            <SimpleSelect
              isFullWidth
              value={selectedCohort}
              onChange={(val) => setSelectedCohort(val)}
              options={cohortSelectOptions}
              isDisabled={!cohortsLoaded}
              toggleProps={{ id: 'borrowing-lending-cohort-select-toggle' }}
              dataTestId="borrowing-lending-cohort-select"
              popperProps={{ maxWidth: undefined }}
            />
          </ToolbarItem>
          <ToolbarItem className="pf-v6-u-flex-grow-1">
            <SearchInput
              aria-label="Filter by cluster queue name"
              className="pf-v6-u-w-100"
              placeholder="Filter by cluster queue name"
              value={cqNameFilter}
              onChange={(_ev, val) => setCqNameFilter(val)}
              onClear={() => setCqNameFilter('')}
              inputProps={{ 'data-testid': 'borrowing-lending-cq-filter' }}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <Content component="small" data-testid="borrowing-lending-count-label">
        {`Showing ${visibleCQCount} of ${totalCQCount} cluster queues`}
      </Content>
      <div ref={chartContainerRef}>
        <BorrowingLendingChart
          series={visibleSeries}
          loaded={metricsLoaded && cohortsLoaded}
          error={error}
          chartWidth={chartWidth}
          containerRef={chartContainerRef}
        />
      </div>
    </>
  );
};

export default BorrowingLendingSection;
