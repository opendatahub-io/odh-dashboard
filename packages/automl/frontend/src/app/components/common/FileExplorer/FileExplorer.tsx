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
  Tooltip,
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
import { EllipsisVIcon, InfoCircleIcon, OutlinedEyeIcon, TimesIcon } from '@patternfly/react-icons';
import React, { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';

// TODO [ Gustavo ] This file is ~1,130 lines containing 6+ components, types, helpers, and globals.
// Consider splitting into:
//   - FileExplorer.types.ts (Source, File, Folder, FileExplorerEmptyStateConfig, Column)
//   - FileExplorer.utils.ts (shouldDetailsPanelRender, sanitizeId, defaults, constants)
//   - components/FilesTable.tsx
//   - components/PathBreadcrumbs.tsx
//   - components/DetailsPanel.tsx (includes FileDetails, SelectedFilesDataList)
//   - components/SourceSelector.tsx

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
  details?: Record<string, RenderableDetailValue>;
  hidden?: boolean;
  selectable?: boolean;
  forceShowAsSelected?: boolean;
}
export type Files<T extends File = File> = T[];

export interface Folder extends File {
  type: 'folder';
  items: number;
}
export const isFolder = (file: File): file is Folder => file.type === 'folder';

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
    modalTitle: 'Select file or folder',
    modalDescription: (selection?: 'radio' | 'checkbox') => {
      if (selection === 'radio') {
        return 'Select 1 file or folder from this bucket to use for your data collection and evaluation sources';
      }
      if (selection === 'checkbox') {
        return 'Select which files or folders to use';
      }
      return '';
    },
    modalPrimaryCTA: 'Select files',
    modalSecondaryCTA: 'Cancel',

    folderType: 'Folder',

    sourceSelector: 'Source Selector',
    sourceCaption: 'Files',
    noSourcesMessage: 'No source of documents provided',
    sourceViewingFilesFrom: (sourceName?: string) => (
      <span>
        Viewing files from: <strong>{sourceName}</strong>
      </span>
    ),

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
    tableActionSelectFile: 'Select file',
    tableActionSelectFolder: 'Select folder',

    detailsViewingDetailsOfThisFile: 'Viewing details',
    detailsPanelTitle: 'Details',
    detailsPanelTitleFiles: 'Selected files',
    detailsPanelName: 'Name',

    emptyStateTitle: 'No files found',
    emptyStateBody: 'No files are available in the current folder.',

    paginationIndeterminateToggleTemplateMany: (first: number, last: number) => (
      <>
        <strong>
          {first} - {last}
        </strong>{' '}
        of <strong>many</strong>
      </>
    ),
    paginationIndeterminateToggleTemplateCounted: (first: number, last: number, total: number) => (
      <>
        <strong>
          {first} - {last}
        </strong>{' '}
        of <strong>{total}</strong>
      </>
    ),
  },
};

const BREADCRUMB_COLLAPSE_THRESHOLD = 6;
const BREADCRUMB_LEADING_VISIBLE = 2;
const BREADCRUMB_TRAILING_VISIBLE = 2;

const ROW_HEIGHT = 46; // Height of each row FileExplorer renders (approximate).
const HEADER_HEIGHT = 38; // Height of headers FileExplorer renders.
const NUMBER_OF_ROWS_TO_SHOW = 10;
/* PF does not have a concept of providing a number of rows to their sticky table.
 * We get-by by providing a reasonable height to the table to get 10 rows in the modal */
const STICKY_TABLE_HEIGHT = ROW_HEIGHT * NUMBER_OF_ROWS_TO_SHOW + HEADER_HEIGHT;

export const sanitizeId = (value: string): string => value.replace(/[^a-zA-Z0-9-_]/g, '-');

// Private -------------------------------------------------------------------->

