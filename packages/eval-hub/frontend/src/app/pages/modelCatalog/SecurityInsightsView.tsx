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
  Pagination,
  PaginationVariant,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { Table, Thead, Tbody, Tr, Th, Td, ThProps } from '@patternfly/react-table';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import useSecurityArtifacts from '~/app/hooks/useSecurityArtifacts';
import {
  DEFAULT_TABLE_PER_PAGE,
  TABLE_PER_PAGE_OPTIONS,
} from '~/app/utilities/tablePaginationConstants';
import { getCategoryColor, capitalizeFirst } from '~/app/components/benchmarkUtils';
import { type SecurityInsightsViewProps } from './securityInsightsTypes';
import {
  type FilterOption,
  type SortConfig,
  FILTER_LABELS,
  FILTER_PLACEHOLDERS,
  getFilterValue,
  getSortableValue,
} from './const';

const SECURITY_ARTIFACTS_PAGE_SIZE = 100;

const SecurityInsightsView: React.FC<SecurityInsightsViewProps> = ({
  sourceId,
  modelName,
  namespace,
}) => {
  const { insights, loaded, loadError } = useSecurityArtifacts(
    sourceId,
    modelName,
    namespace,
    SECURITY_ARTIFACTS_PAGE_SIZE,
  );

  const [perPage, setPerPage] = React.useState(DEFAULT_TABLE_PER_PAGE);

  const [activeFilter, setActiveFilter] = React.useState<FilterOption>('evaluation');
  const [isFilterSelectOpen, setIsFilterSelectOpen] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState('');
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ index: 1, direction: 'asc' });
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(
    () =>
      !filterValue
        ? insights
        : insights.filter((insight) =>
            getFilterValue(insight, activeFilter).includes(filterValue.toLowerCase()),
          ),
    [insights, filterValue, activeFilter],
  );

  const sorted = React.useMemo(() => {
    const asc = filtered.toSorted((a, b) =>
      getSortableValue(a, sortConfig.index).localeCompare(getSortableValue(b, sortConfig.index)),
    );
    return sortConfig.direction === 'desc' ? asc.toReversed() : asc;
  }, [filtered, sortConfig]);

  const paginated = React.useMemo(
    () => sorted.slice(perPage * (page - 1), perPage * page),
    [sorted, page, perPage],
  );

  React.useEffect(() => {
    setPage(1);
  }, [filterValue, activeFilter]);

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: { index: sortConfig.index, direction: sortConfig.direction },
    onSort: (_event, index, direction) => setSortConfig({ index, direction }),
    columnIndex,
  });

  const handleClearFilters = React.useCallback(() => setFilterValue(''), []);

  const handleFilterSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      const key = String(value);
      if (key === 'evaluation' || key === 'category' || key === 'benchmark') {
        setActiveFilter(key);
      }
      setFilterValue('');
      setIsFilterSelectOpen(false);
    },
    [],
  );

  const filterToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsFilterSelectOpen((prev) => !prev)}
      isExpanded={isFilterSelectOpen}
      icon={<FilterIcon />}
      data-testid="security-filter-type-toggle"
    >
      {FILTER_LABELS[activeFilter]}
    </MenuToggle>
  );

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (loadError) {
    return (
      <Alert variant="danger" isInline title="Error loading security insights">
        {loadError.message}
      </Alert>
    );
  }

  return (
    <Flex
      direction={{ default: 'column' }}
      gap={{ default: 'gapLg' }}
      data-testid="security-insights-view"
    >
      <FlexItem>
        <Flex direction={{ default: 'column' }} gap={{ default: 'gapSm' }}>
          <FlexItem>
            <Title headingLevel="h2" size="lg">
              Safety and security insights
            </Title>
          </FlexItem>
          <FlexItem>
            <Content component={ContentVariants.p}>
              Compare safety and security evaluation scores across benchmarks to determine if this
              model is suitable for your use case.
            </Content>
          </FlexItem>
        </Flex>
      </FlexItem>

      <FlexItem>
        <Toolbar clearAllFilters={handleClearFilters} data-testid="security-insights-toolbar">
          <ToolbarContent>
            <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
              <ToolbarGroup variant="filter-group">
                <ToolbarItem>
                  <Select
                    isOpen={isFilterSelectOpen}
                    onSelect={handleFilterSelect}
                    onOpenChange={setIsFilterSelectOpen}
                    toggle={filterToggle}
                    data-testid="security-filter-type-select"
                  >
                    <SelectList>
                      <SelectOption
                        value="evaluation"
                        data-testid="security-filter-option-evaluation"
                      >
                        Evaluation name
                      </SelectOption>
                      <SelectOption value="category" data-testid="security-filter-option-category">
                        Category
                      </SelectOption>
                      <SelectOption
                        value="benchmark"
                        data-testid="security-filter-option-benchmark"
                      >
                        Benchmark
                      </SelectOption>
                    </SelectList>
                  </Select>
                </ToolbarItem>
                <ToolbarItem>
                  <SearchInput
                    aria-label={FILTER_PLACEHOLDERS[activeFilter]}
                    placeholder={FILTER_PLACEHOLDERS[activeFilter]}
                    value={filterValue}
                    onChange={(_event, value) => setFilterValue(value)}
                    onClear={() => setFilterValue('')}
                    data-testid="security-filter-text-field"
                  />
                </ToolbarItem>
              </ToolbarGroup>
            </ToolbarToggleGroup>
            <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
              <Pagination
                itemCount={filtered.length}
                perPage={perPage}
                page={page}
                onSetPage={(_event, newPage) => setPage(newPage)}
                onPerPageSelect={(_event, newPerPage, newPage) => {
                  setPerPage(newPerPage);
                  setPage(newPage);
                }}
                perPageOptions={TABLE_PER_PAGE_OPTIONS}
                data-testid="security-insights-pagination-top"
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        <Table aria-label="Safety and security insights" data-testid="security-insights-table">
          <Thead>
            <Tr>
              <Th sort={getSortParams(0)} modifier="nowrap">
                Evaluation name
              </Th>
              <Th sort={getSortParams(1)} modifier="nowrap">
                Category
              </Th>
              <Th sort={getSortParams(2)}>Benchmark</Th>
              <Th
                sort={getSortParams(3)}
                modifier="nowrap"
                info={{
                  popover:
                    'The normalized, weighted value of the benchmarks’ primary metric, such as accuracy, speed, or resource efficiency.',
                }}
              >
                Evaluation score
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginated.map((insight) => (
              <Tr
                key={`${insight.benchmarkName}-${insight.evaluation}`}
                data-testid="security-insight-row"
              >
                <Td dataLabel="Evaluation name">{insight.evaluation}</Td>
                <Td dataLabel="Category">
                  {insight.category && (
                    <Label color={getCategoryColor(insight.category)} isCompact>
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
            ))}
          </Tbody>
        </Table>

        <Pagination
          itemCount={filtered.length}
          perPage={perPage}
          page={page}
          variant={PaginationVariant.bottom}
          onSetPage={(_event, newPage) => setPage(newPage)}
          onPerPageSelect={(_event, newPerPage, newPage) => {
            setPerPage(newPerPage);
            setPage(newPage);
          }}
          perPageOptions={TABLE_PER_PAGE_OPTIONS}
          data-testid="security-insights-pagination-bottom"
        />
      </FlexItem>
    </Flex>
  );
};

export default SecurityInsightsView;
