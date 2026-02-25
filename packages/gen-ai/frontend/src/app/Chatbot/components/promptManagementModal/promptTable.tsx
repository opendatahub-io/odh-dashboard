import React, { useState, useEffect } from 'react';
import {
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Pagination,
  PageSection,
  MenuToggle,
  MenuToggleElement,
  Flex,
  Select,
  Label,
  SearchInput,
  Timestamp,
  PaginationVariant,
  TimestampFormat,
  Spinner,
  LabelGroup,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { SearchIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { MLflowPrompt, MLflowPromptVersion } from '~/app/types';
import { usePromptsList, usePromptVersions } from './usePromptQueries';
import PromptDrawer from './promptDrawer';

type PromptTableProps = {
  onClickLoad: (prompt: MLflowPromptVersion) => void;
  onClose: () => void;
};

export default function PromptTable({ onClickLoad, onClose }: PromptTableProps): React.ReactNode {
  const { prompts: rows, isLoading: isLoadingList, error: listError } = usePromptsList();
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [page] = useState(1);
  const [perPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState<MLflowPrompt | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [filterName, setFilterName] = useState('');
  const {
    versions: selectedPromptVersions,
    isLoading: isLoadingDetails,
    error,
  } = usePromptVersions(selectedRow?.name ?? null);

  useEffect(() => {
    if (selectedPromptVersions.length > 0 && selectedVersion === null) {
      setSelectedVersion(selectedPromptVersions[0].version);
    }
  }, [selectedPromptVersions, selectedVersion]);

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
  // const handleSetPage = (
  //   _evt: React.MouseEvent | React.KeyboardEvent | MouseEvent,
  //   newPage: number,
  //   _perPage: number,
  //   startIdx: number,
  //   endIdx: number,
  // ) => {
  //   setPaginatedRows(rows.slice(startIdx, endIdx));
  //   setPage(newPage);
  // };
  // const handlePerPageSelect = (
  //   _evt: React.MouseEvent | React.KeyboardEvent | MouseEvent,
  //   newPerPage: number,
  //   newPage: number,
  //   startIdx: number,
  //   endIdx: number,
  // ) => {
  //   setPaginatedRows(rows.slice(startIdx, endIdx));
  //   setPage(newPage);
  //   setPerPage(newPerPage);
  // };
  function buildFooter() {
    return (
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        style={{ width: '100%', paddingTop: 'var(--pf-t--global--spacer--md)' }}
      >
        <Flex rowGap={{ default: 'rowGapXs' }}>
          <Button
            variant="primary"
            disabled={selectedVersion === null || isLoadingDetails}
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
        {selectedVersion === null && renderPagination('bottom', false)}
      </Flex>
    );
  }

  function renderPagination(variant: PaginationVariant | 'bottom' | 'top', isCompact: boolean) {
    return (
      <Pagination
        isStatic
        isCompact={isCompact}
        itemCount={rows.length}
        page={page}
        perPage={perPage}
        // onSetPage={handleSetPage}
        // onPerPageSelect={handlePerPageSelect}
        variant={variant}
        titles={{
          paginationAriaLabel: `${variant} pagination`,
        }}
        style={{ backgroundColor: 'inherit' }}
      />
    );
  }

  const columns = selectedVersion
    ? ['Name', 'Version']
    : ['Name', 'Version', 'Last Modified', 'Tags'];

  function handleRowClick(row: MLflowPrompt) {
    if (selectedRow?.name !== row.name) {
      setSelectedVersion(null);
    }
    setSelectedRow(row);
  }

  const tableToolbar = (
    <Toolbar id="pagination-toolbar">
      <ToolbarContent>
        <ToolbarItem>
          <Select
            id="select-example"
            aria-label="Select Input"
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                isExpanded={isSelectOpen}
              >
                Name
              </MenuToggle>
            )}
            isOpen={false}
          />
        </ToolbarItem>
        <ToolbarGroup>
          <ToolbarItem>
            <SearchInput
              aria-label="Search prompts"
              placeholder="Find by name"
              value={filterName}
              onChange={(_event, value) => setFilterName(value)}
              onClear={() => setFilterName('')}
            />
          </ToolbarItem>
        </ToolbarGroup>
        <ToolbarItem variant="pagination">{renderPagination('top', true)}</ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );

  if (isLoadingList) {
    return (
      <Flex justifyContent={{ default: 'justifyContentCenter' }} style={{ minHeight: '400px' }}>
        <Spinner aria-label="Loading prompts" />
      </Flex>
    );
  }

  if (listError) {
    return (
      <EmptyState
        titleText="Unable to load prompts"
        icon={ExclamationCircleIcon}
        headingLevel="h4"
        variant={EmptyStateVariant.sm}
      >
        <EmptyStateBody>{listError.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        titleText="No prompts found"
        icon={SearchIcon}
        headingLevel="h4"
        variant={EmptyStateVariant.sm}
      >
        <EmptyStateBody>No saved prompts are available in this project.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <PromptDrawer
        selectedPromptVersions={selectedPromptVersions}
        selectedVersion={selectedVersion}
        onVersionChange={handleVersionChange}
        onClose={handleClearSelectedRow}
      >
        <PageSection isFilled aria-label="Paginated table data" style={{ minHeight: '400px' }}>
          {tableToolbar}
          <Table variant="compact" aria-label="Paginated Table">
            <Thead>
              <Tr>
                {columns.map((column, columnIndex) => (
                  <Th key={columnIndex}>{column}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row, rowIndex) => (
                <Tr
                  key={rowIndex}
                  isClickable
                  isRowSelected={selectedRow?.name === row.name}
                  onClick={() => handleRowClick(row)}
                >
                  <Td dataLabel={columns[0]}>{row.name}</Td>
                  <Td dataLabel={columns[1]}>{row.latest_version}</Td>
                  {!selectedVersion && (
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
        </PageSection>
      </PromptDrawer>
      {buildFooter()}
    </>
  );
}