export const shouldDetailsPanelRender = (state: {
  filesToView: Files | undefined;
  selectedFiles: Files | undefined;
}): { details: boolean; selected: boolean; panel: boolean } => {
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
          <Label onClick={() => onSelectSource(s)}>{sourceLabel(s)}</Label>
        </FlexItem>
      ))}
    </Flex>
  );
};
interface FilesTableProps {
  files?: Files;
  onSelectFile?: (file: File, selected: boolean) => void;
  selectedFiles?: Files;
  setSelectedFiles: (files: Files) => void;
  selection?: 'radio' | 'checkbox';
  unselectableReason?: string;
  onFolderClick?: (folder: Folder) => void;
  onViewDetails: (file: File) => void;
  onRemoveSelection: (file: File) => void;
  filesToView?: Files;
  isEmpty?: boolean;
  emptyStateProps?: FileExplorerEmptyStateConfig;
  loading?: boolean;
  perPage?: number;
}
const FilesTable: React.FC<FilesTableProps> = ({
  files,
  onSelectFile,
  selectedFiles,
  setSelectedFiles,
  selection = 'radio',
  unselectableReason,
  onFolderClick,
  onViewDetails,
  onRemoveSelection,
  filesToView,
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

  const visibleFiles = Array.isArray(files) ? files.filter((file) => !file.hidden) : [];
  const skeletonRowCount = perPage;
  const isEmpty = isEmptyProp === true || (!loading && visibleFiles.length === 0);

  return (
    <OuterScrollContainer>
      <InnerScrollContainer>
        <Table
          aria-label={defaults.labels.tableAriaLabel}
          data-testid="file-explorer-table"
          variant="compact"
          borders
          isStickyHeader
        >
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
              visibleFiles.map((file, rowIndex) => {
                const isSelected =
                  Array.isArray(selectedFiles) && selectedFiles.some((f) => f.path === file.path);
                const isFileBeingViewed =
                  Array.isArray(filesToView) && filesToView.some((f) => f.path === file.path);
                const isUnselectable = file.selectable === false;

                const onSelect = (_event: unknown, isSelecting: boolean) => {
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
                  if (isSelecting) {
                    onViewDetails(file);
                  }
                  onSelectFile?.(file, isSelecting);
                };

                const actions: IAction[] = [];
                if (!isFileBeingViewed) {
                  actions.push({
                    title: defaults.labels.tableActionViewDetails,
                    onClick: () => onViewDetails(file),
                  });
                }
                if (isSelected) {
                  actions.push({
                    title: defaults.labels.tableActionRemoveSelection,
                    onClick: () => onRemoveSelection(file),
                  });
                } else {
                  actions.push({
                    title: isFolder(file)
                      ? defaults.labels.tableActionSelectFolder
                      : defaults.labels.tableActionSelectFile,
                    onClick: (event) => onSelect(event, true),
                  });
                }

                return (
                  <Tr
                    key={file.path}
                    data-testid={`file-explorer-row-${sanitizeId(file.path)}`}
                    isSelectable={!isUnselectable}
                    isRowSelected={isSelected}
                    isClickable={!isUnselectable}
                    onRowClick={(event) => {
                      // we want to ignore clicks that propagate up from the
                      // folder link button, actions menu toggle, etc.
                      const clickedInteractiveDescendant =
                        event?.target instanceof Element &&
                        event.target.closest('a, button, input, label');
                      // when using both `onRowClick` and the radio/checkbox on the Td component,
                      // keyboard events on the Td radio/checkbox no longer trigger `onSelect`
                      // so we need handle it here instead
                      const clickedRadioOrCheckboxWithKeyboard =
                        event?.target instanceof HTMLInputElement &&
                        ['radio', 'checkbox'].includes(event.target.type) &&
                        event.nativeEvent instanceof KeyboardEvent &&
                        event.nativeEvent.code === 'Space';

                      if (
                        !isUnselectable &&
                        (!clickedInteractiveDescendant || clickedRadioOrCheckboxWithKeyboard)
                      ) {
                        onSelect(event, selection === 'checkbox' ? !isSelected : true);
                      }
                    }}
                  >
                    <Td
                      width={columns.select.width}
                      title={
                        isUnselectable &&
                        typeof unselectableReason === 'string' &&
                        unselectableReason
                          ? unselectableReason
                          : ''
                      }
                      select={{
                        rowIndex,
                        onSelect,
                        isSelected: Boolean(isSelected || file.forceShowAsSelected),
                        isDisabled: isUnselectable,
                        variant: selection,
                      }}
                    />
                    <Td width={columns.name.width} dataLabel={columns.name.label}>
                      <Flex
                        spaceItems={{ default: 'spaceItemsSm' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                        flexWrap={{ default: 'nowrap' }}
                      >
                        <FlexItem>
                          {isFolder(file) ? (
                            <Button variant="link" isInline onClick={() => onFolderClick?.(file)}>
                              <Truncate content={file.name} />
                            </Button>
                          ) : (
                            <Truncate content={file.name} />
                          )}
                        </FlexItem>
                        {!isSelected && isFileBeingViewed && (
                          <FlexItem>
                            <OutlinedEyeIcon
                              title={defaults.labels.detailsViewingDetailsOfThisFile}
                            />
                          </FlexItem>
                        )}
                      </Flex>
                    </Td>
                    <Td width={columns.type.width} dataLabel={columns.type.label}>
                      {isFolder(file) ? defaults.labels.folderType : file.type}
                    </Td>
                    <Td width={columns.actions.width} isActionCell>
                      <ActionsColumn
                        actionsToggle={({ toggleRef, onToggle, isOpen, isDisabled }) => (
                          <MenuToggle
                            aria-label={`${file.name} actions`}
                            ref={toggleRef}
                            onClick={(event) => onToggle(event)}
                            isExpanded={isOpen}
                            isDisabled={isDisabled}
                            variant="plain"
                            icon={<EllipsisVIcon />}
                          />
                        )}
                        items={actions}
                      />
                    </Td>
                  </Tr>
                );
              })}
          </Tbody>
        </Table>
      </InnerScrollContainer>
    </OuterScrollContainer>
  );
};

interface PathBreadcrumbsProps {
  folders?: Folder[];
  source?: Source;
  onNavigate?: (folder: Folder) => void;
  onNavigateRoot?: () => void;
  loading?: boolean;
}
const PathBreadcrumbs: React.FC<PathBreadcrumbsProps> = ({
  folders,
  source,
  onNavigate,
  onNavigateRoot,
  loading,
}) => {
  const rootLabel = source ? `${source.name} (root)` : 'Root';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dirs = Array.isArray(folders) ? folders : [];
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
        data-testid="file-explorer-breadcrumb-root"
        {...(!isAtRoot && onNavigateRoot
          ? {
              to: '#',
              onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                onNavigateRoot();
              },
            }
          : {})}
      >
        {rootLabel}
      </BreadcrumbItem>
      {leadingDirs.map((dir) => (
        <BreadcrumbItem
          key={dir.path}
          to="#"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            onNavigate?.(dir);
          }}
        >
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
        <BreadcrumbItem
          key={dir.path}
          to="#"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            onNavigate?.(dir);
          }}
        >
          {dir.name}
        </BreadcrumbItem>
      ))}
      {currentDir && (
        <BreadcrumbItem data-testid="file-explorer-breadcrumb-current" isActive>
          {currentDir.name}
        </BreadcrumbItem>
      )}
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
  filesToView?: Files;
  onViewDetails: (file: File) => void;
  onRemoveSelection: (file: File) => void;
}
const SelectedFilesDataList: React.FC<SelectedFilesDataListProps> = ({
  selectedFiles,
  filesToView,
  onViewDetails,
  onRemoveSelection,
}) => {
  const [openMenuFileKey, setOpenMenuFileKey] = useState<string | null>(null);

  const emptyHandler = () => null;

  return (
    <DataList
      aria-label={defaults.labels.detailsPanelTitleFiles}
      data-testid="file-explorer-selected-files"
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
                  <Flex
                    spaceItems={{ default: 'spaceItemsSm' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                    flexWrap={{ default: 'nowrap' }}
                  >
                    <FlexItem>
                      <Truncate
                        id={`selected-file-${sanitizeId(file.path)}`}
                        content={file.name}
                        tooltipPosition="right"
                      />
                    </FlexItem>
                    {selectedFiles.length > 1 &&
                      Array.isArray(filesToView) &&
                      filesToView.some((f) => f.path === file.path) && (
                        <FlexItem>
                          <OutlinedEyeIcon
                            title={defaults.labels.detailsViewingDetailsOfThisFile}
                          />
                        </FlexItem>
                      )}
                  </Flex>
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
                  {!(
                    Array.isArray(filesToView) && filesToView.some((f) => f.path === file.path)
                  ) && (
                    <DropdownItem
                      key="view-details"
                      onClick={() => {
                        onViewDetails(file);
                        setOpenMenuFileKey(null);
                      }}
                    >
                      {defaults.labels.tableActionViewDetails}
                    </DropdownItem>
                  )}
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
  selectedFiles?: Files;
  filesToView?: Files;
  onViewDetails: (file: File) => void;
  onRemoveSelection: (file: File) => void;
  onClearDetails: () => void;
}
const DetailsPanel: React.FC<DetailsPanelProps> = ({
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
              data-testid="file-explorer-close-details-btn"
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
        {Array.isArray(selectedFiles) && selectedFiles.length > 0 && (
          <SelectedFilesDataList
            selectedFiles={selectedFiles}
            filesToView={filesToView}
            onViewDetails={onViewDetails}
            onRemoveSelection={onRemoveSelection}
          />
        )}
      </CardBody>
    </Card>
  );

  const shouldRender = shouldDetailsPanelRender({ filesToView, selectedFiles });

  return (
    <Card isFullHeight isCompact data-testid="file-explorer-details-panel">
      {shouldRender.details && detailsSubCard}
      {shouldRender.details && shouldRender.selected && <Divider />}
      {shouldRender.selected && selectedFilesSubCard}
    </Card>
  );
};

interface FileExplorerProps {
  /** Optional unique identifier for the FileExplorer instance. */
  id?: string;

  /** Flag indicating whether the FileExplorer modal is open. */
  isOpen: boolean;

  /** Callback fired when the modal is closed via dismiss or cancel. */
  onClose: (_event: KeyboardEvent | React.MouseEvent) => void;

  /** List of available sources to choose from when no single source is pre-selected. */
  sources?: Sources;

  /** The currently active source. When provided, the source selector is hidden. */
  source?: Source;

  /** The list of files and folders to display in the table. */
  files?: Files;

  /** Ordered breadcrumb trail representing the current folder path. */
  folders?: Folder[];

  /** Whether a data fetch is in progress. Disables interactions and shows skeleton rows. */
  loading?: boolean;

  /** The number of results matching the current search query, displayed in the search input. */
  searchResultsCount?: number;

  /** The current page number (1-based) for server-side pagination. */
  page?: number;

  /** The number of items displayed per page. */
  perPage?: number;

  /** The total number of items across all pages. When omitted, indeterminate pagination is used. */
  itemCount?: number;

  /** Whether additional pages exist beyond the current page. Used for indeterminate pagination. */
  hasNextPage?: boolean;

  /** Forces the empty state to render, overriding the default empty-check on `files`. */
  isEmpty?: boolean;

  /** Configuration for the empty state appearance (title, body, icon, status, actions). */
  emptyStateProps?: FileExplorerEmptyStateConfig;

  /** The selection mode for file rows: `radio` for single selection, `checkbox` for multi-select. */
  selection?: 'radio' | 'checkbox';

  /** The reason that should be rendered beside a file that cannot be selected. */
  unselectableReason?: string;

  /** Callback fired when a source is selected from the source selector. */
  onSelectSource?: (source: Source) => void;

  /** Callback fired when a file is selected from the table
   * (FileExplorer maintains its own state for selected files; Using this callback is helpful for any side effects needed) */
  onSelectFile?: (file: File, selected: boolean) => void;

  /** Callback fired when a folder row is clicked in the table. */
  onFolderClick?: (folder: Folder) => void;

  /** Callback fired when a breadcrumb folder segment is clicked. */
  onNavigate?: (folder: Folder) => void;

  /** Callback fired when the root breadcrumb is clicked. */
  onNavigateRoot?: () => void;

  /** Callback fired when the search input value changes. */
  onSearch?: (query: string) => void;

  /** Callback fired when the user navigates to a different page. */
  onSetPage?: (page: number) => void;

  /** Callback fired when the user changes the number of items per page. */
  onPerPageSelect?: (perPage: number) => void;

  /** Callback fired when the primary action button is clicked, passing the selected files. */
  onPrimary: (files: Files) => void;

  /** A regex pattern describing the allowed characters in the search input. Characters not matching this pattern are stripped. */
  allowedSearchCharacters?: RegExp;

  /** A label displayed below the search input describing the allowed characters (e.g., "Only alphanumeric characters and hyphens are allowed"). */
  allowedSearchCharactersLabel?: string;
}
const FileExplorer: React.FC<FileExplorerProps> = ({
  id,
  isOpen,
  onClose,
  sources,
  source,
  files,
  folders,
  loading,
  searchResultsCount,
  page,
  perPage,
  itemCount,
  hasNextPage,
  isEmpty,
  emptyStateProps,
  selection = 'radio',
  unselectableReason,
  onSelectSource,
  onSelectFile,
  onFolderClick,
  onNavigate,
  onNavigateRoot,
  onSearch,
  onSetPage,
  onPerPageSelect,
  onPrimary,
  allowedSearchCharacters,
  allowedSearchCharactersLabel,
}) => {
  const generatedId = useId();
  const rootId = id ?? generatedId;
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);
  const [filesToView, setFilesToView] = useState<Files>([]);

  // Consider introducing a FileExplorerContext if prop drilling deepens.
  // Revisit when: a child component needs to pass props through to its own children,
  // or the FileExplorer prop list exceeds ~15-20 props. Currently manageable at 1 level deep.
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCharWarning, setShowCharWarning] = useState(false);
  const charWarningTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(charWarningTimerRef.current), []);

  const resetState = () => {
    setSelectedFiles([]);
    setFilesToView([]);
    setSearchQuery('');
  };

  const isIndeterminate = itemCount === undefined;
  const fileCount = Array.isArray(files) ? files.filter((f) => !f.hidden).length : 0;
  const currentPerPage = Math.max(1, perPage ?? 100);
  const currentPage = Math.max(1, page ?? 1);
  // When indeterminate, synthesize a count so PF computes correct firstIndex/lastIndex.
  // If hasNextPage, ensure the count exceeds the current page's capacity so PF enables "next".
  // Otherwise, report exactly the items seen so far.
  const syntheticItemCount = isIndeterminate
    ? hasNextPage
      ? currentPage * currentPerPage + 1
      : (currentPage - 1) * currentPerPage + fileCount
    : itemCount;

  const extraPaginationProps: Pick<PaginationProps, 'toggleTemplate'> = {};
  if (isIndeterminate) {
    const paginationLabelFunction = hasNextPage
      ? defaults.labels.paginationIndeterminateToggleTemplateMany
      : defaults.labels.paginationIndeterminateToggleTemplateCounted;
    extraPaginationProps.toggleTemplate = ({ firstIndex = 0, lastIndex = 0 }) =>
      paginationLabelFunction(firstIndex, lastIndex, lastIndex);
  }

  const handleNavigate = useCallback(
    (folder: Folder) => {
      onNavigate?.(folder);
      setSearchQuery('');
    },
    [onNavigate],
  );

  const handleNavigateRoot = useCallback(() => {
    onNavigateRoot?.();
    setSearchQuery('');
  }, [onNavigateRoot]);

  const handleFolderClick = useCallback(
    (folder: Folder) => {
      onFolderClick?.(folder);
      setSearchQuery('');
    },
    [onFolderClick],
  );

  const handleViewDetails = useCallback((file: File) => {
    setFilesToView([file]);
  }, []);

  const handleRemoveSelection = useCallback(
    (file: File) => {
      setSelectedFiles((prev) => prev.filter((f) => f.path !== file.path));
      setFilesToView([]);
      onSelectFile?.(file, false);
    },
    [onSelectFile],
  );

  const handleClearDetails = useCallback(() => {
    setFilesToView([]);
  }, []);

  const handleSearchChange = useCallback(
    (_event: React.SyntheticEvent, value: string) => {
      if (allowedSearchCharacters != null) {
        const sanitized = Array.from(value)
          .filter((ch) => allowedSearchCharacters.test(ch))
          .join('');
        if (sanitized.length !== value.length) {
          clearTimeout(charWarningTimerRef.current);
          setShowCharWarning(true);
          charWarningTimerRef.current = setTimeout(() => setShowCharWarning(false), 2000);
        }
        setSearchQuery(sanitized);
        onSearch?.(sanitized);
      } else {
        setSearchQuery(value);
        onSearch?.(value);
      }
    },
    [onSearch, allowedSearchCharacters],
  );

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    onSearch?.('');
  }, [onSearch]);

  const handleSetPage = useCallback(
    (_event: React.MouseEvent | React.KeyboardEvent | MouseEvent, newPage: number) => {
      onSetPage?.(newPage);
    },
    [onSetPage],
  );

  const handlePerPageSelect = useCallback(
    (_event: React.MouseEvent | React.KeyboardEvent | MouseEvent, newPerPage: number) => {
      onPerPageSelect?.(newPerPage);
    },
    [onPerPageSelect],
  );

  const shouldRenderDetails = shouldDetailsPanelRender({ filesToView, selectedFiles });

  return (
    <Modal
      elementToFocus={`#${CSS.escape(`${rootId}-FileExplorer-search-input`)}`}
      id={id}
      isOpen={isOpen}
      onClose={(e) => {
        onClose(e);
        resetState();
      }}
      variant="large"
      aria-labelledby={`${rootId}-FileExplorer-modal-title`}
      aria-describedby={`${rootId}-FileExplorer-modal-body`}
    >
      <ModalHeader
        title={defaults.labels.modalTitle}
        description={defaults.labels.modalDescription(selection)}
        labelId={`${rootId}-FileExplorer-modal-title`}
      />
      <ModalBody id={`${rootId}-FileExplorer-modal-body`}>
        <Flex direction={{ default: 'column' }}>
          {typeof onSelectSource === 'function' && (
            <FlexItem>
              <SourceSelector source={source} sources={sources} onSelectSource={onSelectSource} />
            </FlexItem>
          )}
          {source && (
            <FlexItem className="pf-v6-u-mb-md">
              <p>{defaults.labels.sourceViewingFilesFrom(source.name)}</p>
            </FlexItem>
          )}
          <FlexItem className="pf-v6-u-mb-md">
            <PathBreadcrumbs
              folders={folders}
              source={source}
              onNavigate={handleNavigate}
              onNavigateRoot={handleNavigateRoot}
              loading={loading}
            />
          </FlexItem>
          {/* Inline-Style antipattern: A strange bug in the Flex rendering of SearchInput + Tooltip(allowed chars) + Pagination causes extra height to be added to this flex item. Forcing the height to 37 (height of all items) fixes the issue for now. */}
          <FlexItem style={{ height: '37px' }}>
            <Flex alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'nowrap' }}>
              <FlexItem className="pf-v6-u-w-50">
                <SearchInput
                  searchInputId={`${rootId}-FileExplorer-search-input`}
                  data-testid="file-explorer-search"
                  inputProps={{ 'data-testid': 'file-explorer-search-input' }}
                  aria-label={defaults.labels.searchAriaLabel}
                  placeholder={defaults.labels.searchPlaceholder(
                    folders && folders.length > 0
                      ? folders[folders.length - 1].name
                      : source
                        ? `${source.name} (root)`
                        : undefined,
                  )}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClear={handleSearchClear}
                  resultsCount={searchResultsCount}
                  isDisabled={isEmpty}
                />
              </FlexItem>
              {allowedSearchCharactersLabel && (
                <FlexItem data-testid="file-explorer-search-chars-info">
                  <Tooltip
                    content={<div>{allowedSearchCharactersLabel}</div>}
                    {...(showCharWarning ? { isVisible: true } : {})}
                  >
                    <InfoCircleIcon />
                  </Tooltip>
                </FlexItem>
              )}
              <FlexItem align={{ default: 'alignRight' }}>
                <Pagination
                  data-testid="file-explorer-pagination"
                  widgetId={`${rootId}-FileExplorer-table-pagination`}
                  itemCount={syntheticItemCount}
                  perPage={currentPerPage}
                  page={currentPage}
                  onSetPage={handleSetPage}
                  onPerPageSelect={handlePerPageSelect}
                  isDisabled={loading || isEmpty}
                  isCompact
                  {...extraPaginationProps}
                />
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem grow={{ default: 'grow' }}>
            <Grid hasGutter>
              <GridItem
                span={shouldRenderDetails.panel ? 8 : 12}
                style={{ height: `${STICKY_TABLE_HEIGHT}px` }}
              >
                <FilesTable
                  files={files}
                  onSelectFile={onSelectFile}
                  selectedFiles={selectedFiles}
                  setSelectedFiles={setSelectedFiles}
                  selection={selection}
                  unselectableReason={unselectableReason}
                  onFolderClick={handleFolderClick}
                  onViewDetails={handleViewDetails}
                  onRemoveSelection={handleRemoveSelection}
                  filesToView={filesToView}
                  isEmpty={isEmpty}
                  emptyStateProps={emptyStateProps}
                  loading={loading}
                  perPage={currentPerPage}
                />
              </GridItem>
              {shouldRenderDetails.panel && (
                <GridItem span={4}>
                  <DetailsPanel
                    selectedFiles={selectedFiles}
                    filesToView={filesToView}
                    onViewDetails={handleViewDetails}
                    onRemoveSelection={handleRemoveSelection}
                    onClearDetails={handleClearDetails}
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
          data-testid="file-explorer-select-btn"
          variant="primary"
          isDisabled={loading || isEmpty || !selectedFiles.length}
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
          data-testid="file-explorer-cancel-btn"
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
