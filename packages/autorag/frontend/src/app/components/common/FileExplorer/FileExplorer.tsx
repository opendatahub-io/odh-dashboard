// Modules -------------------------------------------------------------------->

import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  EmptyStateFooter,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Pagination,
  PaginationVariant,
  type PaginationProps,
  SearchInput,
  Skeleton,
} from '@patternfly/react-core';
import {
  OuterScrollContainer,
  InnerScrollContainer,
  Table,
  Thead,
  Tr,
  Th,
  type BaseCellProps,
  Tbody,
  Td,
  ActionsColumn,
  type IAction,
} from '@patternfly/react-table';
import React, { type ReactNode, useState } from 'react';

// Types ---------------------------------------------------------------------->

export interface Source {
  name: string;
  bucket?: string;
  count?: number;
}
export type Sources = Source[];

export interface File {
  name: string;
  path: string;
  size?: string;
  type: string;
  items?: number;
  details?: object;
  hidden?: boolean;
}
export type Files<T extends File = File> = T[];

export interface Directory extends File {
  type: 'directory';
  items: number;
}

const isDirectory = (file: File): file is Directory => file.type === 'directory';

interface Column {
  id: string;
  label: string;
  width: BaseCellProps['width'];
  screenReaderText?: string;
  skeleton?: ReactNode;
}

type RenderableDetailValue = string | number | boolean | ReactNode;
const isRenderableDetailValue = (value: unknown): value is RenderableDetailValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  React.isValidElement(value);

// Globals -------------------------------------------------------------------->

const defaults = {
  labels: {
    modalTitle: 'Select documents from connections',
    modalDescription: 'Select which files to use for your data collection and evaluation sources',
    modalPrimaryCTA: 'Select files',
    modalSecondaryCTA: 'Cancel',

    fileTypeDirectory: 'Folder',

    sourceSelector: 'Source Selector',
    sourceCaption: 'Files',
    noSourcesMessage: 'No source of documents provided',

    searchAriaLabel: 'Search input to find by name',
    searchPlaceholder: 'Find by name',

    tableAriaLabel: 'Files table',
    tableColumnName: 'Name',
    tableColumnType: 'Type',
    tableColumnSelect: 'File select',
    tableColumnItems: 'Items',
    tableColumnActions: 'Actions',

    tableItemsSingular: 'item',
    tableItemsPlural: 'items',

    tableActionViewDetails: 'View details',
    tableActionRemoveSelection: 'Remove selection',

    detailsPanelTitle: 'Details',
    detailsPanelName: 'Name',
    detailsPanelSource: 'Source',
    detailsPanelBucket: 'Bucket',

    emptyStateTitle: 'No files found',
    emptyStateBody: 'No files are available in the current directory.',

    paginationIndeterminateToggleTemplate: (first: number, last: number) => (
      <>
        <b>
          {first} - {last}
        </b>{' '}
        of <b>many</b>
      </>
    ),
  },
};

const BREADCRUMB_COLLAPSE_THRESHOLD = 6;
const BREADCRUMB_LEADING_VISIBLE = 2;
const BREADCRUMB_TRAILING_VISIBLE = 2;

// Components ----------------------------------------------------------------->

