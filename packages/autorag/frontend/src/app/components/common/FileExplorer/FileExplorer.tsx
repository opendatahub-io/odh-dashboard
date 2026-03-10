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
  Flex,
  FlexItem,
  Grid,
  GridItem,
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
  size: string;
  type: string;
  details?: object;
}
export type Files = File[];

export interface Directory {
  name: string;
  path: string;
  childCount?: number;
}

// Globals -------------------------------------------------------------------->

const defaults = {
  labels: {
    modalTitle: 'Select documents from connections',
    modalDescription: 'Select which files to use for your data collection and evaluation sources',
    modalPrimaryCTA: 'Select files',
    modalSecondaryCTA: 'Cancel',

    sourceSelector: 'Source Selector',
    sourceCaption: 'Files',

    searchAriaLabel: 'Search input to find by name',
    searchPlaceholder: 'Find by name',

    tableAriaLabel: 'Files table',
    tableColumnName: 'Name',
    tableColumnType: 'Type',
    tableColumnSize: 'Size',

    detailsPanelTitle: 'Details',
  },
};

// Components ----------------------------------------------------------------->

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SourceSelectorProps {
  sources?: Sources;
  source?: Source;
  onSelectSource: (source: Source) => void;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SourceSelector: React.FC<SourceSelectorProps> = ({ sources, source, onSelectSource }) => (
  // TODO [ Gustavo ] When a single source is selected: render it and it's count
  // TODO [ Gustavo ] When no source is selected, render sources as PF/Label components that can be picked: Using onSelectSource
  // TODO [ Gustavo ] When no source or sources are provided render empty state
  <div data-temp-placeholder>
    <Flex direction={{ default: 'row' }}>
      <FlexItem>{defaults.labels.sourceSelector}</FlexItem>
      <FlexItem>
        {source ? `${source.name} (${source.count})` : defaults.labels.sourceCaption}
      </FlexItem>
    </Flex>
  </div>
);
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
    size: defaults.labels.tableColumnSize,
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
              <Th isStickyColumn screenReaderText="File select" />
              <Th isStickyColumn>{columns.name}</Th>
              <Th isStickyColumn>{columns.type}</Th>
              <Th isStickyColumn>{columns.size}</Th>
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
                  <Td dataLabel={columns.type}>{file.type}</Td>
                  <Td dataLabel={columns.size}>{file.size}</Td>
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
}) => (
  <Breadcrumb>
    <BreadcrumbItem>{rootLabel}</BreadcrumbItem>
    {Array.isArray(directories) &&
      directories.map((dir) => (
        <BreadcrumbItem key={dir.path} to="#" onClick={() => onNavigate?.(dir)}>
          {dir.name}
        </BreadcrumbItem>
      ))}
  </Breadcrumb>
);

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
            {/* TODO: Use a BreadCrumb w/ Dropdown if levels exceed 6 https://www.patternfly.org/components/breadcrumb#with-dropdown*/}
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
