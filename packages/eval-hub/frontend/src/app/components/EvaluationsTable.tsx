import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  MenuToggle,
  MenuToggleElement,
  Pagination,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon, SearchIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, ThProps } from '@patternfly/react-table';
import { EvaluationJob } from '~/app/types';
import { getEvaluationName, getBenchmarkName } from '~/app/utilities/evaluationUtils';
import EvaluationsTableRow from './EvaluationsTableRow';

const DEFAULT_PER_PAGE = 20;
const PER_PAGE_OPTIONS = [
  { title: '5', value: 5 },
  { title: '10', value: 10 },
  { title: '20', value: 20 },
];

type FilterOption = 'name' | 'benchmark' | 'type';

const FILTER_LABELS: Record<FilterOption, string> = {
  name: 'Evaluation name',
  benchmark: 'Collection/Benchmark',
  type: 'Type',
};

const FILTER_PLACEHOLDERS: Record<FilterOption, string> = {
  name: 'Find by evaluation name',
  benchmark: 'Find by collection/benchmark',
  type: 'Find by type',
};

type SortConfig = {
  index: number;
  direction: 'asc' | 'desc';
};

const getSortableValue = (job: EvaluationJob, columnIndex: number): string | number => {
  switch (columnIndex) {
    case 0:
      return getEvaluationName(job).toLowerCase();
    case 1:
      return job.status.state;
    case 4:
      return job.resource.created_at ? new Date(job.resource.created_at).getTime() : 0;
    default:
      return '';
  }
};

const getFilterValue = (job: EvaluationJob, filterType: FilterOption): string => {
  switch (filterType) {
    case 'name':
      return getEvaluationName(job).toLowerCase();
    case 'benchmark':
      return getBenchmarkName(job).toLowerCase();
    case 'type':
      return job.model.name.toLowerCase();
    default:
      return '';
  }
};

type EvaluationsTableProps = {
  evaluations: EvaluationJob[];
  loaded: boolean;
};

const EvaluationsTable: React.FC<EvaluationsTableProps> = ({ evaluations, loaded }) => {
  const [activeFilter, setActiveFilter] = React.useState<FilterOption>('name');
  const [filterValue, setFilterValue] = React.useState('');
  const [isFilterSelectOpen, setIsFilterSelectOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    index: 4,
    direction: 'desc',
  });

  const filteredEvaluations = React.useMemo(
    () =>
      evaluations.filter((job) => {
        if (!filterValue) {
          return true;
        }
        return getFilterValue(job, activeFilter).includes(filterValue.toLowerCase());
      }),
    [evaluations, filterValue, activeFilter],
  );

  const sortedEvaluations = React.useMemo(() => {
    const sorted = [...filteredEvaluations].toSorted((a, b) => {
      const aVal = getSortableValue(a, sortConfig.index);
      const bVal = getSortableValue(b, sortConfig.index);
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      return String(aVal).localeCompare(String(bVal));
    });
    return sortConfig.direction === 'desc' ? sorted.reverse() : sorted;
  }, [filteredEvaluations, sortConfig]);

  const paginatedEvaluations = React.useMemo(
    () => sortedEvaluations.slice(perPage * (page - 1), perPage * page),
    [sortedEvaluations, page, perPage],
  );

  React.useEffect(() => {
    setPage(1);
  }, [filterValue, activeFilter]);

  const handleClearFilters = React.useCallback(() => {
    setFilterValue('');
  }, []);

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: sortConfig.index,
      direction: sortConfig.direction,
    },
    onSort: (_event, index, direction) => {
      setSortConfig({ index, direction });
    },
    columnIndex,
  });

  if (!loaded) {
    return null;
  }

  const hasFilters = filterValue.length > 0;
  const isEmpty = filteredEvaluations.length === 0 && hasFilters;

  const filterToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsFilterSelectOpen((prev) => !prev)}
      isExpanded={isFilterSelectOpen}
      icon={<FilterIcon />}
      data-testid="filter-type-toggle"
    >
      {FILTER_LABELS[activeFilter]}
    </MenuToggle>
  );

  return (
    <>
      <Toolbar clearAllFilters={handleClearFilters} data-testid="evaluations-table-toolbar">
        <ToolbarContent>
          <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
            <ToolbarGroup variant="filter-group">
              <ToolbarItem>
                <Select
                  isOpen={isFilterSelectOpen}
                  onSelect={(_event, value: string | number | undefined) => {
                    const key = String(value);
                    if (key === 'name' || key === 'benchmark' || key === 'type') {
                      setActiveFilter(key);
                    }
                    setFilterValue('');
                    setIsFilterSelectOpen(false);
                  }}
                  onOpenChange={setIsFilterSelectOpen}
                  toggle={filterToggle}
                  data-testid="filter-type-select"
                >
                  <SelectList>
                    <SelectOption value="name" data-testid="filter-option-name">
                      Evaluation name
                    </SelectOption>
                    <SelectOption value="benchmark" data-testid="filter-option-benchmark">
                      Collection/Benchmark
                    </SelectOption>
                    <SelectOption value="type" data-testid="filter-option-type">
                      Type
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
                  data-testid="filter-toolbar-text-field"
                />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarToggleGroup>
          <ToolbarGroup>
            <ToolbarItem>
              <Button variant="primary" data-testid="create-evaluation-button">
                New evaluation
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
            <Pagination
              itemCount={filteredEvaluations.length}
              perPage={perPage}
              page={page}
              onSetPage={(_event, newPage) => setPage(newPage)}
              onPerPageSelect={(_event, newPerPage, newPage) => {
                setPerPage(newPerPage);
                setPage(newPage);
              }}
              perPageOptions={PER_PAGE_OPTIONS}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {isEmpty ? (
        <Bullseye>
          <EmptyState
            headingLevel="h2"
            titleText="No results found"
            variant={EmptyStateVariant.sm}
            data-testid="evaluations-empty-filter-state"
            icon={SearchIcon}
          >
            <EmptyStateBody>Adjust your filters and try again.</EmptyStateBody>
            <EmptyStateFooter>
              <Button
                variant="link"
                onClick={handleClearFilters}
                data-testid="clear-filters-button"
              >
                Clear all filters
              </Button>
            </EmptyStateFooter>
          </EmptyState>
        </Bullseye>
      ) : (
        <Table aria-label="Evaluations table" data-testid="evaluations-table">
          <Thead>
            <Tr>
              <Th sort={getSortParams(0)} modifier="nowrap">
                Evaluation name
              </Th>
              <Th sort={getSortParams(1)} modifier="nowrap">
                Status
              </Th>
              <Th
                modifier="nowrap"
                info={{
                  tooltip:
                    'The benchmark collection or individual benchmark used for this evaluation',
                }}
              >
                Collection/Benchmark
              </Th>
              <Th
                modifier="nowrap"
                info={{
                  tooltip: 'The type of evaluation performed',
                }}
              >
                Type
              </Th>
              <Th sort={getSortParams(4)} modifier="nowrap">
                Run date
              </Th>
              <Th
                modifier="nowrap"
                info={{
                  tooltip: 'The result score from the evaluation run',
                }}
              >
                Result
              </Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {paginatedEvaluations.map((job, rowIndex) => (
              <EvaluationsTableRow key={job.resource.id} job={job} rowIndex={rowIndex} />
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
};

export default EvaluationsTable;
