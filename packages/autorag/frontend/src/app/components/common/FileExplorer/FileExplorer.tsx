// Modules -------------------------------------------------------------------->

import {
  Button,
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
  path: string;
  type: string;
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
    sourceSelector: 'Source Selector',
    modalTitle: 'Select documents from connections',
    modalDescription: 'Select which files to use for your data collection and evaluation sources',
    modalPrimaryCTA: 'Select files',
    modalSecondaryCTA: 'Cancel',
    sourceCaption: 'Files',
    tableAriaLabel: 'Files table',
    tableColumnName: 'Name',
    tableColumnType: 'Type',
    tableColumnSize: 'Size',
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

interface FileExplorerProps {
  id?: string;
  isOpen: boolean;
  onClose: (_event: KeyboardEvent | React.MouseEvent) => void;
  sources?: Sources;
  source?: Source;
  files?: Files;
  onSelectSource: (source: Source) => void;
  onPrimary: (files: Files) => void;
}
const FileExplorer: React.FC<FileExplorerProps> = ({
  id,
  isOpen,
  onClose,
  sources,
  source,
  files,
  onSelectSource,
  onPrimary,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);

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
          <FlexItem>
            <Grid>
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
                <div>Details panel</div>
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
