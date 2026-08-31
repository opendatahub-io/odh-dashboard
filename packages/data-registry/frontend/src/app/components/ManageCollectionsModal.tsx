import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CollectionInfo } from '~/app/hooks/useCollections';
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
  const [openKebab, setOpenKebab] = React.useState<string | null>(null);

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
          <Alert variant="info" isInline isPlain title="Changes affect all project assets">
            Editing or deleting a collection updates or removes it from every asset using it within
            this project.
          </Alert>
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
                  <Td dataLabel="Name">{collection.name}</Td>
                  <Td dataLabel="Description">{collection.description}</Td>
                  <Td dataLabel="Assets">
                    {collection.assetNames.length > 0 ? collection.assetNames.join(', ') : '–'}
                  </Td>
                  <Td isActionCell>
                    <Dropdown
                      isOpen={openKebab === collection.name}
                      onSelect={() => setOpenKebab(null)}
                      onOpenChange={(open) => setOpenKebab(open ? collection.name : null)}
                      toggle={(toggleRef) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={() =>
                            setOpenKebab(openKebab === collection.name ? null : collection.name)
                          }
                          isExpanded={openKebab === collection.name}
                          variant="plain"
                          aria-label={`Actions for ${collection.name}`}
                          data-testid={`collection-kebab-${collection.name}`}
                        >
                          <EllipsisVIcon />
                        </MenuToggle>
                      )}
                    >
                      <DropdownList>
                        <DropdownItem
                          key="delete"
                          onClick={() => {
                            setDeleteTarget(collection);
                            setOpenKebab(null);
                          }}
                        >
                          Delete
                        </DropdownItem>
                      </DropdownList>
                    </Dropdown>
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
