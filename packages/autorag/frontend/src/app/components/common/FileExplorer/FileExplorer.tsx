// Modules -------------------------------------------------------------------->

import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  DataList,
  DataListAction,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  EmptyStateFooter,
  type EmptyStateProps,
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
  type PaginationProps,
  SearchInput,
  Skeleton,
  Truncate,
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
import { EllipsisVIcon, TimesIcon } from '@patternfly/react-icons';
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

export type FileExplorerEmptyStateConfig = Pick<
  EmptyStateProps,
  'titleText' | 'headingLevel' | 'icon' | 'variant' | 'status'
> & {
  body?: ReactNode;
  actions?: ReactNode;
};

interface Column {
  id: string;
  label: string;
  width: BaseCellProps['width'];
  screenReaderText?: string;
  skeleton?: (index?: number) => ReactNode;
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
    modalDescription: (sourceName?: string) =>
      sourceName ? (
        <span>
          Viewing files from: <strong>{sourceName}</strong>
        </span>
      ) : (
        'Select which files to use for your data collection and evaluation sources'
      ),
    modalPrimaryCTA: 'Select files',
    modalSecondaryCTA: 'Cancel',

    fileTypeDirectory: 'Folder',

    sourceSelector: 'Source Selector',
    sourceCaption: 'Files',
    noSourcesMessage: 'No source of documents provided',

    searchAriaLabel: 'Search input to find by name',
    searchPlaceholder: (folderName?: string) =>
      folderName ? `Search within '${folderName}'` : 'Find by name',

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
    detailsPanelTitleFiles: 'Selected files',
    detailsPanelName: 'Name',
    detailsPanelSource: 'Source',
    detailsPanelBucket: 'Bucket',

    emptyStateTitle: 'No files found',
    emptyStateBody: 'No files are available in the current directory.',

    paginationIndeterminateToggleTemplate: (first: number, last: number) => (
      <>
        <strong>
          {first} - {last}
        </strong>{' '}
        of <strong>many</strong>
      </>
    ),
  },
};

const BREADCRUMB_COLLAPSE_THRESHOLD = 6;
const BREADCRUMB_LEADING_VISIBLE = 2;
const BREADCRUMB_TRAILING_VISIBLE = 2;

const RENDER_SOURCE_DETAILS_IN_PANEL = false;

const sanitizeId = (value: string): string => value.replace(/[^a-zA-Z0-9-_]/g, '-');

// Private -------------------------------------------------------------------->

