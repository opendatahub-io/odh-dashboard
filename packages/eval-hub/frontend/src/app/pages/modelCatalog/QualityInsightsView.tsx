import * as React from 'react';
import {
  Alert,
  Bullseye,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Title,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { Td, ThProps, Tr } from '@patternfly/react-table';
import { TableBase, type SortableData } from '@odh-dashboard/ui-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import useQualityArtifacts from '~/app/hooks/useQualityArtifacts';
import {
  DEFAULT_TABLE_PER_PAGE,
  TABLE_PER_PAGE_OPTIONS,
} from '~/app/utilities/tablePaginationConstants';
import { capitalizeFirst, getCategoryColor } from '~/app/components/benchmarkUtils';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import QualityInsightsEmptyState from './QualityInsightsEmptyState';
import { type QualityInsight, type QualityInsightsViewProps } from './qualityInsightsTypes';
import {
  type QualityFilterOption,
  type QualitySortConfig,
  getQualityFilterValue,
  getQualitySortableValue,
  QUALITY_COLUMN_NAMES,
  QUALITY_FILTER_LABELS,
  QUALITY_FILTER_PLACEHOLDERS,
} from './qualityInsightsConst';

const QUALITY_ARTIFACTS_PAGE_SIZE = 100;

const QUALITY_COLUMNS: SortableData<QualityInsight>[] = [
  { field: 'evaluation', label: 'Evaluation', sortable: true, modifier: 'nowrap' },
  { field: 'category', label: 'Category', sortable: true, modifier: 'nowrap' },
  { field: 'benchmarkName', label: 'Benchmark', sortable: true },
  { field: 'score', label: 'Evaluation score', sortable: true, modifier: 'nowrap' },
];

const QualityInsightsView: React.FC<QualityInsightsViewProps> = ({
  sourceId,
  modelName,
  namespace,
}) => {
  const { insights, loaded, loadError } = useQualityArtifacts(
    sourceId,
    modelName,
    namespace,
    QUALITY_ARTIFACTS_PAGE_SIZE,
  );

  const [perPage, setPerPage] = React.useState(DEFAULT_TABLE_PER_PAGE);
  const [activeFilter, setActiveFilter] = React.useState<QualityFilterOption>('evaluation');
  const [isFilterSelectOpen, setIsFilterSelectOpen] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState('');
  const [sortConfig, setSortConfig] = React.useState<QualitySortConfig>({
    index: 1,
    direction: 'asc',
  });
  const [page, setPage] = React.useState(1);
  const viewTrackedRef = React.useRef(false);
  const filteredRef = React.useRef<typeof insights>([]);

  const filtered = React.useMemo(() => {
    const result = !filterValue
      ? insights
      : insights.filter((insight) =>
          getQualityFilterValue(insight, activeFilter).includes(filterValue.toLowerCase()),
        );
    filteredRef.current = result;
    return result;
  }, [insights, filterValue, activeFilter]);

  const sorted = React.useMemo(() => {
    const asc = filtered.toSorted((a, b) => {
      const aValue = getQualitySortableValue(a, sortConfig.index);
      const bValue = getQualitySortableValue(b, sortConfig.index);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue;
      }

      return String(aValue ?? '').localeCompare(String(bValue ?? ''));
    });
    return sortConfig.direction === 'desc' ? asc.toReversed() : asc;
  }, [filtered, sortConfig]);

  const paginated = React.useMemo(
    () => sorted.slice(perPage * (page - 1), perPage * page),
    [sorted, page, perPage],
  );

  React.useEffect(() => {
    setPage(1);
  }, [filterValue, activeFilter]);

  React.useEffect(() => {
    if (loaded && !viewTrackedRef.current) {
      viewTrackedRef.current = true;
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.QUALITY_INSIGHTS_VIEWED, {
        sourceId,
        modelName,
        insightCount: insights.length,
      });
    }
  }, [loaded, sourceId, modelName, insights.length]);

  React.useEffect(() => {
    if (!filterValue) {
      return undefined;
    }
    const timer = setTimeout(() => {
      const currentFiltered = filteredRef.current;
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.QUALITY_INSIGHTS_FILTER_APPLIED, {
        filterType: activeFilter,
        hasResults: currentFiltered.length > 0,
        resultCount: currentFiltered.length,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [filterValue, activeFilter]);

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: { index: sortConfig.index, direction: sortConfig.direction },
    onSort: (_event, index, direction) => {
      setSortConfig({ index, direction });
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.QUALITY_INSIGHTS_SORT_CHANGED, {
        column: QUALITY_COLUMN_NAMES[index] ?? String(index),
        direction,
      });
    },
    columnIndex,
  });

  const handleFilterSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      const key = String(value);
      if (key === 'evaluation' || key === 'category' || key === 'benchmark') {
        if (key !== activeFilter) {
          fireMiscTrackingEvent(EVAL_HUB_EVENTS.QUALITY_INSIGHTS_FILTER_TYPE_CHANGED, {
            previousFilterType: activeFilter,
            newFilterType: key,
          });
        }
        setActiveFilter(key);
      }
      setFilterValue('');
      setIsFilterSelectOpen(false);
    },
    [activeFilter],
  );

  const filterToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsFilterSelectOpen((prev) => !prev)}
      isExpanded={isFilterSelectOpen}
      icon={<FilterIcon />}
      data-testid="quality-filter-type-toggle"
    >
      {QUALITY_FILTER_LABELS[activeFilter]}
    </MenuToggle>
  );

  const handleClearFilters = React.useCallback(() => setFilterValue(''), []);

  if (loadError) {
    return (
      <Alert variant="danger" isInline title="Error loading quality insights">
        {loadError.message}
      </Alert>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (insights.length === 0) {
    return <QualityInsightsEmptyState />;
  }

  return (
    <Flex
      direction={{ default: 'column' }}
      gap={{ default: 'gapLg' }}
      data-testid="quality-insights-view"
    >
      <FlexItem>
        <Flex direction={{ default: 'column' }} gap={{ default: 'gapSm' }}>
          <FlexItem>
            <Title headingLevel="h2" size="lg">
              Quality insights
            </Title>
          </FlexItem>
          <FlexItem>
            <Content component={ContentVariants.p}>
              Evaluation results from EvalHub showing model performance across benchmarks and
              categories.
            </Content>
          </FlexItem>
        </Flex>
      </FlexItem>

      <FlexItem>
        <TableBase
          aria-label="Quality insights"
          data-testid="quality-insights-table"
          data={paginated}
          columns={QUALITY_COLUMNS}
          getColumnSort={getSortParams}
          enablePagination
          itemCount={filtered.length}
          page={page}
          perPage={perPage}
          perPageOptions={TABLE_PER_PAGE_OPTIONS}
          onClearFilters={handleClearFilters}
          toolbarContent={
            <ToolbarGroup variant="filter-group">
              <ToolbarItem>
                <Select
                  isOpen={isFilterSelectOpen}
                  onSelect={handleFilterSelect}
                  onOpenChange={setIsFilterSelectOpen}
                  toggle={filterToggle}
                  data-testid="quality-filter-type-select"
                >
                  <SelectList>
                    <SelectOption value="evaluation" data-testid="quality-filter-option-evaluation">
                      Evaluation name
                    </SelectOption>
                    <SelectOption value="category" data-testid="quality-filter-option-category">
                      Category
                    </SelectOption>
                    <SelectOption value="benchmark" data-testid="quality-filter-option-benchmark">
                      Benchmark
                    </SelectOption>
                  </SelectList>
                </Select>
              </ToolbarItem>
              <ToolbarItem>
                <SearchInput
                  aria-label={QUALITY_FILTER_PLACEHOLDERS[activeFilter]}
                  placeholder={QUALITY_FILTER_PLACEHOLDERS[activeFilter]}
                  value={filterValue}
                  onChange={(_event, value) => setFilterValue(value)}
                  onClear={() => setFilterValue('')}
                  data-testid="quality-filter-text-field"
                />
              </ToolbarItem>
            </ToolbarGroup>
          }
          onSetPage={(_event, newPage) => {
            setPage(newPage);
            fireMiscTrackingEvent(EVAL_HUB_EVENTS.QUALITY_INSIGHTS_PAGINATION_CHANGED, {
              page: newPage,
              perPage,
              totalItems: filtered.length,
            });
          }}
          onPerPageSelect={(_event, newPerPage, newPage) => {
            setPerPage(newPerPage);
            setPage(newPage);
            fireMiscTrackingEvent(EVAL_HUB_EVENTS.QUALITY_INSIGHTS_PAGINATION_CHANGED, {
              page: newPage,
              perPage: newPerPage,
              totalItems: filtered.length,
            });
          }}
          rowRenderer={(insight, index) => (
            <Tr
              key={`${insight.benchmarkName}-${insight.evaluation}-${index}`}
              data-testid="quality-insight-row"
            >
              <Td dataLabel="Evaluation">{insight.evaluation}</Td>
              <Td dataLabel="Category">
                {insight.category && (
                  <Label color={getCategoryColor(insight.category)}>
                    {capitalizeFirst(insight.category)}
                  </Label>
                )}
              </Td>
              <Td dataLabel="Benchmark">
                <TableRowTitleDescription
                  title={insight.benchmarkName}
                  description={insight.benchmarkDescription}
                  truncateDescriptionLines={2}
                />
              </Td>
              <Td dataLabel="Evaluation score">{insight.result}</Td>
            </Tr>
          )}
        />
      </FlexItem>
    </Flex>
  );
};

export default QualityInsightsView;
