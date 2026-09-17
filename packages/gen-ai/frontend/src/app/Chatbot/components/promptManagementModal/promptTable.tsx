import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  Button,
  Content,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Pagination,
  PageSection,
  Flex,
  SearchInput,
  Timestamp,
  PaginationVariant,
  TimestampFormat,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  LabelGroup,
  Label,
  Title,
  Tabs,
  Tab,
  TabTitleText,
  Truncate,
  ToolbarFilter,
} from '@patternfly/react-core';
import { SearchIcon, ExclamationCircleIcon, FilterIcon } from '@patternfly/react-icons';
import {
  Table,
  Thead,
  Tr,
  Th,
  ThProps,
  Tbody,
  Td,
  InnerScrollContainer,
} from '@patternfly/react-table';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import { MLflowPrompt, MLflowPromptVersion } from '~/app/types';
import { usePromptsList, usePromptVersions } from './usePromptQueries';
import PromptDrawer from './promptDrawer';

type FilterType = 'name' | 'model';

const filterTypeLabels: Record<FilterType, string> = {
  name: 'Name',
  model: 'Model',
};

const filterTypes: FilterType[] = ['name', 'model'];

type SortDirection = 'asc' | 'desc';

const compareModelNames = (a: MLflowPrompt, b: MLflowPrompt, direction: SortDirection): number => {
  const aName = a.model_config?.model_name;
  const bName = b.model_config?.model_name;
  // Prompts without a model always sort last, regardless of direction
  if (!aName || !bName) {
    return (aName ? 0 : 1) - (bName ? 0 : 1);
  }
  const result = aName.localeCompare(bName);
  return direction === 'asc' ? result : -result;
};

type PromptTableProps = {
  onClickLoad: (prompt: MLflowPromptVersion) => void;
  onClose: () => void;
  displayText: { title: string; description: string };
};

