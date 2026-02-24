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
}
export type Files = [File];

// Globals -------------------------------------------------------------------->

// Components ----------------------------------------------------------------->

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SourceSelectorProps {}
const SourceSelector: React.FC<SourceSelectorProps> = () => <div>Source Selector</div>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface FilesTableProps {}
const FilesTable: React.FC<FilesTableProps> = () => {
  const columns = {
    name: 'Name',
    type: 'Type',
    size: 'Size',
  };
  const files = [
    {
      name: 'FooFile.md',
      type: 'markdown',
      size: 1000000000,
    },
  ];

  return (
    <Table aria-label="Simple table" variant="compact" borders={false}>
      <Caption>FooConnection (999)</Caption>
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
  isOpen: boolean;
  onClose: (_event: KeyboardEvent | React.MouseEvent) => void;
  onSelect: (files: Files) => void;
}
const FileExplorer: React.FC<FileExplorerProps> = ({ isOpen, onClose, onSelect }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    variant="large"
    aria-labelledby="FileExplorer-modal-title"
    aria-describedby="FileExplorer-modal-body"
  >
    <ModalHeader
      title="Select documents from connections"
      description="Select which files to use for your data collection and evaluation sources"
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
        Select files
      </Button>
      <Button key="cancel" variant="link" onClick={onClose}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

// Public --------------------------------------------------------------------->

export default FileExplorer;

// Private -------------------------------------------------------------------->
