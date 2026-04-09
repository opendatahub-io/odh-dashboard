import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Content,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
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
  debounce,
  LabelGroup,
  Label,
  Title,
} from '@patternfly/react-core';
import { SearchIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td, InnerScrollContainer } from '@patternfly/react-table';
import { MLflowPrompt, MLflowPromptVersion } from '~/app/types';
import { usePromptsList, usePromptVersions } from './usePromptQueries';
import PromptDrawer from './promptDrawer';

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

  const debouncedSetFilterName = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedFilterName(value);
        setSelectedRow(null);
      }, 300),
    [],
  );

  const {
    hasNextPage,
    fetchNextPage,
    prompts: rows,
    isLoading: isLoadingList,
    isFetchingNextPage,
    error: listError,
  } = usePromptsList({ maxResults: perPage, filterName: debouncedFilterName });
  const {
    versions: selectedPromptVersions,
    isLoading: isLoadingDetails,
    error,
  } = usePromptVersions(selectedRow?.name ?? null);
  const thisPage = rows.slice((activePage - 1) * perPage, activePage * perPage);
  const isDrawerOpen = selectedRow !== null || isLoadingDetails;

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

  function buildFooter() {
    return (
      <ModalFooter>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          style={{ width: '100%', paddingTop: 'var(--pf-t--global--spacer--md)' }}
        >
          <Flex rowGap={{ default: 'rowGapXs' }}>
            <Button
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
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
          </Flex>
          {!isDrawerOpen && renderPagination('bottom', false)}
        </Flex>
      </ModalFooter>
    );
  }

  function renderPagination(variant: PaginationVariant | 'bottom' | 'top', isCompact: boolean) {
    return (
      <Pagination
        isStatic
        isCompact={isCompact}
        itemCount={hasNextPage ? rows.length + 1 : rows.length}
        page={activePage}
        perPage={perPage}
        onSetPage={(_, newPage) => {
          setActivePage(newPage);
          if (newPage > rows.length / perPage) {
            fetchNextPage();
          }
        }}
        onPerPageSelect={(_, newPerPage) => handlePerPageSelect(newPerPage)}
        variant={variant}
        titles={{
          paginationAriaLabel: `${variant} pagination`,
        }}
        style={{ backgroundColor: 'inherit' }}
      />
    );
  }

  const columns = isDrawerOpen ? ['Name', 'Version'] : ['Name', 'Version', 'Last Modified', 'Tags'];

  function handleRowClick(row: MLflowPrompt) {
    if (selectedRow?.name !== row.name) {
      setSelectedVersion(null);
    }
    setSelectedRow(row);
  }

  const tableToolbar = (
    <Toolbar id="pagination-toolbar">
      <ToolbarContent>
        <ToolbarItem style={{ minWidth: '300px' }}>
          <SearchInput
            aria-label="Search prompts"
            placeholder="Find by name prefix"
            value={filterName}
            onChange={(_event, value) => {
              setFilterName(value);
              debouncedSetFilterName(value);
            }}
            onClear={() => {
              setFilterName('');
              setDebouncedFilterName('');
            }}
          />
        </ToolbarItem>
        <ToolbarItem variant="pagination">{renderPagination('top', true)}</ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );

  let tableContent = null;

  if (isLoadingList || isFetchingNextPage) {
    tableContent = (
      <Flex justifyContent={{ default: 'justifyContentCenter' }} style={{ minHeight: '400px' }}>
        <Spinner aria-label="Loading prompts" />
      </Flex>
    );
  } else if (listError) {
    tableContent = (
      <EmptyState
        titleText="Unable to load prompts"
        icon={ExclamationCircleIcon}
        headingLevel="h4"
        variant={EmptyStateVariant.sm}
      >
        <EmptyStateBody>{listError.message}</EmptyStateBody>
      </EmptyState>
    );
  } else if (thisPage.length === 0) {
    tableContent = (
      <EmptyState
        titleText="No prompts found"
        icon={SearchIcon}
        headingLevel="h4"
        variant={EmptyStateVariant.sm}
      >
        <EmptyStateBody>No saved prompts are available in this project.</EmptyStateBody>
      </EmptyState>
    );
  } else {
    tableContent = buildBody();
  }

  function buildBody() {
    return (
      <PromptDrawer
        isLoadingDetails={isLoadingDetails}
        selectedPromptVersions={selectedPromptVersions}
        selectedVersion={selectedVersion}
        onVersionChange={handleVersionChange}
        onClose={handleClearSelectedRow}
      >
        <PageSection isFilled aria-label="Paginated table data" style={{ minHeight: '400px' }}>
          <InnerScrollContainer>
            <Table variant="compact" aria-label="Paginated Table">
              <Thead>
                <Tr>
                  {columns.map((column, columnIndex) => (
                    <Th key={columnIndex}>{column}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {thisPage.map((row, rowIndex) => (
                  <Tr
                    key={rowIndex}
                    isClickable
                    isRowSelected={selectedRow?.name === row.name}
                    onClick={() => handleRowClick(row)}
                  >
                    <Td dataLabel={columns[0]}>
                      <div
                        className="pf-u-truncate pf-v6-u-text-color-link"
                        style={{ textDecoration: 'underline' }}
                      >
                        {row.name}
                      </div>
                    </Td>
                    <Td dataLabel={columns[1]}>{row.latest_version}</Td>
                    {!isDrawerOpen && (
                      <>
                        <Td dataLabel={columns[2]}>
                          <Timestamp
                            date={new Date(row.creation_timestamp)}
                            dateFormat={TimestampFormat.full}
                          />
                        </Td>
                        <Td dataLabel={columns[3]}>
                          <LabelGroup>
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
      </PromptDrawer>
    );
  }

  return (
    <Modal isOpen variant="large" onClose={onClose}>
      <ModalHeader>
        <Title headingLevel="h1">{displayText.title}</Title>
        <Content component="p" className="pf-v6-u-text-color-subtle">
          {displayText.description}
        </Content>
        {tableToolbar}
      </ModalHeader>
      <ModalBody style={{ height: '40vh', overflow: 'auto' }}>{tableContent}</ModalBody>
      {buildFooter()}
    </Modal>
  );
}
