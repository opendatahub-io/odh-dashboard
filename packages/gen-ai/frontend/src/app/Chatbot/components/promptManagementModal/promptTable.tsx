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
  SearchInput,
  Timestamp,
  PaginationVariant,
  TimestampFormat,
  Spinner,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { MLflowPrompt, MLflowPromptVersion } from '~/app/types';

type PromptTableProps = {
  rows: MLflowPrompt[];
  onClickLoad: (prompt: MLflowPromptVersion) => void;
  onClose: () => void;
};

export default function PromptTable({
  rows,
  onClickLoad,
  onClose,
}: PromptTableProps): React.ReactNode {
  const { api, apiAvailable } = useGenAiAPI();
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [page] = useState(1);
  const [perPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState<MLflowPrompt | null>(null);
  const [selectedPromptDetails, setSelectedPromptDetails] = useState<MLflowPromptVersion | null>(
    null,
  );
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
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
        style={{ width: '100%', paddingTop: '16px' }}
      >
        <Flex rowGap={{ default: 'rowGapXs' }}>
          <Button
            variant="primary"
            disabled={!selectedPromptDetails || isLoadingDetails}
            onClick={() => selectedPromptDetails && onClickLoad(selectedPromptDetails)}
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
        {renderPagination('bottom', false)}
      </Flex>
    );
  }

  const renderPagination = (variant: PaginationVariant | 'bottom' | 'top', isCompact: boolean) => (
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

  const columns = ['Name', 'Version', 'Last Modified', 'Tags'];

  const handleRowClick = (row: MLflowPrompt) => {
    setSelectedRow(row);
  };

  useEffect(() => {
    if (!selectedRow || !apiAvailable) {
      setSelectedPromptDetails(null);
      return;
    }

    let cancelled = false;
    setIsLoadingDetails(true);

    api
      .getMLflowPrompt({ name: selectedRow.name })
      .then((data) => {
        if (!cancelled) {
          setSelectedPromptDetails(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch prompt details:', error);
          setSelectedPromptDetails(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDetails(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRow, api, apiAvailable]);
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
              value="Search value that needs doing"
              // onChange={(_event, value) => onChange(value)}
              // onClear={() => onChange('')}
            />
          </ToolbarItem>
        </ToolbarGroup>
        <ToolbarItem variant="pagination">{renderPagination('top', true)}</ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );

  return (
    <>
      <PageSection isFilled aria-label="Paginated table data">
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
                <Td dataLabel={columns[2]}>
                  <Timestamp
                    date={new Date(row.creation_timestamp)}
                    dateFormat={TimestampFormat.full}
                  />
                </Td>
                <Td dataLabel={columns[3]}>
                  {row.tags ? <pre>{JSON.stringify(row.tags)}</pre> : '-'}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {buildFooter()}
      </PageSection>
    </>
  );
}
