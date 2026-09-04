import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  SearchInput,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { CollectionInfo } from '~/app/hooks/useCollections';
import { collectionDetailUrl } from '~/app/utilities/routes';
import CreateCollectionModal from './CreateCollectionModal';
import DeleteCollectionModal from './DeleteCollectionModal';

type ManageCollectionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: string;
  collections: CollectionInfo[];
  onRefresh: () => void;
};

const ManageCollectionsModal: React.FC<ManageCollectionsModalProps> = ({
  isOpen,
  onClose,
  project,
  collections,
  onRefresh,
}) => {
  const [filterText, setFilterText] = React.useState('');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<CollectionInfo | null>(null);

  const filteredCollections = React.useMemo(
    () =>
      filterText
        ? collections.filter((c) => {
            const lower = filterText.toLowerCase();
            return (
              c.name.toLowerCase().includes(lower) || c.description.toLowerCase().includes(lower)
            );
          })
        : collections,
    [collections, filterText],
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setFilterText('');
          onClose();
        }}
        variant="large"
        data-testid="manage-collections-modal"
      >
        <ModalHeader title="Manage collections" />
        <ModalBody>
          <Stack hasGutter>
            <StackItem>
              <Alert variant="info" isInline title="Changes affect all project assets">
                Editing or deleting a collection updates or removes it from every asset using it
                within this project.
              </Alert>
            </StackItem>
            <StackItem>
              <Toolbar>
                <ToolbarContent>
                  <ToolbarItem>
                    <SearchInput
                      placeholder="Filter by name, descri..."
                      value={filterText}
                      onChange={(_event, value) => setFilterText(value)}
                      onClear={() => setFilterText('')}
                      data-testid="collection-filter"
                    />
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button
                      variant="primary"
                      onClick={() => setIsCreateOpen(true)}
                      data-testid="create-collection-button"
                    >
                      Create collection
                    </Button>
                  </ToolbarItem>
                </ToolbarContent>
              </Toolbar>
            </StackItem>
          </Stack>
          <Table aria-label="Collections" data-testid="collections-table">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th>Assets</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {filteredCollections.map((collection) => (
                <Tr key={collection.name}>
                  <Td dataLabel="Name">
                    <Link to={collectionDetailUrl(project, collection.name)}>
                      {collection.name}
                    </Link>
                  </Td>
                  <Td dataLabel="Description">{collection.description}</Td>
                  <Td dataLabel="Assets">
                    {collection.assetNames.length > 0 ? collection.assetNames.join(', ') : '–'}
                  </Td>
                  <Td isActionCell>
                    <Button
                      variant="plain"
                      aria-label={`Delete ${collection.name}`}
                      onClick={() => setDeleteTarget(collection)}
                      data-testid={`collection-delete-${collection.name}`}
                    >
                      <TrashIcon />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="link"
            onClick={() => {
              setFilterText('');
              onClose();
            }}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      <CreateCollectionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        project={project}
        onCreated={onRefresh}
      />

      <DeleteCollectionModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        project={project}
        collection={deleteTarget}
        onDeleted={onRefresh}
      />
    </>
  );
};

export default ManageCollectionsModal;
