import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Modal,
  Radio,
  Select,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { DEFAULT_PVC_SIZE } from '../const';

type AddStorageModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AddStorageModal: React.FC<AddStorageModalProps> = ({ isOpen, onClose }) => {
  const [isCreateNewPV, setCreateNewPV] = React.useState<boolean>(true);

  // states for creating new PV
  const [name, setName] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [size, setSize] = React.useState<string>(DEFAULT_PVC_SIZE);
  const [isConnectToAll, setConnectToAll] = React.useState<boolean>(true);
  const [workbenchSelection, setWorkbenchSelection] = React.useState<string | null>(null);
  const [workbenchSelectOpen, setWorkbenchSelectOpen] = React.useState<boolean>(false);

  // states for adding existing PV
  const [projectSelection, setProjectSelection] = React.useState<string | null>(null);
  const [projectSelectOpen, setProjectSelectOpen] = React.useState<boolean>(false);
  const [storageSelection, setStorageSelection] = React.useState<string | null>(null);
  const [storageSelectOpen, setStorageSelectOpen] = React.useState<boolean>(false);

  const clearWorkbenchSelection = () => {
    setWorkbenchSelectOpen(false);
    setWorkbenchSelection(null);
  };

  const clearProjectSelection = () => {
    setProjectSelectOpen(false);
    setProjectSelection(null);
    setStorageSelection(null);
  };

  const clearStorageSelection = () => {
    setStorageSelectOpen(false);
    setStorageSelection(null);
  };

  return (
    <Modal
      title="Add storage"
      description="Add and connect storage to your cluster"
      variant="large"
      isOpen={isOpen}
      onClose={onClose}
      showClose
      actions={[
        <Button key="add-storage-confirm" variant="primary">
          Add storage
        </Button>,
        <Button key="add-storage-cancel" variant="secondary" onClick={onClose}>
          Cancel
        </Button>,
      ]}
    >
      <Stack className="pf-u-w-50" hasGutter>
        <StackItem>
          <Radio
            id="create-new-storage-radio"
            name="create-new-storage-radio"
            label="Create new PV"
            isChecked={isCreateNewPV}
            onChange={() => setCreateNewPV(true)}
          />
          {isCreateNewPV && (
            <Form className="pf-u-pl-lg pf-u-mt-sm">
              <Stack>
                <StackItem>
                  <FormGroup className="pf-u-pb-sm" label="Name" fieldId="create-new-storage-name">
                    <TextInput
                      type="text"
                      id="create-new-storage-name"
                      name="create-new-storage-name"
                      aria-labelledby="create-new-storage-name-helper"
                      value={name}
                      onChange={(newName) => setName(newName)}
                    />
                  </FormGroup>
                </StackItem>
                <StackItem>
                  <FormGroup
                    className="pf-u-pb-md"
                    label="Description"
                    fieldId="create-new-storage-description"
                  >
                    <TextInput
                      type="text"
                      id="create-new-storage-description"
                      name="create-new-storage-description"
                      aria-labelledby="create-new-storage-description-helper"
                      value={description}
                      onChange={(newDesc) => setDescription(newDesc)}
                    />
                  </FormGroup>
                </StackItem>
                <StackItem className="pf-u-pl-sm">
                  <FormGroup role="radiogroup" fieldId="connection-options-radio-group">
                    <Radio
                      id="connect-to-all-workbenches-radio"
                      name="connect-to-all-workbenches-radio"
                      label="Connect to all workbenches"
                      isChecked={isConnectToAll}
                      onChange={() => setConnectToAll(true)}
                    />
                    <Radio
                      className="pf-u-mt-sm"
                      id="connect-to-specific-workbench-radio"
                      name="connect-to-specific-workbench-radio"
                      label="Connect to a specific workbench"
                      isChecked={!isConnectToAll}
                      onChange={() => setConnectToAll(false)}
                    />
                    {!isConnectToAll && (
                      <Select
                        className="pf-u-mt-sm pf-u-pl-lg"
                        variant="typeahead"
                        selections={workbenchSelection as string}
                        isOpen={workbenchSelectOpen}
                        onClear={clearWorkbenchSelection}
                        onToggle={(isOpen) => setWorkbenchSelectOpen(isOpen)}
                        placeholderText="Choose an existing workbench"
                        menuAppendTo="parent"
                      ></Select>
                    )}
                  </FormGroup>
                </StackItem>
                <StackItem>
                  <FormGroup className="pf-u-pt-sm" label="Size" fieldId="create-new-storage-size">
                    <Flex direction={{ default: 'row' }}>
                      <FlexItem className="pf-u-w-25">
                        <TextInput
                          type="number"
                          id="create-new-storage-size"
                          name="create-new-storage-size"
                          aria-labelledby="create-new-storage-size-helper"
                          value={Number(size)}
                          onChange={(newSize) => setSize(newSize)}
                        />
                      </FlexItem>
                      <FlexItem>
                        <span>GiB</span>
                      </FlexItem>
                    </Flex>
                  </FormGroup>
                </StackItem>
              </Stack>
            </Form>
          )}
        </StackItem>
        <StackItem>
          <Radio
            id="add-existing-storage-radio"
            name="add-existing-storage-radio"
            label="Add exisiting PV"
            isChecked={!isCreateNewPV}
            onChange={() => setCreateNewPV(false)}
          />
          {!isCreateNewPV && (
            <Form className="pf-u-pl-lg pf-u-mt-sm">
              <Stack>
                <StackItem>
                  <FormGroup
                    className="pf-u-pb-sm"
                    label="Project where the PV resides"
                    fieldId="add-existing-storage-project-selection"
                  >
                    <Select
                      variant="typeahead"
                      selections={projectSelection as string}
                      isOpen={projectSelectOpen}
                      onClear={clearProjectSelection}
                      onToggle={(isOpen) => setProjectSelectOpen(isOpen)}
                      placeholderText="Select a project"
                      menuAppendTo="parent"
                    ></Select>
                  </FormGroup>
                </StackItem>
                <StackItem>
                  <FormGroup
                    className="pf-u-pb-sm"
                    label="PV"
                    fieldId="add-existing-storage-pv-selection"
                  >
                    <Select
                      variant="typeahead"
                      selections={storageSelection as string}
                      isOpen={storageSelectOpen}
                      onClear={clearStorageSelection}
                      onToggle={(isOpen) => setStorageSelectOpen(isOpen)}
                      placeholderText="Select a PV"
                      menuAppendTo="parent"
                    ></Select>
                  </FormGroup>
                </StackItem>
              </Stack>
            </Form>
          )}
        </StackItem>
      </Stack>
    </Modal>
  );
};

export default AddStorageModal;
