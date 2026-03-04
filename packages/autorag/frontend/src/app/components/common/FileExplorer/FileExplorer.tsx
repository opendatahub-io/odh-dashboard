// Modules -------------------------------------------------------------------->

import {
  Button,
  Grid,
  GridItem,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@patternfly/react-core';
import { Table, Caption, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import React from 'react';

// Types ---------------------------------------------------------------------->

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
    tableCaption: 'FooConnection (999)',
    tableAriaLabel: 'Files table',
    tableColumnName: 'Name',
    tableColumnType: 'Type',
    tableColumnSize: 'Size',
  },
};

// Components ----------------------------------------------------------------->

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SourceSelectorProps {}
const SourceSelector: React.FC<SourceSelectorProps> = () => (
  <div data-temp-placeholder>{defaults.labels.sourceSelector}</div>
);

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface FilesTableProps {}
const FilesTable: React.FC<FilesTableProps> = () => {
  const columns = {
    name: defaults.labels.tableColumnName,
    type: defaults.labels.tableColumnType,
    size: defaults.labels.tableColumnSize,
  };
  // mock data
  const files = [
    {
      name: 'FooFile.md',
      type: 'markdown',
      size: 1000000000,
    },
  ];

  return (
    <Table aria-label={defaults.labels.tableAriaLabel} variant="compact" borders={false}>
      <Caption>{defaults.labels.tableCaption}</Caption>
      <Thead>
        <Tr>
          <Th>{columns.name}</Th>
          <Th>{columns.type}</Th>
          <Th>{columns.size}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {files.map((file) => (
          <Tr key={file.name}>
            <Td dataLabel={columns.name}>{file.name}</Td>
            <Td dataLabel={columns.type}>{file.type}</Td>
            <Td dataLabel={columns.size}>{file.size}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

interface FileExplorerProps {
  id?: string;
  isOpen: boolean;
  onClose: (_event: KeyboardEvent | React.MouseEvent) => void;
  onSelect: (files: Files) => void;
}
const FileExplorer: React.FC<FileExplorerProps> = ({ id, isOpen, onClose, onSelect }) => (
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
      <Grid>
        <GridItem span={4}>
          <SourceSelector />
        </GridItem>
        <GridItem span={8}>
          <FilesTable />
        </GridItem>
      </Grid>
    </ModalBody>
    <ModalFooter>
      <Button
        key="select-files"
        variant="primary"
        onClick={(_event) => {
          onSelect([]);
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

// Public --------------------------------------------------------------------->

export default FileExplorer;

// Private -------------------------------------------------------------------->
