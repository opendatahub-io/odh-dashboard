// Modules -------------------------------------------------------------------->

import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Dropdown,
  DropdownItem,
  DropdownList,
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
  SearchInput,
} from '@patternfly/react-core';
import {
  OuterScrollContainer,
  InnerScrollContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@patternfly/react-table';
import React, { useState } from 'react';

// Types ---------------------------------------------------------------------->

export interface Source {
  name: string;
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
}
export type Files<T extends File = File> = T[];

export interface Directory extends File {
  type: 'directory';
  items: number;
}

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
    tableColumnItems: 'Items',

    tableItemsSingular: 'item',
    tableItemsPlural: 'items',

    detailsPanelTitle: 'Details',
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
    return <p>{defaults.labels.noSourcesMessage}</p>;
  }

  const sourceLabel = (s: Source) => (s.count !== undefined ? `${s.name} (${s.count})` : s.name);

  return (
    <Flex direction={{ default: 'row' }} alignItems={{ default: 'alignItemsCenter' }}>
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
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface FilesTableProps {
  files?: Files;
  selectedFiles?: Files;
  setSelectedFiles: (files: Files) => void;
}
const FilesTable: React.FC<FilesTableProps> = ({ files, selectedFiles, setSelectedFiles }) => {
  const columns = {
    name: defaults.labels.tableColumnName,
    type: defaults.labels.tableColumnType,
    items: defaults.labels.tableColumnItems,
  };

  // TODO [ Gustavo ] Render an empty state if files.length === 0. See https://www.patternfly.org/components/table#empty-state

  return (
    <OuterScrollContainer>
      <InnerScrollContainer>
        <Table
          aria-label={defaults.labels.tableAriaLabel}
          variant="compact"
          borders={false}
          isStickyHeader
        >
          <Thead>
            <Tr>
              <Th isStickyColumn width={10} screenReaderText="File select" />
              <Th isStickyColumn width={40}>
                {columns.name}
              </Th>
              <Th isStickyColumn width={40}>
                {columns.type}
              </Th>
              <Th isStickyColumn width={10}>
                {columns.items}
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {Array.isArray(files) &&
              files.map((file, fileIndex) => (
                <Tr key={file.name}>
                  <Td
                    select={{
                      rowIndex: fileIndex,
                      onSelect: () => setSelectedFiles([file]),
                      isSelected: Array.isArray(selectedFiles) && selectedFiles.includes(file),
                      isDisabled: false,
                      variant: 'radio',
                    }}
                  />
                  <Td dataLabel={columns.name}>{file.name}</Td>
                  <Td dataLabel={columns.type}>
                    {file.type === 'directory' ? defaults.labels.fileTypeDirectory : file.type}
                  </Td>
                  <Td dataLabel={columns.items}>
                    {typeof file.items === 'number' && (
                      <Label variant="outline" color="green">
                        {file.items}{' '}
                        {file.items > 0
                          ? defaults.labels.tableItemsPlural
                          : defaults.labels.tableItemsSingular}
                      </Label>
                    )}
                  </Td>
                </Tr>
              ))}
          </Tbody>
        </Table>
        <Pagination
          widgetId="FileExplorer-table-pagination"
          itemCount={0}
          perPage={100}
          page={1}
          onSetPage={() => null}
          onPerPageSelect={() => null}
          isSticky
          variant={PaginationVariant.bottom}
        />
      </InnerScrollContainer>
    </OuterScrollContainer>
  );
};

interface PathBreadcrumbsProps {
  directories?: Directory[];
  rootLabel?: string;
  onNavigate?: (directory: Directory) => void;
}
const PathBreadcrumbs: React.FC<PathBreadcrumbsProps> = ({
  directories,
  rootLabel = 'Root',
  onNavigate,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dirs = Array.isArray(directories) ? directories : [];
  const shouldCollapse = dirs.length > BREADCRUMB_COLLAPSE_THRESHOLD;
  const leadingDirs = shouldCollapse ? dirs.slice(0, BREADCRUMB_LEADING_VISIBLE) : [];
  const hiddenDirs = shouldCollapse
    ? dirs.slice(BREADCRUMB_LEADING_VISIBLE, dirs.length - BREADCRUMB_TRAILING_VISIBLE)
    : [];
  const visibleDirs = shouldCollapse ? dirs.slice(dirs.length - BREADCRUMB_TRAILING_VISIBLE) : dirs;

  return (
    <Breadcrumb>
      <BreadcrumbItem>{rootLabel}</BreadcrumbItem>
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

interface FileDetailsPanelProps {
  bucket?: string;
  path?: string;
  selectedFiles?: Files;
}
const FileDetailsPanel: React.FC<FileDetailsPanelProps> = ({ bucket, path, selectedFiles }) => (
  <Card isFullHeight>
    <CardTitle>{defaults.labels.detailsPanelTitle}</CardTitle>
    <CardBody>
      <DescriptionList>
        {bucket && (
          <DescriptionListGroup>
            <DescriptionListTerm>Bucket</DescriptionListTerm>
            <DescriptionListDescription>{bucket}</DescriptionListDescription>
          </DescriptionListGroup>
        )}
        {path && (
          <DescriptionListGroup>
            <DescriptionListTerm>Path</DescriptionListTerm>
            <DescriptionListDescription>{path}</DescriptionListDescription>
          </DescriptionListGroup>
        )}
        {Array.isArray(selectedFiles) && selectedFiles.length > 0 && (
          <DescriptionListGroup>
            <DescriptionListTerm>Selected files</DescriptionListTerm>
            <DescriptionListDescription>
              {selectedFiles.map((f) => f.name).join(', ')}
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
    </CardBody>
  </Card>
);

interface FileExplorerProps {
  id?: string;
  isOpen: boolean;
  onClose: (_event: KeyboardEvent | React.MouseEvent) => void;
  sources?: Sources;
  source?: Source;
  files?: Files;
  directories?: Directory[];
  rootLabel?: string;
  bucket?: string;
  path?: string;
  onSelectSource: (source: Source) => void;
  onNavigate?: (directory: Directory) => void;
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
  rootLabel,
  bucket,
  path,
  onSelectSource,
  onNavigate,
  onPrimary,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const rowHeight = 37;
  const headerHeight = 38;
  const paginationHeight = 53;
  return (
    <Modal
      id={id}
      isOpen={isOpen}
      onClose={onClose}
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
              onChange={(_event, value) => setSearchQuery(value)}
              onClear={() => setSearchQuery('')}
              resultsCount={0}
            />
          </FlexItem>
          <FlexItem>
            <PathBreadcrumbs
              directories={directories}
              rootLabel={rootLabel}
              onNavigate={onNavigate}
            />
          </FlexItem>
          <FlexItem>
            <Grid hasGutter>
              <GridItem
                span={8}
                style={{ height: `${rowHeight * 20 + headerHeight + paginationHeight}px` }}
              >
                <FilesTable
                  files={files}
                  selectedFiles={selectedFiles}
                  setSelectedFiles={setSelectedFiles}
                />
              </GridItem>
              <GridItem span={4}>
                <FileDetailsPanel bucket={bucket} path={path} selectedFiles={selectedFiles} />
              </GridItem>
            </Grid>
          </FlexItem>
        </Flex>
      </ModalBody>
      <ModalFooter>
        <Button
          key="select-files"
          variant="primary"
          onClick={(_event) => {
            onPrimary([]);
            onClose(_event);
          }}
        >
          {defaults.labels.modalPrimaryCTA}
        </Button>
        <Button key="cancel" variant="link" onClick={onClose}>
          {defaults.labels.modalSecondaryCTA}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// Public --------------------------------------------------------------------->

export default FileExplorer;

// Private -------------------------------------------------------------------->