interface SourceSelectorProps {
  sources?: Sources;
  source?: Source;
  onSelectSource: (source: Source) => void;
}
const SourceSelector: React.FC<SourceSelectorProps> = ({ sources, source, onSelectSource }) => {
  if (source) {
    return null;
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    return (
      <Content component="p" className="pf-v6-u-mb-sm">
        {defaults.labels.noSourcesMessage}
      </Content>
    );
  }

  const sourceLabel = (s: Source) => (s.count !== undefined ? `${s.name} (${s.count})` : s.name);

  return (
    <Flex
      className="pf-v6-u-mb-sm"
      direction={{ default: 'row' }}
      alignItems={{ default: 'alignItemsCenter' }}
    >
      <FlexItem>{defaults.labels.sourceSelector}:</FlexItem>
      {sources.map((s) => (
        <FlexItem key={s.name}>
          <Label onClick={() => onSelectSource(s)} style={{ cursor: 'pointer' }}>
            {sourceLabel(s)}
          </Label>
        </FlexItem>
      ))}
    </Flex>
  );
};
interface FilesTableProps {
  files?: Files;
  selectedFiles?: Files;
  setSelectedFiles: (files: Files) => void;
  selection?: 'radio' | 'checkbox';
  onDirectoryClick?: (directory: Directory) => void;
  onViewDetails?: (file: File) => void;
  loading?: boolean;
  page?: number;
  perPage?: number;
  itemCount?: number;
  onSetPage?: (page: number) => void;
  onPerPageSelect?: (perPage: number) => void;
}
const FilesTable: React.FC<FilesTableProps> = ({
  files,
  selectedFiles,
  setSelectedFiles,
  selection = 'radio',
  onDirectoryClick,
  onViewDetails,
  loading,
  page = 1,
  perPage = 100,
  itemCount,
  onSetPage,
  onPerPageSelect,
}) => {
  const isIndeterminate = itemCount === undefined;
  const fileCount = Array.isArray(files) ? files.length : 0;
  // When indeterminate, synthesize a count so PF computes correct firstIndex/lastIndex.
  // If the current page is full, assume there's at least one more page (+1 keeps "next" enabled).
  const syntheticItemCount = isIndeterminate
    ? (page - 1) * perPage + fileCount + (fileCount >= perPage ? 1 : 0)
    : itemCount;

  const extraPaginationProps: Pick<PaginationProps, 'toggleTemplate'> = {};
  if (isIndeterminate) {
    extraPaginationProps.toggleTemplate = ({ firstIndex = 0, lastIndex = 0 }) =>
      defaults.labels.paginationIndeterminateToggleTemplate(firstIndex, lastIndex);
  }

  const columns: Record<string, Column> = {
    select: {
      id: 'select',
      label: '',
      width: 10,
      screenReaderText: defaults.labels.tableColumnSelect,
      skeleton: <Skeleton width="16px" height="16px" />,
    },
    name: {
      id: 'name',
      label: defaults.labels.tableColumnName,
      width: 40,
      skeleton: <Skeleton width="75%" height="1em" />,
    },
    type: {
      id: 'type',
      label: defaults.labels.tableColumnType,
      width: 40,
      skeleton: <Skeleton width="50%" height="1em" />,
    },
    actions: {
      id: 'actions',
      label: '',
      width: undefined,
      screenReaderText: defaults.labels.tableColumnActions,
    },
  };

  const skeletonRowCount = perPage;
  const isEmpty = !loading && (!Array.isArray(files) || files.length === 0);

  return (
    <OuterScrollContainer>
      <InnerScrollContainer>
        <Table aria-label={defaults.labels.tableAriaLabel} variant="compact" borders isStickyHeader>
          <Thead>
            <Tr>
              {Object.values(columns).map((column) => (
                <Th
                  key={column.id}
                  isStickyColumn
                  width={column.width}
                  {...(column.screenReaderText
                    ? { screenReaderText: column.screenReaderText }
                    : {})}
                >
                  {column.label}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {loading &&
              Array.from({ length: skeletonRowCount }, (_, i) => (
                <Tr key={`skeleton-${i}`}>
                  {Object.values(columns).map((column) => (
                    <Td key={column.id} isStickyColumn width={column.width}>
                      {column.skeleton}
                    </Td>
                  ))}
                </Tr>
              ))}
            {isEmpty && (
              <Tr>
                <Td colSpan={4}>
                  <EmptyState headingLevel="h3" titleText={defaults.labels.emptyStateTitle}>
                    <EmptyStateBody>{defaults.labels.emptyStateBody}</EmptyStateBody>
                    <EmptyStateFooter>
                      <EmptyStateActions />
                    </EmptyStateFooter>
                  </EmptyState>
                </Td>
              </Tr>
            )}
            {!loading &&
              !isEmpty &&
              Array.isArray(files) &&
              files.reduce<{ elements: React.ReactNode[]; visibleIndex: number }>(
                (acc, file) => {
                  if (file.hidden) {
                    return acc;
                  }
                  const rowIndex = acc.visibleIndex;
                  acc.visibleIndex++;
                  acc.elements.push(
                    <Tr key={file.name}>
                      <Td
                        width={columns.select.width}
                        select={{
                          rowIndex,
                          onSelect: (_event, isSelecting) => {
                            if (selection === 'radio') {
                              setSelectedFiles(isSelecting ? [file] : []);
                            } else {
                              const current = Array.isArray(selectedFiles) ? selectedFiles : [];
                              if (isSelecting) {
                                setSelectedFiles([...current, file]);
                              } else {
                                setSelectedFiles(current.filter((f) => f !== file));
                              }
                            }
                          },
                          isSelected: Array.isArray(selectedFiles) && selectedFiles.includes(file),
                          isDisabled: false,
                          variant: selection,
                        }}
                      />
                      <Td width={columns.name.width} dataLabel={columns.name.label}>
                        {/* Should this be a Content/a/href or should it be Button variant link */}
                        {isDirectory(file) && (
                          <Content
                            component="a"
                            href="#"
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault();
                              onDirectoryClick?.(file);
                            }}
                          >
                            {file.name}
                          </Content>
                        )}
                        {!isDirectory(file) && file.name}
                      </Td>
                      <Td width={columns.type.width} dataLabel={columns.type.label}>
                        {isDirectory(file) ? defaults.labels.fileTypeDirectory : file.type}
                      </Td>
                      <Td width={columns.actions.width} isActionCell>
                        {(() => {
                          const actions: IAction[] = [];
                          if (onViewDetails) {
                            actions.push({
                              title: defaults.labels.tableActionViewDetails,
                              onClick: () => onViewDetails(file),
                            });
                          }
                          if (Array.isArray(selectedFiles) && selectedFiles.includes(file)) {
                            actions.push({
                              title: defaults.labels.tableActionRemoveSelection,
                              onClick: () =>
                                setSelectedFiles(selectedFiles.filter((f) => f !== file)),
                            });
                          }
                          return <ActionsColumn items={actions} />;
                        })()}
                      </Td>
                    </Tr>,
                  );
                  return acc;
                },
                { elements: [], visibleIndex: 0 },
              ).elements}
          </Tbody>
        </Table>
        <Pagination
          widgetId="FileExplorer-table-pagination"
          itemCount={syntheticItemCount}
          perPage={perPage}
          page={page}
          onSetPage={(_event, newPage) => onSetPage?.(newPage)}
          onPerPageSelect={(_event, newPerPage) => onPerPageSelect?.(newPerPage)}
          isSticky
          isDisabled={loading}
          variant={PaginationVariant.bottom}
          isCompact
          {...extraPaginationProps}
        />
      </InnerScrollContainer>
    </OuterScrollContainer>
  );
};

interface PathBreadcrumbsProps {
  directories?: Directory[];
  source?: Source;
  onNavigate?: (directory: Directory) => void;
  onNavigateRoot?: () => void;
  loading?: boolean;
}
const PathBreadcrumbs: React.FC<PathBreadcrumbsProps> = ({
  directories,
  source,
  onNavigate,
  onNavigateRoot,
  loading,
}) => {
  const rootLabel = source ? `${source.name} (root)` : 'Root';
  const isAtRoot = !Array.isArray(directories) || directories.length === 0;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dirs = Array.isArray(directories) ? directories : [];
  const shouldCollapse = dirs.length > BREADCRUMB_COLLAPSE_THRESHOLD;
  const leadingDirs = shouldCollapse ? dirs.slice(0, BREADCRUMB_LEADING_VISIBLE) : [];
  const hiddenDirs = shouldCollapse
    ? dirs.slice(BREADCRUMB_LEADING_VISIBLE, dirs.length - BREADCRUMB_TRAILING_VISIBLE)
    : [];
  const visibleDirs = shouldCollapse ? dirs.slice(dirs.length - BREADCRUMB_TRAILING_VISIBLE) : dirs;

  if (loading) {
    return (
      <Breadcrumb>
        <BreadcrumbItem>{rootLabel}</BreadcrumbItem>
        <BreadcrumbItem>
          <Skeleton width="120px" height="1em" />
        </BreadcrumbItem>
        <BreadcrumbItem>
          <Skeleton width="80px" height="1em" />
        </BreadcrumbItem>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbItem
        {...(!isAtRoot && onNavigateRoot ? { to: '#', onClick: onNavigateRoot } : {})}
      >
        {rootLabel}
      </BreadcrumbItem>
      {leadingDirs.map((dir) => (
        <BreadcrumbItem key={dir.path} to="#" onClick={() => onNavigate?.(dir)}>
          {dir.name}
        </BreadcrumbItem>
      ))}
      {shouldCollapse && (
        <BreadcrumbItem>
          <Dropdown
            isOpen={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                variant="plain"
                aria-label="Collapsed breadcrumb items"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
              >
                ...
              </MenuToggle>
            )}
          >
            <DropdownList>
              {hiddenDirs.map((dir) => (
                <DropdownItem
                  key={dir.path}
                  onClick={() => {
                    onNavigate?.(dir);
                    setIsDropdownOpen(false);
                  }}
                >
                  {dir.name}
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
        </BreadcrumbItem>
      )}
      {visibleDirs.map((dir) => (
        <BreadcrumbItem key={dir.path} to="#" onClick={() => onNavigate?.(dir)}>
          {dir.name}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
};

interface DetailsPanelProps {
  source?: Source;
  selectedFiles?: Files;
  loading?: boolean;
}
const DetailsPanel: React.FC<DetailsPanelProps> = ({ source, selectedFiles, loading }) => {
  if (loading) {
    return (
      <Card isFullHeight>
        <CardTitle>{defaults.labels.detailsPanelTitle}</CardTitle>
        <CardBody>
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>
                <Skeleton width="60px" height="1em" />
              </DescriptionListTerm>
              <DescriptionListDescription>
                <Skeleton width="120px" height="1em" />
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>
                <Skeleton width="40px" height="1em" />
              </DescriptionListTerm>
              <DescriptionListDescription>
                <Skeleton width="180px" height="1em" />
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card isFullHeight>
      <CardTitle>{defaults.labels.detailsPanelTitle}</CardTitle>
      <CardBody>
        <DescriptionList>
          {source && (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>{defaults.labels.detailsPanelSource}</DescriptionListTerm>
                <DescriptionListDescription>{source.name}</DescriptionListDescription>
              </DescriptionListGroup>
              {source.bucket && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{defaults.labels.detailsPanelBucket}</DescriptionListTerm>
                  <DescriptionListDescription>{source.bucket}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
            </>
          )}
          {/* // TODO [ Gustavo ] Render a selected files section with slight left margins to differentiate these details from the source details. Selected files should also show an X so we can remove them from this panel */}
          {Array.isArray(selectedFiles) &&
            selectedFiles.length > 0 &&
            selectedFiles.map((selectedFile) => (
              <React.Fragment key={selectedFile.path}>
                <DescriptionListGroup>
                  <DescriptionListTerm>{defaults.labels.detailsPanelName}</DescriptionListTerm>
                  <DescriptionListDescription>{selectedFile.name}</DescriptionListDescription>
                </DescriptionListGroup>
                {selectedFile.details &&
                  Object.entries(selectedFile.details)
                    .filter(
                      (entry): entry is [string, RenderableDetailValue] =>
                        Boolean(entry[0]) && isRenderableDetailValue(entry[1]),
                    )
                    .map(([key, value]) => (
                      <DescriptionListGroup key={key}>
                        <DescriptionListTerm>{key}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {typeof value === 'boolean' ? String(value) : value}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
              </React.Fragment>
            ))}
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

interface FileExplorerProps {
  id?: string;
  isOpen: boolean;
  onClose: (_event: KeyboardEvent | React.MouseEvent) => void;
  sources?: Sources;
  source?: Source;
  files?: Files;
  directories?: Directory[];
  loading?: boolean;
  searchResultsCount?: number;
  page?: number;
  perPage?: number;
  itemCount?: number;
  selection?: 'radio' | 'checkbox';
  onSelectSource: (source: Source) => void;
  onDirectoryClick?: (directory: Directory) => void;
  onViewDetails?: (file: File) => void;
  onNavigate?: (directory: Directory) => void;
  onNavigateRoot?: () => void;
  onSearch?: (query: string) => void;
  onSetPage?: (page: number) => void;
  onPerPageSelect?: (perPage: number) => void;
  onPrimary: (files: Files) => void;
}
const FileExplorer: React.FC<FileExplorerProps> = ({
  id,
  isOpen,
  onClose,
  sources,
  source,
  files,
  directories,
  loading,
  searchResultsCount,
  page,
  perPage,
  itemCount,
  selection = 'radio',
  onSelectSource,
  onDirectoryClick,
  onViewDetails,
  onNavigate,
  onNavigateRoot,
  onSearch,
  onSetPage,
  onPerPageSelect,
  onPrimary,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);

  // Consider introducing a FileExplorerContext if prop drilling deepens.
  // Revisit when: a child component needs to pass props through to its own children,
  // or the FileExplorer prop list exceeds ~15-20 props. Currently manageable at 1 level deep.
  const [searchQuery, setSearchQuery] = useState<string>('');

  const resetState = () => {
    setSelectedFiles([]);
    setSearchQuery('');
  };

  const rowHeight = 37.8;
  const headerHeight = 38;
  const paginationHeight = 53;
  const numberOfRowsToShow = 10;
  const stickyTableHeight = rowHeight * numberOfRowsToShow + headerHeight + paginationHeight;

  return (
    <Modal
      id={id}
      isOpen={isOpen}
      onClose={(e) => {
        onClose(e);
        resetState();
      }}
      variant="large"
      aria-labelledby="FileExplorer-modal-title"
      aria-describedby="FileExplorer-modal-body"
    >
      <ModalHeader
        title={defaults.labels.modalTitle}
        description={defaults.labels.modalDescription}
        labelId="FileExplorer-modal-title"
      />
      <ModalBody id="FileExplorer-modal-body">
        <Flex direction={{ default: 'column' }}>
          <FlexItem>
            <SourceSelector source={source} sources={sources} onSelectSource={onSelectSource} />
          </FlexItem>
          <FlexItem className="pf-v6-u-w-50">
            <SearchInput
              id="FileExplorer-search-input"
              aria-label={defaults.labels.searchAriaLabel}
              placeholder={defaults.labels.searchPlaceholder}
              value={searchQuery}
              onChange={(_event, value) => {
                setSearchQuery(value);
                onSearch?.(value);
              }}
              onClear={() => {
                setSearchQuery('');
                onSearch?.('');
              }}
              resultsCount={searchResultsCount}
            />
          </FlexItem>
          <FlexItem>
            <PathBreadcrumbs
              directories={directories}
              source={source}
              onNavigate={onNavigate}
              onNavigateRoot={onNavigateRoot}
              loading={loading}
            />
          </FlexItem>
          <FlexItem>
            <Grid hasGutter>
              <GridItem span={8} style={{ height: `${stickyTableHeight}px` }}>
                <FilesTable
                  files={files}
                  selectedFiles={selectedFiles}
                  setSelectedFiles={setSelectedFiles}
                  selection={selection}
                  onDirectoryClick={onDirectoryClick}
                  onViewDetails={onViewDetails}
                  loading={loading}
                  page={page}
                  perPage={perPage}
                  itemCount={itemCount}
                  onSetPage={onSetPage}
                  onPerPageSelect={onPerPageSelect}
                />
              </GridItem>
              <GridItem span={4}>
                <DetailsPanel source={source} selectedFiles={selectedFiles} loading={loading} />
              </GridItem>
            </Grid>
          </FlexItem>
        </Flex>
      </ModalBody>
      <ModalFooter>
        <Button
          key="select-files"
          variant="primary"
          isDisabled={loading}
          onClick={(_event) => {
            onPrimary(selectedFiles);
            onClose(_event);
            resetState();
          }}
        >
          {defaults.labels.modalPrimaryCTA}
        </Button>
        <Button
          key="cancel"
          variant="link"
          onClick={(e) => {
            onClose(e);
            resetState();
          }}
        >
          {defaults.labels.modalSecondaryCTA}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// Public --------------------------------------------------------------------->

export default FileExplorer;

// Private -------------------------------------------------------------------->
