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
  TextInput,
  Label,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { CheckIcon, TimesIcon, TrashIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { createLabel, deleteLabel, ApiError } from '~/app/api/dataRegistry';
import { RegistryAsset } from '~/app/hooks/useAssets';

type ManageLabelsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: string;
  labels: string[];
  assets: RegistryAsset[];
  onRefresh: () => void;
};

type LabelWithAssets = {
  name: string;
  assetNames: string[];
};

const ManageLabelsModal: React.FC<ManageLabelsModalProps> = ({
  isOpen,
  onClose,
  project,
  labels,
  assets,
  onRefresh,
}) => {
  const [filterText, setFilterText] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const [newLabelName, setNewLabelName] = React.useState('');
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingLabel, setDeletingLabel] = React.useState<string | null>(null);

  const labelsWithAssets = React.useMemo<LabelWithAssets[]>(
    () =>
      labels.map((label) => ({
        name: label,
        assetNames: assets.filter((a) => a.labels.includes(label)).map((a) => a.name),
      })),
    [labels, assets],
  );

  const filteredLabels = React.useMemo(
    () =>
      filterText
        ? labelsWithAssets.filter((l) => l.name.toLowerCase().includes(filterText.toLowerCase()))
        : labelsWithAssets,
    [labelsWithAssets, filterText],
  );

  const handleCreateLabel = async () => {
    const trimmed = newLabelName.trim();
    if (!trimmed) {
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await createLabel(project, { name: trimmed });
      setNewLabelName('');
      setIsCreating(false);
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setActionError(`Label "${trimmed}" already exists.`);
      } else {
        setActionError(err instanceof Error ? err.message : 'Failed to create label');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLabel = async (label: string) => {
    setActionError(null);
    setDeletingLabel(label);
    try {
      await deleteLabel(project, label);
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete label');
    } finally {
      setDeletingLabel(null);
    }
  };

  const handleClose = () => {
    setFilterText('');
    setIsCreating(false);
    setNewLabelName('');
    setActionError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant="large" data-testid="manage-labels-modal">
      <ModalHeader
        title="Manage labels"
        description="Create and delete labels to manage how assets are organized across this project."
      />
      <ModalBody>
        <Alert
          variant="info"
          isInline
          title="Changes affect all project assets"
          className="pf-v6-u-mb-md"
        >
          Deleting a label removes it from every asset using it within this project.
        </Alert>
        {actionError ? (
          <Alert
            variant="danger"
            isInline
            isPlain
            title={actionError}
            data-testid="manage-labels-error"
          />
        ) : null}
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput
                placeholder="Filter by label name"
                value={filterText}
                onChange={(_event, value) => setFilterText(value)}
                onClear={() => setFilterText('')}
                data-testid="label-filter"
              />
            </ToolbarItem>
            <ToolbarItem>
              <Button
                variant="primary"
                onClick={() => {
                  setIsCreating(true);
                  setActionError(null);
                }}
                isDisabled={isCreating}
                data-testid="create-label-button"
              >
                Create label
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <Table aria-label="Labels" data-testid="labels-table">
          <Thead>
            <Tr>
              <Th>Label</Th>
              <Th>Assets</Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {isCreating ? (
              <Tr data-testid="create-label-row">
                <Td dataLabel="Label" colSpan={3}>
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    flexWrap={{ default: 'nowrap' }}
                  >
                    <FlexItem style={{ maxWidth: '200px' }}>
                      <TextInput
                        value={newLabelName}
                        onChange={(_event, value) => setNewLabelName(value)}
                        placeholder="Enter label name"
                        aria-label="New label name"
                        isDisabled={isSubmitting}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateLabel();
                          } else if (e.key === 'Escape') {
                            setIsCreating(false);
                            setNewLabelName('');
                            setActionError(null);
                          }
                        }}
                        data-testid="new-label-input"
                        autoFocus
                      />
                    </FlexItem>
                    <FlexItem grow={{ default: 'grow' }} />
                    <FlexItem>
                      <Button
                        variant="plain"
                        aria-label="Confirm create label"
                        onClick={handleCreateLabel}
                        isDisabled={isSubmitting || !newLabelName.trim()}
                        data-testid="confirm-create-label"
                      >
                        <CheckIcon />
                      </Button>
                    </FlexItem>
                    <FlexItem>
                      <Button
                        variant="plain"
                        aria-label="Cancel create label"
                        onClick={() => {
                          setIsCreating(false);
                          setNewLabelName('');
                          setActionError(null);
                        }}
                        isDisabled={isSubmitting}
                        data-testid="cancel-create-label"
                      >
                        <TimesIcon />
                      </Button>
                    </FlexItem>
                  </Flex>
                </Td>
              </Tr>
            ) : null}
            {filteredLabels.map((labelInfo) => (
              <Tr key={labelInfo.name} data-testid={`label-row-${labelInfo.name}`}>
                <Td dataLabel="Label">
                  <Label isCompact variant="outline">
                    {labelInfo.name}
                  </Label>
                </Td>
                <Td dataLabel="Assets">
                  {labelInfo.assetNames.length > 0 ? labelInfo.assetNames.join(', ') : '–'}
                </Td>
                <Td isActionCell>
                  <Button
                    variant="plain"
                    aria-label={`Delete label ${labelInfo.name}`}
                    onClick={() => handleDeleteLabel(labelInfo.name)}
                    isDisabled={deletingLabel !== null}
                    data-testid={`delete-label-${labelInfo.name}`}
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
        <Button variant="link" onClick={handleClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ManageLabelsModal;
