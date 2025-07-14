import * as React from 'react';
import {
  ActionList,
  ActionListItem,
  Bullseye,
  Button,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  Label,
  List,
  ListItem,
  Popover,
  Spinner,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import TypeaheadSelect from '#~/components/TypeaheadSelect';
import { NotebookKind } from '#~/k8sTypes';
import { ClusterStorageNotebookSelection } from '#~/pages/projects/types';
import { MOUNT_PATH_PREFIX } from '#~/pages/projects/screens/spawner/storage/const';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { MountPathFormat } from '#~/pages/projects/screens/spawner/storage/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { isMountPathFormat, mountPathFormat, mountPathSuffix } from './utils';

type ClusterStorageTableRowProps = {
  obj: ClusterStorageNotebookSelection;
  availableNotebooks: { notebooks: NotebookKind[]; loaded: boolean };
  onMountPathUpdate: (value: string, format: MountPathFormat) => void;
  onNotebookSelect: (notebookName: string) => void;
  onDelete: () => void;
  inUseMountPaths: string[];
};

const ClusterStorageTableRow: React.FC<ClusterStorageTableRowProps> = ({
  obj,
  availableNotebooks,
  onMountPathUpdate,
  onNotebookSelect,
  onDelete,
  inUseMountPaths,
}) => {
  const suffix = mountPathSuffix(obj.mountPath.value);
  const format = mountPathFormat(obj.mountPath.value);

  const pathFormatOptions = [
    {
      type: MountPathFormat.STANDARD,
      description: `Standard paths that begins with ${MOUNT_PATH_PREFIX} are visible in JupyterLab file browser.`,
    },
    {
      type: MountPathFormat.CUSTOM,
      description: `Custom paths that do not begin with ${MOUNT_PATH_PREFIX} are not visible in the JupyterLab file browser.`,
    },
  ];

  const selectOptions = availableNotebooks.notebooks.map((notebook) => ({
    value: notebook.metadata.name,
    content: getDisplayNameFromK8sResource(notebook),
  }));

  let placeholderText: string;

  if (!availableNotebooks.loaded) {
    placeholderText = 'Loading workbenches';
  } else if (selectOptions.length === 0) {
    placeholderText = 'No existing workbench available';
  } else {
    placeholderText = 'Select a workbench';
  }

  return (
    <Tr style={{ verticalAlign: 'baseline' }}>
      <Td visibility={['hidden']} />
      <Td dataLabel="Name">
        {!obj.existingPvc ? (
          <TypeaheadSelect
            shouldFocusToggleOnSelect
            placeholder={placeholderText}
            isDisabled={!availableNotebooks.loaded}
            selectOptions={selectOptions}
            selected={obj.name}
            onClearSelection={() => onNotebookSelect('')}
            onSelect={(_ev, selectedValue) => {
              if (typeof selectedValue === 'string') {
                onNotebookSelect(selectedValue);
              }
            }}
            previewDescription={false}
            dataTestId="cluster-storage-workbench-select"
          />
        ) : (
          <>
            {obj.notebookDisplayName ?? obj.name}{' '}
            <Label isCompact color="green">
              Connected
            </Label>
          </>
        )}
      </Td>
      <Td dataLabel="Path format">
        <SimpleSelect
          isFullWidth
          popperProps={{ maxWidth: '350px', direction: 'down' }}
          options={pathFormatOptions.map(
            (option): SimpleSelectOption => ({
              ...option,
              label: option.type,
              description: option.description,
              key: option.type,
            }),
          )}
          value={format}
          onChange={(newSelection) => {
            if (isMountPathFormat(newSelection)) {
              onMountPathUpdate(suffix, newSelection);
            }
          }}
          previewDescription={false}
        />
      </Td>
      <Td dataLabel="Mount path">
        <Stack>
          <StackItem>
            <InputGroup>
              <InputGroupText style={{ whiteSpace: 'nowrap' }}>
                {format === MountPathFormat.STANDARD ? MOUNT_PATH_PREFIX : '/'}
              </InputGroupText>

              <InputGroupItem isFill>
                <TextInput
                  id="mount-path-input"
                  data-testid="mount-path-folder-value"
                  aria-label="Mount path suffix"
                  type="text"
                  value={suffix}
                  onChange={(_, value) => onMountPathUpdate(value, format)}
                  isRequired
                  validated={obj.mountPath.error ? 'error' : 'success'}
                />
              </InputGroupItem>
            </InputGroup>
          </StackItem>
          <StackItem>
            <HelperText>
              {obj.mountPath.error && (
                <HelperTextItem variant="error" data-testid="mount-path-folder-helper-text">
                  {obj.mountPath.error.includes(`This path is already connected`) ? (
                    <div>
                      {obj.mountPath.error}.{' '}
                      <Popover
                        headerContent={`Mount paths connected to ${obj.name} workbench`}
                        bodyContent={
                          inUseMountPaths.length > 0 ? (
                            <List>
                              {inUseMountPaths.map((mountPath, i) => (
                                <ListItem key={i}>{mountPath}</ListItem>
                              ))}
                            </List>
                          ) : (
                            <Bullseye>
                              <Spinner size="sm" />
                              Loading
                            </Bullseye>
                          )
                        }
                      >
                        <Button component="span" size="sm" variant="link" isInline>
                          View connection paths
                        </Button>
                      </Popover>
                    </div>
                  ) : (
                    obj.mountPath.error
                  )}
                </HelperTextItem>
              )}
            </HelperText>
          </StackItem>
        </Stack>
      </Td>
      <Td isActionCell style={{ textAlign: 'right' }}>
        <ActionList isIconList>
          <ActionListItem>
            <Button
              data-testid="remove-displayed-content-button"
              aria-label="Remove displayed content"
              variant="plain"
              onClick={onDelete}
            >
              <MinusCircleIcon />
            </Button>
          </ActionListItem>
        </ActionList>
      </Td>
    </Tr>
  );
};

export default ClusterStorageTableRow;
