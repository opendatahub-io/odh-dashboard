import * as React from 'react';
import {
  Content,
  FormGroup,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  getResizeObserver,
} from '@patternfly/react-core';
import SimpleSelect, {
  SimpleGroupSelectOption,
  SimpleSelectOption,
} from '@odh-dashboard/ui-core/components/SimpleSelect';

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

  const cohortGroupedOptions = React.useMemo((): SimpleGroupSelectOption[] => {
    const systemOptions: SimpleSelectOption[] = [
      { key: ALL_COHORTS, label: 'All cohorts' },
      { key: NOT_IN_COHORT, label: 'Not in a cohort' },
    ];
    const customCohorts = cohorts
      .filter((c) => c.state !== 'standalone' && c.name)
      .map((c): SimpleSelectOption => ({ key: c.name, label: c.name }));

    const groups: SimpleGroupSelectOption[] = [
      { key: 'system', label: '', options: systemOptions },
    ];
    if (customCohorts.length > 0) {
      groups.push({ key: 'custom', label: 'Single cohort', options: customCohorts });
    }
    return groups;
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
          <ToolbarGroup style={{ width: '100%' }}>
            <ToolbarItem className="gpuaas-cohort-select-toolbar-item">
              <FormGroup
                fieldId="borrowing-lending-cohort-select-toggle"
                label="Cohort"
                style={{ width: '100%' }}
              >
                <SimpleSelect
                  isFullWidth
                  value={selectedCohort}
                  onChange={(val) => setSelectedCohort(val)}
                  groupedOptions={cohortGroupedOptions}
                  isDisabled={!cohortsLoaded}
                  toggleProps={{ id: 'borrowing-lending-cohort-select-toggle' }}
                  dataTestId="borrowing-lending-cohort-select"
                  popperProps={{ maxWidth: undefined }}
                />
              </FormGroup>
            </ToolbarItem>
            <ToolbarItem className="pf-v6-u-flex-grow-1 gpuaas-search-toolbar-item">
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
          </ToolbarGroup>
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
