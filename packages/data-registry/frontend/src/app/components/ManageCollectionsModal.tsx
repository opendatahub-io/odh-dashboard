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
  Tooltip,
} from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { useAssets } from '~/app/hooks/useAssets';
import { useCollections, type CollectionInfo } from '~/app/hooks/useCollections';
import { collectionDetailUrl } from '~/app/utilities/routes';
import CreateCollectionModal from './CreateCollectionModal';
import DeleteCollectionModal from './DeleteCollectionModal';

type ManageCollectionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: string;
  onRefresh: () => void;
};

const ManageCollectionsModal: React.FC<ManageCollectionsModalProps> = ({
  isOpen,
  onClose,
  project,
  onRefresh,
}) => {
  const [assets, , assetsError, assetsRefresh, collectionNames] = useAssets(project);
  const [collections, , collectionsError, collectionsRefresh] = useCollections(
    project,
    assets,
    collectionNames,
  );

  const handleRefresh = React.useCallback(() => {
    assetsRefresh();
    collectionsRefresh();
    onRefresh();
  }, [assetsRefresh, collectionsRefresh, onRefresh]);
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
        isOpen={isOpen && !isCreateOpen && deleteTarget === null}
        onClose={() => {
          setFilterText('');
          onClose();
        }}
        variant="large"
        data-testid="manage-collections-modal"
      >
        <ModalHeader
          title="Manage collections"
          description="View and manage this project's collections. Collections are groups that you can use to organize your data assets."
        />
        <ModalBody>
          <Stack hasGutter>
            {assetsError || collectionsError ? (
              <StackItem>
                <Alert variant="danger" isInline title="Error loading data">
                  {(assetsError || collectionsError)?.message || 'Failed to load collections data.'}
                </Alert>
              </StackItem>
            ) : null}
            <StackItem>
              <Alert
                variant="info"
                isInline
                title="Remove all associated assets to delete a collection."
              />
            </StackItem>
            <StackItem>
              <Toolbar>
                <ToolbarContent>
                  <ToolbarItem>
                    <SearchInput
                      placeholder="Filter by name or description"
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
                <Th>Data assets</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {filteredCollections.map((collection) => (
                <Tr key={collection.name}>
                  <Td dataLabel="Name">
                    <Link
                      to={collectionDetailUrl(project, collection.name)}
                      onClick={() => {
                        setFilterText('');
                        onClose();
                      }}
                    >
                      {collection.name}
                    </Link>
                  </Td>
                  <Td dataLabel="Description">{collection.description}</Td>
                  <Td dataLabel="Assets">
                    {collection.assetNames.length > 0 ? collection.assetNames.join(', ') : '–'}
                  </Td>
                  <Td isActionCell>
                    {collection.assetNames.length > 0 ? (
                      <Tooltip content="Remove all associated assets to delete this collection">
                        <span>
                          <Button
                            variant="plain"
                            isDisabled
                            aria-label={`Delete ${collection.name}`}
                            data-testid={`collection-delete-${collection.name}`}
                          >
                            <TrashIcon />
                          </Button>
                        </span>
                      </Tooltip>
                    ) : (
                      <Button
                        variant="plain"
                        aria-label={`Delete ${collection.name}`}
                        onClick={() => setDeleteTarget(collection)}
                        data-testid={`collection-delete-${collection.name}`}
                      >
                        <TrashIcon />
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setFilterText('');
              onClose();
            }}
            data-testid="manage-collections-close-button"
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      <CreateCollectionModal
        isOpen={isOpen && isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        project={project}
        onCreated={handleRefresh}
      />

      <DeleteCollectionModal
        isOpen={isOpen && deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        project={project}
        collection={deleteTarget}
        onDeleted={handleRefresh}
      />
    </>
  );
};

export default ManageCollectionsModal;