export default function PromptTable({
  onClickLoad,
  onClose,
  displayText,
}: PromptTableProps): React.ReactNode {
  const [perPage, setPerPage] = useState(10);
  const [activePage, setActivePage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<MLflowPrompt | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [filterName, setFilterName] = useState('');
  const [debouncedFilterName, setDebouncedFilterName] = useState('');
  const [activeTabKey, setActiveTabKey] = useState<number>(0);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('name');
  const [filterModel, setFilterModel] = useState<string | null>(null);
  const [modelSortDirection, setModelSortDirection] = useState<SortDirection | undefined>();

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedSetFilterName = useCallback((value: string) => {
    clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedFilterName(value);
      setSelectedRow(null);
      setActivePage(1);
    }, 300);
  }, []);

  const {
    fetchNextPage,
    prompts: rows,
    isLoading: isLoadingList,
    isFetchingNextPage,
    hasNextPage,
    error: listError,
  } = usePromptsList({ maxResults: perPage, filterName: debouncedFilterName });
  const {
    versions: selectedPromptVersions,
    isLoading: isLoadingDetails,
    error,
  } = usePromptVersions(selectedRow?.name ?? null, selectedRow?.scope);

  const projectPrompts = useMemo(() => rows.filter((r) => r.scope?.type === 'project'), [rows]);
  const globalPrompts = useMemo(() => rows.filter((r) => r.scope?.type === 'global'), [rows]);

  const tabRows = activeTabKey === 0 ? projectPrompts : globalPrompts;

  const modelOptions = useMemo<SimpleSelectOption[]>(
    () =>
      Array.from(
        new Set(
          tabRows.map((r) => r.model_config?.model_name).filter((name): name is string => !!name),
        ),
      )
        .toSorted((a, b) => a.localeCompare(b))
        .map((model) => ({
          key: model,
          label: model,
          dataTestId: `prompt-model-filter-option-${model}`,
        })),
    [tabRows],
  );

  const filteredRows = useMemo(() => {
    const rowsForModel = filterModel
      ? tabRows.filter((r) => r.model_config?.model_name === filterModel)
      : tabRows;
    return modelSortDirection
      ? rowsForModel.toSorted((a, b) => compareModelNames(a, b, modelSortDirection))
      : rowsForModel;
  }, [tabRows, filterModel, modelSortDirection]);
  const filteredRowsCount = filteredRows.length;
  const thisPage = filteredRows.slice((activePage - 1) * perPage, activePage * perPage);
  const isDrawerOpen = selectedRow !== null || isLoadingDetails;

  useEffect(() => () => clearTimeout(debounceTimeoutRef.current), []);

  useEffect(() => {
    if (selectedPromptVersions.length > 0) {
      setSelectedVersion(selectedPromptVersions[0].version);
    } else {
      setSelectedVersion(null);
    }
  }, [selectedPromptVersions]);

  useEffect(() => {
    if (error || listError) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch prompts:', error ?? listError);
    }
  }, [error, listError]);

  function handleClearSelectedRow() {
    setSelectedRow(null);
    setSelectedVersion(null);
  }

  function handleVersionChange(version: number) {
    setSelectedVersion(version);
  }

  function handlePerPageSelect(newPerPage: number) {
    setPerPage(newPerPage);
  }

  function handleModelFilterChange(model: string | null) {
    setFilterModel(model);
    setSelectedRow(null);
    setActivePage(1);
  }

  function clearNameFilter() {
    clearTimeout(debounceTimeoutRef.current);
    setFilterName('');
    setDebouncedFilterName('');
    setSelectedRow(null);
    setActivePage(1);
  }

  function clearAllFilters() {
    clearNameFilter();
    handleModelFilterChange(null);
  }

  function getSortParams(columnIndex: number): ThProps['sort'] {
    return {
      sortBy: {
        index: modelSortDirection ? columnIndex : undefined,
        direction: modelSortDirection,
        defaultDirection: 'asc',
      },
      onSort: (_event, _index, direction) => {
        setModelSortDirection(direction);
        setActivePage(1);
      },
      columnIndex,
    };
  }

  function buildFooter() {
    return (
      <ModalFooter>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          style={{ width: '100%', paddingTop: 'var(--pf-t--global--spacer--md)' }}
        >
          <Flex rowGap={{ default: 'rowGapXs' }}>
            <Button
              data-testid="prompt-load-button"
              variant="primary"
              isDisabled={selectedVersion === null || isLoadingDetails}
              onClick={() => {
                const prompt = selectedPromptVersions.find((v) => v.version === selectedVersion);
                if (prompt) {
                  onClickLoad(prompt);
                }
              }}
            >
              {isLoadingDetails ? (
                <>
                  <Spinner size="sm" aria-label="Loading prompt details" /> Loading...
                </>
              ) : (
                'Load in Playground'
              )}
            </Button>
            <Button data-testid="prompt-cancel-button" variant="link" onClick={onClose}>
              Cancel
            </Button>
          </Flex>
        </Flex>
      </ModalFooter>
    );
  }

  function renderPagination(variant: PaginationVariant | 'bottom' | 'top', isCompact: boolean) {
    return (
      <Pagination
        isCompact={isCompact}
        itemCount={filteredRowsCount}
        page={activePage}
        perPage={perPage}
        onSetPage={(_, newPage) => {
          setActivePage(newPage);
          if (hasNextPage && newPage > Math.ceil(rows.length / perPage)) {
            fetchNextPage();
          }
        }}
        onPerPageSelect={(_, newPerPage) => handlePerPageSelect(newPerPage)}
        variant={variant}
        menuAppendTo="inline"
        titles={{
          paginationAriaLabel: `${variant} pagination`,
        }}
      />
    );
  }

  const columns = isDrawerOpen
    ? ['Name', 'Last Modified']
    : ['Name', 'Version', 'Model', 'Last Modified', 'Tags'];

  function renderModelCell(row: MLflowPrompt) {
    const modelName = row.model_config?.model_name;
    if (!modelName) {
      return (
        <>
          <span aria-hidden="true">--</span>
          <span className="pf-v6-screen-reader">No model</span>
        </>
      );
    }
    return <Truncate content={modelName} />;
  }

  function handleRowClick(row: MLflowPrompt) {
    if (selectedRow?.name !== row.name) {
      setSelectedVersion(null);
    }
    setSelectedRow(row);
  }

  const tableToolbar = (
    <Toolbar id="pagination-toolbar" clearAllFilters={clearAllFilters}>
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          <ToolbarItem>
            <Dropdown
              onOpenChange={(isOpen) => setIsFilterDropdownOpen(isOpen)}
              shouldFocusToggleOnSelect
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  data-testid="prompt-filter-type-toggle"
                  aria-label={`Filter by ${filterTypeLabels[filterType]}`}
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  isExpanded={isFilterDropdownOpen}
                  icon={<FilterIcon />}
                >
                  {filterTypeLabels[filterType]}
                </MenuToggle>
              )}
              isOpen={isFilterDropdownOpen}
              popperProps={{ appendTo: 'inline' }}
            >
              <DropdownList>
                {filterTypes.map((type) => (
                  <DropdownItem
                    key={type}
                    id={type}
                    data-testid={`prompt-filter-type-${type}`}
                    onClick={() => {
                      setFilterType(type);
                      setIsFilterDropdownOpen(false);
                    }}
                  >
                    {filterTypeLabels[type]}
                  </DropdownItem>
                ))}
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
          <ToolbarFilter
            labels={debouncedFilterName ? [debouncedFilterName] : []}
            deleteLabel={clearNameFilter}
            deleteLabelGroup={clearNameFilter}
            categoryName={filterTypeLabels.name}
            showToolbarItem={filterType === 'name'}
            style={{ width: '300px' }}
          >
            <SearchInput
              data-testid="prompt-search-input"
              aria-label="Search prompts"
              placeholder="Filter by name"
              value={filterName}
              onChange={(_event, value) => {
                setFilterName(value);
                debouncedSetFilterName(value);
              }}
              onClear={clearNameFilter}
            />
          </ToolbarFilter>
          <ToolbarFilter
            labels={filterModel ? [filterModel] : []}
            deleteLabel={() => handleModelFilterChange(null)}
            deleteLabelGroup={() => handleModelFilterChange(null)}
            categoryName={filterTypeLabels.model}
            showToolbarItem={filterType === 'model'}
            style={{ width: '300px' }}
          >
            <SimpleSelect
              dataTestId="prompt-model-filter-select"
              ariaLabel="Filter by model"
              placeholder={modelOptions.length === 0 ? 'No models available' : 'Filter by model'}
              options={modelOptions}
              value={filterModel ?? undefined}
              onChange={(key) => handleModelFilterChange(key)}
              autoSelectOnlyOption={false}
              isFullWidth
              isScrollable
            />
          </ToolbarFilter>
        </ToolbarGroup>
        <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
          {renderPagination('top', true)}
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );

  let tableContent = null;

  if (isLoadingList || isFetchingNextPage) {
    tableContent = (
      <Flex
        data-testid="prompt-table-loading"
        justifyContent={{ default: 'justifyContentCenter' }}
        style={{ minHeight: '400px' }}
      >
        <Spinner aria-label="Loading prompts" />
      </Flex>
    );
  } else if (listError) {
    tableContent = (
      <EmptyState
        data-testid="prompt-table-error-state"
        titleText="Unable to load prompts"
        icon={ExclamationCircleIcon}
        headingLevel="h4"
        variant={EmptyStateVariant.sm}
      >
        <EmptyStateBody>{listError.message}</EmptyStateBody>
      </EmptyState>
    );
  } else if (thisPage.length === 0) {
    const isGlobalTab = activeTabKey === 1;
    tableContent = (
      <EmptyState
        data-testid={isGlobalTab ? 'global-prompts-empty-state' : 'prompt-table-empty-state'}
        titleText={isGlobalTab ? 'No global prompts available' : 'No prompts found'}
        icon={SearchIcon}
        headingLevel="h4"
        variant={EmptyStateVariant.sm}
      >
        <EmptyStateBody>
          {isGlobalTab
            ? 'Global prompts are starter templates made available by your administrator. No global prompts are currently configured.'
            : 'No saved prompts are available in this project.'}
        </EmptyStateBody>
      </EmptyState>
    );
  } else {
    tableContent = buildBody();
  }

  function buildBody() {
    return (
      <PageSection isFilled aria-label="Paginated table data" style={{ minHeight: '400px' }}>
        <InnerScrollContainer>
          <Table variant="compact" aria-label="Paginated Table" data-testid="prompt-table">
            <Thead>
              <Tr>
                {columns.map((column, columnIndex) => (
                  <Th
                    key={columnIndex}
                    sort={column === 'Model' ? getSortParams(columnIndex) : undefined}
                    data-testid={column === 'Model' ? 'prompt-model-column-header' : undefined}
                  >
                    {column}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {thisPage.map((row, rowIndex) => (
                <Tr
                  key={rowIndex}
                  data-testid={`prompt-table-row-${row.name}`}
                  isClickable
                  isRowSelected={selectedRow?.name === row.name}
                  onClick={() => handleRowClick(row)}
                >
                  <Td dataLabel={columns[0]}>
                    <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                      <div
                        data-testid="prompt-table-row-name"
                        className="pf-v6-u-truncate pf-v6-u-text-color-link gen-ai-prompt-table__name-link"
                      >
                        {row.name}
                      </div>
                      {row.scope?.read_only && (
                        <Label
                          data-testid="read-only-label"
                          isCompact
                          variant="outline"
                          style={{ backgroundColor: 'transparent' }}
                        >
                          Read-only
                        </Label>
                      )}
                    </Flex>
                  </Td>
                  {isDrawerOpen ? (
                    <Td dataLabel={columns[1]}>
                      <Timestamp
                        date={new Date(row.creation_timestamp)}
                        dateFormat={TimestampFormat.full}
                      />
                    </Td>
                  ) : (
                    <>
                      <Td dataLabel={columns[1]}>{row.latest_version}</Td>
                      <Td dataLabel={columns[2]} data-testid="prompt-model-name">
                        {renderModelCell(row)}
                      </Td>
                      <Td dataLabel={columns[3]}>
                        <Timestamp
                          date={new Date(row.creation_timestamp)}
                          dateFormat={TimestampFormat.full}
                        />
                      </Td>
                      <Td dataLabel={columns[4]}>
                        <LabelGroup numLabels={3}>
                          {Object.entries(row.tags ?? {}).map(([key, value]) => (
                            <Label variant="outline" key={key}>{`${key}: ${value}`}</Label>
                          ))}
                        </LabelGroup>
                      </Td>
                    </>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </InnerScrollContainer>
      </PageSection>
    );
  }

  return (
    <Modal isOpen variant="large" onClose={onClose}>
      <ModalHeader>
        <Title headingLevel="h1">{displayText.title}</Title>
        <Content component="p" className="pf-v6-u-text-color-subtle">
          {displayText.description}
        </Content>
      </ModalHeader>
      <ModalBody style={{ height: '40vh', overflow: 'auto' }}>
        <PromptDrawer
          isLoadingDetails={isLoadingDetails}
          selectedPromptVersions={selectedPromptVersions}
          selectedVersion={selectedVersion}
          onVersionChange={handleVersionChange}
          onClose={handleClearSelectedRow}
        >
          <Tabs
            activeKey={activeTabKey}
            onSelect={(_, key) => {
              clearTimeout(debounceTimeoutRef.current);
              const newKey = typeof key === 'number' ? key : Number(key);
              setActiveTabKey(newKey);
              setActivePage(1);
              setSelectedRow(null);
              setFilterName('');
              setDebouncedFilterName('');
              setFilterModel(null);
              setFilterType('name');
              setModelSortDirection(undefined);
              if (newKey === 1) {
                fireMiscTrackingEvent('Playground Global Prompts Tab Viewed', {});
              }
            }}
          >
            <Tab
              eventKey={0}
              title={<TabTitleText>Project prompts</TabTitleText>}
              data-testid="project-prompts-tab"
            >
              {activeTabKey === 0 && (
                <div className="pf-v6-u-mt-lg">
                  {tableToolbar}
                  {tableContent}
                </div>
              )}
            </Tab>
            <Tab
              eventKey={1}
              title={<TabTitleText>Global prompts</TabTitleText>}
              data-testid="global-prompts-tab"
            >
              {activeTabKey === 1 && (
                <div className="pf-v6-u-mt-lg">
                  {tableToolbar}
                  {tableContent}
                </div>
              )}
            </Tab>
          </Tabs>
        </PromptDrawer>
      </ModalBody>
      {buildFooter()}
    </Modal>
  );
}
