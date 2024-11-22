import {
  ActionList,
  ActionListItem,
  Button,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  List,
  ListItem,
  Popover,
  Stack,
  StackItem,
  TextInput,
  Bullseye,
  Spinner,
  Label,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import React from 'react';
import TypeaheadSelect from '~/components/TypeaheadSelect';
import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { ClusterStorageNotebookSelection, MountPath } from '~/pages/projects/types';
import { MOUNT_PATH_PREFIX } from '~/pages/projects/screens/spawner/storage/const';
import SimpleSelect from '~/components/SimpleSelect';
import { MountPathFormat } from '~/pages/projects/screens/spawner/storage/types';
import { getNotebookPVCMountPathMap } from '~/pages/projects/notebook/utils';
import {
  getInUseMountPaths,
  isMountPathFormat,
  mountPathFormat,
  mountPathSuffix,
  validateClusterMountPath,
} from './utils';

type ClusterStorageTableRowProps = {
  obj: ClusterStorageNotebookSelection;
  connectedNotebooks: NotebookKind[];
  existingPvc?: PersistentVolumeClaimKind;
  clusterStorageName: string;
  addNotebookData: (
    notebookName?: string,
    mountPath?: MountPath,
    updatedValue?: boolean,
    existingPvc?: boolean,
  ) => void;
  availableNotebooks: { notebooks: NotebookKind[]; loaded: boolean };
  onDelete: () => void;
};

const ClusterStorageTableRow: React.FC<ClusterStorageTableRowProps> = ({
  obj,
  connectedNotebooks,
  existingPvc,
  clusterStorageName,
  addNotebookData,
  availableNotebooks,
  onDelete,
}) => {
  const inUseMountPaths = React.useMemo(
    () => getInUseMountPaths(obj.name, availableNotebooks.notebooks, existingPvc?.metadata.name),
    [availableNotebooks.notebooks, existingPvc?.metadata.name, obj.name],
  );

  React.useEffect(() => {
    if (!obj.existingPvc && !obj.isUpdatedValue) {
      const defaultPathValue = clusterStorageName
        ? `${MOUNT_PATH_PREFIX}${clusterStorageName.toLowerCase().replace(/\s+/g, '-')}-${
            obj.newRowId ?? 1
          }`
        : '';
      addNotebookData(
        undefined,
        clusterStorageName
          ? {
              value: defaultPathValue,
              error: validateClusterMountPath(defaultPathValue, inUseMountPaths),
            }
          : undefined,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterStorageName, inUseMountPaths, obj.existingPvc, obj.isUpdatedValue, obj.newRowId]);

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

  const selectOptions = React.useMemo(
    () =>
      availableNotebooks.notebooks.map((notebook) => ({
        value: notebook.metadata.name,
        content: notebook.metadata.name,
      })),
    [availableNotebooks.notebooks],
  );

  const validateAndUpdate = React.useCallback(
    (value: string, newFormat?: 'Standard' | 'Custom') => {
      const prefix = (newFormat ?? format) === MountPathFormat.STANDARD ? MOUNT_PATH_PREFIX : '/';
      const newValue = `${prefix}${value}`;

      const notebook = availableNotebooks.notebooks.find(
        (currentNotebook) => currentNotebook.metadata.name === obj.name,
      );
      const existingPath = getNotebookPVCMountPathMap(notebook)[existingPvc?.metadata.name ?? ''];
      const error = validateClusterMountPath(newValue, inUseMountPaths) || '';

      const isSamePvcPath = obj.existingPvc && newValue === existingPath;
      addNotebookData(obj.name, { value: newValue, error }, !isSamePvcPath);
    },
    [
      addNotebookData,
      availableNotebooks.notebooks,
      existingPvc?.metadata.name,
      format,
      inUseMountPaths,
      obj.existingPvc,
      obj.name,
    ],
  );

  const handleFormatChange = (newFormat: 'Standard' | 'Custom') => {
    validateAndUpdate(suffix, newFormat);
  };

  let placeholderText: string;

  if (!availableNotebooks.loaded) {
    placeholderText = 'Loading workbenches';
  } else if (selectOptions.length === 0) {
    placeholderText = 'No existing workbench available';
  } else {
    placeholderText = 'Select a workbench';
  }

  return (
    <Tr>
      <Td dataLabel="Name" style={{ paddingLeft: 'var(--pf-v5-global--spacer--sm)' }}>
        {!obj.existingPvc ? (
          <TypeaheadSelect
            shouldFocusToggleOnSelect
            placeholder={placeholderText}
            isDisabled={!availableNotebooks.loaded || selectOptions.length === 0}
            selectOptions={selectOptions}
            selected={obj.name}
            onClearSelection={() => addNotebookData('')}
            onSelect={(_ev, selectedValue) => {
              if (typeof selectedValue === 'string') {
                addNotebookData(
                  selectedValue,
                  {
                    value: obj.mountPath.value,
                    error: validateClusterMountPath(
                      obj.mountPath.value,
                      getInUseMountPaths(
                        selectedValue,
                        availableNotebooks.notebooks,
                        existingPvc?.metadata.name,
                      ),
                    ),
                  },
                  true,
                  connectedNotebooks.some((notebook) => notebook.metadata.name === selectedValue),
                );
              }
            }}
          />
        ) : (
          <>
            {obj.name}{' '}
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
          options={pathFormatOptions.map((option) => ({
            ...option,
            label: option.type,
            description: option.description,
            key: option.type,
          }))}
          value={format}
          onChange={(newSelection) => {
            if (isMountPathFormat(newSelection)) {
              handleFormatChange(newSelection);
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
                {' '}
                {format === MountPathFormat.STANDARD ? MOUNT_PATH_PREFIX : '/'}
              </InputGroupText>

              <InputGroupItem isFill>
                <TextInput
                  id="mount-path-input"
                  data-testid="mount-path-folder-value"
                  aria-label="Mount path suffix"
                  type="text"
                  value={suffix}
                  onChange={(_, value) => validateAndUpdate(value)}
                  isRequired
                  validated={obj.mountPath.error ? 'error' : 'success'}
                  onBlur={() => validateAndUpdate(suffix)}
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
