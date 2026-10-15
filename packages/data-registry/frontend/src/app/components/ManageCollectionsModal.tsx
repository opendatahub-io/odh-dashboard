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
  TextInput,
} from '@patternfly/react-core';
import { CheckIcon, TimesIcon, TrashIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { useSettings } from 'mod-arch-core';
import { createCollection, isConflictError } from '~/app/api/dataRegistry';
import { useAssets } from '~/app/hooks/useAssets';
import { useCollections, type CollectionInfo } from '~/app/hooks/useCollections';
import { collectionDetailUrl } from '~/app/utilities/routes';
import DeleteCollectionModal from './DeleteCollectionModal';
import './ManageCollectionsModal.scss';

const COLLECTION_SEARCH_PLACEHOLDER = 'Filter by name or description';
const COLLECTION_NAME_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

type ManageCollectionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: string;
  onRefresh: () => void | Promise<void>;
};

const ManageCollectionsModal: React.FC<ManageCollectionsModalProps> = ({
  isOpen,
  onClose,
  project,
  onRefresh,
}) => {
  const { userSettings } = useSettings();
  const userId = typeof userSettings?.userId === 'string' ? userSettings.userId : '';
  const [assets, , assetsError, assetsRefresh, collectionNames] = useAssets(project);
  const [collections, , collectionsError, collectionsRefresh] = useCollections(
    project,
    assets,
    collectionNames,
  );

  const handleRefresh = React.useCallback(async () => {
    await Promise.all([assetsRefresh(), collectionsRefresh(), onRefresh()]);
  }, [assetsRefresh, collectionsRefresh, onRefresh]);
  const [filterText, setFilterText] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState('');
  const [newCollectionDescription, setNewCollectionDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CollectionInfo | null>(null);

  const nameValidationError = React.useMemo(() => {
    const trimmed = newCollectionName.trim();
    if (!trimmed) {
      return '';
    }
    if (trimmed.length > 63) {
      return 'Name must be 63 characters or fewer.';
    }
    if (!COLLECTION_NAME_REGEX.test(trimmed)) {
      return 'Name must contain only lowercase letters, numbers, and hyphens.';
    }
    return '';
  }, [newCollectionName]);

  const resetCreateForm = () => {
    setIsCreating(false);
    setNewCollectionName('');
    setNewCollectionDescription('');
    setActionError(null);
  };

  const handleCreateCollection = async () => {
    const trimmedName = newCollectionName.trim();
    if (!trimmedName || !userId.trim() || nameValidationError) {
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await createCollection(project, {
        namespace: [trimmedName],
        properties: {
          ...(newCollectionDescription.trim()
            ? { description: newCollectionDescription.trim() }
            : {}),
          owner: userId,
          // eslint-disable-next-line camelcase
          created_at: new Date().toISOString(),
          // eslint-disable-next-line camelcase
          created_by: userId,
        },
      });
      resetCreateForm();
      await handleRefresh();
    } catch (err) {
      if (isConflictError(err)) {
        setActionError(`Collection "${trimmedName}" already exists.`);
      } else {
        setActionError(err instanceof Error ? err.message : 'Failed to create collection');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
        isOpen={isOpen && deleteTarget === null}
        onClose={() => {
          setFilterText('');
          resetCreateForm();
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
            {actionError ? (
              <StackItem>
                <Alert
                  variant="danger"
                  isInline
                  title={actionError}
                  data-testid="manage-collections-action-error"
                />
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
                    <Tooltip content={COLLECTION_SEARCH_PLACEHOLDER} position="bottom">
                      <SearchInput
                        placeholder={COLLECTION_SEARCH_PLACEHOLDER}
                        value={filterText}
                        onChange={(_event, value) => setFilterText(value)}
                        onClear={() => setFilterText('')}
                        data-testid="collection-filter"
                        className="odh-data-registry-manage-collections__search"
                      />
                    </Tooltip>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setIsCreating(true);
                        setActionError(null);
                      }}
                      isDisabled={isCreating}
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
              {isCreating ? (
                <Tr data-testid="create-collection-row">
                  <Td dataLabel="Name">
                    <TextInput
                      value={newCollectionName}
                      onChange={(_event, value) => setNewCollectionName(value)}
                      placeholder="Name"
                      aria-label="New collection name"
                      isDisabled={isSubmitting}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateCollection();
                        } else if (e.key === 'Escape') {
                          resetCreateForm();
                        }
                      }}
                      data-testid="new-collection-name-input"
                      autoFocus
                    />
                  </Td>
                  <Td dataLabel="Description">
                    <TextInput
                      value={newCollectionDescription}
                      onChange={(_event, value) => setNewCollectionDescription(value)}
                      placeholder="Description"
                      aria-label="New collection description"
                      isDisabled={isSubmitting}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateCollection();
                        } else if (e.key === 'Escape') {
                          resetCreateForm();
                        }
                      }}
                      data-testid="new-collection-description-input"
                    />
                  </Td>
                  <Td dataLabel="Assets">–</Td>
                  <Td isActionCell modifier="nowrap">
                    <Button
                      variant="plain"
                      aria-label="Confirm create collection"
                      onClick={handleCreateCollection}
                      isDisabled={
                        isSubmitting ||
                        !newCollectionName.trim() ||
                        !userId.trim() ||
                        !!nameValidationError
                      }
                      data-testid="confirm-create-collection"
                    >
                      <CheckIcon />
                    </Button>
                    <Button
                      variant="plain"
                      aria-label="Cancel create collection"
                      onClick={resetCreateForm}
                      isDisabled={isSubmitting}
                      data-testid="cancel-create-collection"
                    >
                      <TimesIcon />
                    </Button>
                  </Td>
                </Tr>
              ) : null}
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
              resetCreateForm();
              onClose();
            }}
            data-testid="manage-collections-close-button"
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

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