const shouldDetailsPanelRender = (state: {
  filesToView: Files | undefined;
  selectedFiles: Files | undefined;
}) => {
  const { filesToView, selectedFiles } = state;

  const shouldDetailsRender = Boolean(Array.isArray(filesToView) && filesToView.length > 0);
  const shouldSelectedFilesRender = Boolean(
    Array.isArray(selectedFiles) && selectedFiles.length > 0,
  );
  return {
    details: shouldDetailsRender,
    selected: shouldSelectedFilesRender,
    panel: shouldDetailsRender || shouldSelectedFilesRender,
  };
};

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
  isEmpty?: boolean;
  emptyStateProps?: FileExplorerEmptyStateConfig;
  loading?: boolean;
  perPage?: number;
}
const FilesTable: React.FC<FilesTableProps> = ({
  files,
  selectedFiles,
  setSelectedFiles,
  selection = 'radio',
  onDirectoryClick,
  onViewDetails,
  isEmpty: isEmptyProp,
  emptyStateProps,
  loading,
  perPage = 100,
}) => {
  const columns: Record<string, Column> = {
    select: {
      id: 'select',
      label: '',
      width: undefined,
      screenReaderText: defaults.labels.tableColumnSelect,
    },
    name: {
      id: 'name',
      label: defaults.labels.tableColumnName,
      width: 70,
      skeleton: (index = 0) => {
        const widths = [75, 60, 70, 45, 65, 50, 55, 40, 72, 58];
        const width = `${widths[index % widths.length]}%`;
        return <Skeleton className="pf-v6-u-mb-md" width={width} height="1em" />;
      },
    },
    type: {
      id: 'type',
      label: defaults.labels.tableColumnType,
      width: 10,
      skeleton: () => <Skeleton className="pf-v6-u-mb-md" width="50%" height="1em" />,
    },
    actions: {
      id: 'actions',
      label: '',
      width: undefined,
      screenReaderText: defaults.labels.tableColumnActions,
    },
  };

  const skeletonRowCount = perPage;
  const isEmpty = isEmptyProp ?? (!loading && (!Array.isArray(files) || files.length === 0));

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
              Array.from({ length: skeletonRowCount }, (_, rowIndex) => (
                <Tr key={`skeleton-${rowIndex}`}>
                  {Object.values(columns).map((column) => (
                    <Td key={column.id} isStickyColumn width={column.width}>
                      {column.skeleton && column.skeleton(rowIndex)}
                    </Td>
                  ))}
                </Tr>
              ))}
            {isEmpty && (
              <Tr>
                <Td colSpan={4}>
                  <EmptyState
                    headingLevel={emptyStateProps?.headingLevel ?? 'h3'}
                    titleText={emptyStateProps?.titleText ?? defaults.labels.emptyStateTitle}
                    icon={emptyStateProps?.icon}
                    variant={emptyStateProps?.variant}
                    status={emptyStateProps?.status}
                  >
                    <EmptyStateBody>
                      {emptyStateProps?.body ?? defaults.labels.emptyStateBody}
                    </EmptyStateBody>
                    <EmptyStateFooter>
                      <EmptyStateActions>{emptyStateProps?.actions}</EmptyStateActions>
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
                                if (!current.some((f) => f.path === file.path)) {
                                  setSelectedFiles([...current, file]);
                                }
                              } else {
                                setSelectedFiles(current.filter((f) => f.path !== file.path));
                              }
                            }
                          },
                          isSelected:
                            Array.isArray(selectedFiles) &&
                            selectedFiles.some((f) => f.path === file.path),
                          isDisabled: false,
                          variant: selection,
                        }}
                      />
                      <Td width={columns.name.width} dataLabel={columns.name.label}>
                        {/* Should this be a Content/a/href or should it be Button variant link */}
                        {isDirectory(file) && (
                          <Truncate
                            href="#"
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault();
                              onDirectoryClick?.(file);
                            }}
                            content={file.name}
                          />
                        )}
                        {!isDirectory(file) && <Truncate content={file.name} />}
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
                          if (
                            Array.isArray(selectedFiles) &&
                            selectedFiles.some((f) => f.path === file.path)
                          ) {
                            actions.push({
                              title: defaults.labels.tableActionRemoveSelection,
                              onClick: () =>
                                setSelectedFiles(selectedFiles.filter((f) => f.path !== file.path)),
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dirs = Array.isArray(directories) ? directories : [];
  const isAtRoot = dirs.length === 0;
  const shouldCollapse = dirs.length > BREADCRUMB_COLLAPSE_THRESHOLD;
  const leadingDirs = shouldCollapse ? dirs.slice(0, BREADCRUMB_LEADING_VISIBLE) : [];
  const hiddenDirs = shouldCollapse
    ? dirs.slice(BREADCRUMB_LEADING_VISIBLE, dirs.length - BREADCRUMB_TRAILING_VISIBLE)
    : [];
  const navigableDirs = shouldCollapse
    ? dirs.slice(dirs.length - BREADCRUMB_TRAILING_VISIBLE, -1)
    : dirs.slice(0, -1);
  const currentDir = dirs.length > 0 ? dirs[dirs.length - 1] : undefined;

  if (loading) {
    return (
      <Breadcrumb>
        <BreadcrumbItem>{rootLabel}</BreadcrumbItem>
        {dirs.length > 0 &&
          dirs.map((dir) => (
            <BreadcrumbItem key={dir.path}>
              <Skeleton width="120px" height="1em" />
            </BreadcrumbItem>
          ))}
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
      {navigableDirs.map((dir) => (
        <BreadcrumbItem key={dir.path} to="#" onClick={() => onNavigate?.(dir)}>
          {dir.name}
        </BreadcrumbItem>
      ))}
      {currentDir && <BreadcrumbItem isActive>{currentDir.name}</BreadcrumbItem>}
    </Breadcrumb>
  );
};

interface FileDetailsProps {
  file: File;
}
const FileDetails: React.FC<FileDetailsProps> = ({ file }) => (
  <>
    <DescriptionListGroup>
      <DescriptionListTerm>{defaults.labels.detailsPanelName}</DescriptionListTerm>
      <DescriptionListDescription>{file.name}</DescriptionListDescription>
    </DescriptionListGroup>
    {file.details &&
      Object.entries(file.details)
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
  </>
);

interface SelectedFilesDataListProps {
  selectedFiles: Files;
  onViewDetails: (file: File) => void;
  onRemoveSelection: (file: File) => void;
}
const SelectedFilesDataList: React.FC<SelectedFilesDataListProps> = ({
  selectedFiles,
  onViewDetails,
  onRemoveSelection,
}) => {
  const [openMenuFileKey, setOpenMenuFileKey] = useState<string | null>(null);

  const emptyHandler = () => null;

  return (
    <DataList
      aria-label={defaults.labels.detailsPanelTitleFiles}
      isCompact
      onSelectDataListItem={emptyHandler}
      onSelectableRowChange={emptyHandler}
    >
      {selectedFiles.map((file) => (
        <DataListItem
          key={file.path}
          aria-labelledby={`selected-file-${sanitizeId(file.path)}`}
          onClick={() => onViewDetails(file)}
        >
          <DataListItemRow>
            <DataListItemCells
              dataListCells={[
                <DataListCell key="name">
                  <Truncate
                    id={`selected-file-${sanitizeId(file.path)}`}
                    content={file.name}
                    tooltipPosition="right"
                  />
                </DataListCell>,
              ]}
            />
            <DataListAction
              aria-labelledby={`selected-file-${sanitizeId(file.path)}`}
              aria-label={`${file.name} actions`}
              id={`selected-file-actions-${sanitizeId(file.path)}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Dropdown
                isOpen={openMenuFileKey === file.path}
                onOpenChange={(isOpen) => setOpenMenuFileKey(isOpen ? file.path : null)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    variant="plain"
                    aria-label={`${file.name} overflow menu`}
                    onClick={() =>
                      setOpenMenuFileKey((prev) => (prev === file.path ? null : file.path))
                    }
                  >
                    <EllipsisVIcon />
                  </MenuToggle>
                )}
                popperProps={{ position: 'right' }}
              >
                <DropdownList>
                  <DropdownItem
                    key="view-details"
                    onClick={() => {
                      onViewDetails(file);
                      setOpenMenuFileKey(null);
                    }}
                  >
                    {defaults.labels.tableActionViewDetails}
                  </DropdownItem>
                  <DropdownItem
                    key="remove-selection"
                    onClick={() => {
                      onRemoveSelection(file);
                      setOpenMenuFileKey(null);
                    }}
                  >
                    {defaults.labels.tableActionRemoveSelection}
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </DataListAction>
          </DataListItemRow>
        </DataListItem>
      ))}
    </DataList>
  );
};

interface DetailsPanelProps {
  source?: Source;
  selectedFiles?: Files;
  filesToView?: Files;
  onViewDetails: (file: File) => void;
  onRemoveSelection: (file: File) => void;
  onClearDetails: () => void;
}
const DetailsPanel: React.FC<DetailsPanelProps> = ({
  source,
  selectedFiles,
  filesToView,
  onViewDetails,
  onRemoveSelection,
  onClearDetails,
}) => {
  const detailsSubCard = (
    <Card isPlain isCompact>
      <CardHeader
        actions={{
          actions: [
            <Button
              variant="plain"
              aria-label="Close details"
              key="close"
              icon={<TimesIcon />}
              onClick={() => onClearDetails()}
            />,
          ],
        }}
      >
        <CardTitle>{defaults.labels.detailsPanelTitle}</CardTitle>
      </CardHeader>
      <CardBody className="pf-v6-u-pt-sm" isFilled={false}>
        <DescriptionList>
          {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
          {RENDER_SOURCE_DETAILS_IN_PANEL && source && (
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
          {Array.isArray(filesToView) &&
            filesToView.length > 0 &&
            filesToView.map((fileToView) => (
              <FileDetails key={fileToView.path} file={fileToView} />
            ))}
        </DescriptionList>
      </CardBody>
    </Card>
  );

  const selectedFilesSubCard = (
    <Card isPlain isCompact>
      <CardTitle>{defaults.labels.detailsPanelTitleFiles}</CardTitle>
      <CardBody className="pf-v6-u-pt-sm">
        {/*<DescriptionList>*/}
        {/*  {Array.isArray(selectedFiles) &&*/}
        {/*    selectedFiles.length > 0 &&*/}
        {/*    selectedFiles.map((selectedFile) => (*/}
        {/*      <FileDetails key={selectedFile.path} file={selectedFile} />*/}
        {/*    ))}*/}
        {/*</DescriptionList>*/}
        {Array.isArray(selectedFiles) && selectedFiles.length > 0 && (
          <SelectedFilesDataList
            selectedFiles={selectedFiles}
            onViewDetails={onViewDetails}
            onRemoveSelection={onRemoveSelection}
          />
        )}
      </CardBody>
    </Card>
  );

  const shouldRender = shouldDetailsPanelRender({ filesToView, selectedFiles });

  return (
    <Card isFullHeight isCompact>
      {shouldRender.details && detailsSubCard}
      {shouldRender.details && shouldRender.selected && <Divider />}
      {shouldRender.selected && selectedFilesSubCard}
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
  hasNextPage?: boolean;
  isEmpty?: boolean;
  emptyStateProps?: FileExplorerEmptyStateConfig;
  selection?: 'radio' | 'checkbox';
  onSelectSource?: (source: Source) => void;
  onDirectoryClick?: (directory: Directory) => void;
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
  hasNextPage,
  isEmpty,
  emptyStateProps,
  selection = 'radio',
  onSelectSource,
  onDirectoryClick,
  onNavigate,
  onNavigateRoot,
  onSearch,
  onSetPage,
  onPerPageSelect,
  onPrimary,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);
  const [filesToView, setFilesToView] = useState<Files>([]);

  // Consider introducing a FileExplorerContext if prop drilling deepens.
  // Revisit when: a child component needs to pass props through to its own children,
  // or the FileExplorer prop list exceeds ~15-20 props. Currently manageable at 1 level deep.
  const [searchQuery, setSearchQuery] = useState<string>('');

  const resetState = () => {
    setSelectedFiles([]);
    setFilesToView([]);
    setSearchQuery('');
  };

  const isIndeterminate = itemCount === undefined;
  const fileCount = Array.isArray(files) ? files.length : 0;
  const currentPerPage = perPage ?? 100;
  const currentPage = page ?? 1;
  // When indeterminate, synthesize a count so PF computes correct firstIndex/lastIndex.
  // If hasNextPage is explicitly provided, use it to keep "next" enabled (+1).
  // Otherwise, fall back to the known item count.
  const syntheticItemCount = isIndeterminate
    ? (currentPage - 1) * currentPerPage + fileCount + (hasNextPage ? 1 : 0)
    : itemCount;

  const extraPaginationProps: Pick<PaginationProps, 'toggleTemplate'> = {};
  if (isIndeterminate) {
    extraPaginationProps.toggleTemplate = ({ firstIndex = 0, lastIndex = 0 }) =>
      defaults.labels.paginationIndeterminateToggleTemplate(firstIndex, lastIndex);
  }

  const rowHeight = 47;
  const headerHeight = 38;
  const numberOfRowsToShow = 10;
  const stickyTableHeight = rowHeight * numberOfRowsToShow + headerHeight;

  const shouldRenderDetails = shouldDetailsPanelRender({ filesToView, selectedFiles });

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
        description={defaults.labels.modalDescription(source?.name)}
        labelId="FileExplorer-modal-title"
      />
      <ModalBody id="FileExplorer-modal-body">
        <Flex direction={{ default: 'column' }}>
          {typeof onSelectSource === 'function' && (
            <FlexItem>
              <SourceSelector source={source} sources={sources} onSelectSource={onSelectSource} />
            </FlexItem>
          )}
          <FlexItem className="pf-v6-u-mb-md">
            <PathBreadcrumbs
              directories={directories}
              source={source}
              onNavigate={onNavigate}
              onNavigateRoot={onNavigateRoot}
              loading={loading}
            />
          </FlexItem>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem grow={{ default: 'grow' }}>
                <SearchInput
                  id="FileExplorer-search-input"
                  className="pf-v6-u-w-50"
                  aria-label={defaults.labels.searchAriaLabel}
                  placeholder={defaults.labels.searchPlaceholder(
                    directories && directories.length > 0
                      ? directories[directories.length - 1].name
                      : source?.name,
                  )}
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
                  isDisabled={isEmpty}
                />
              </FlexItem>
              <FlexItem>
                <Pagination
                  widgetId="FileExplorer-table-pagination"
                  itemCount={syntheticItemCount}
                  perPage={currentPerPage}
                  page={currentPage}
                  onSetPage={(_event, newPage) => onSetPage?.(newPage)}
                  onPerPageSelect={(_event, newPerPage) => onPerPageSelect?.(newPerPage)}
                  isDisabled={loading || isEmpty}
                  isCompact
                  {...extraPaginationProps}
                />
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Grid hasGutter>
              <GridItem
                span={shouldRenderDetails.panel ? 8 : 12}
                style={{ height: `${stickyTableHeight}px` }}
              >
                <FilesTable
                  files={files}
                  selectedFiles={selectedFiles}
                  setSelectedFiles={setSelectedFiles}
                  selection={selection}
                  onDirectoryClick={onDirectoryClick}
                  onViewDetails={(file) => setFilesToView([file])}
                  isEmpty={isEmpty}
                  emptyStateProps={emptyStateProps}
                  loading={loading}
                  perPage={currentPerPage}
                />
              </GridItem>
              {shouldRenderDetails.panel && (
                <GridItem span={4}>
                  <DetailsPanel
                    source={source}
                    selectedFiles={selectedFiles}
                    filesToView={filesToView}
                    onViewDetails={(file) => setFilesToView([file])}
                    onRemoveSelection={(file) =>
                      setSelectedFiles(selectedFiles.filter((f) => f.path !== file.path))
                    }
                    onClearDetails={() => setFilesToView([])}
                  />
                </GridItem>
              )}
            </Grid>
          </FlexItem>
        </Flex>
      </ModalBody>
      <ModalFooter>
        <Button
          key="select-files"
          variant="primary"
          isDisabled={loading || isEmpty}
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
