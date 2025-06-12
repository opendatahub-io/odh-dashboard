import React from 'react';
import {
  Button,
  FormGroup,
  HelperText,
  Form,
  FormHelperText,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import ProjectSelector from '#~/concepts/projects/ProjectSelector';
import { Connection } from '#~/concepts/connectionTypes/types';
import { ConnectionDropdown } from './ConnectionDropdown';
import { ModelLocationType } from './useRegisterModelData';

export const ConnectionModal: React.FC<{
  type: ModelLocationType;
  onClose: () => void;
  onSubmit: (connection: Connection) => void;
}> = ({ type, onClose, onSubmit }) => {
  const [project, setProject] = React.useState<string | undefined>(undefined);
  const [connection, setConnection] = React.useState<Connection | undefined>(undefined);
  const modelLocationType = type === ModelLocationType.ObjectStorage ? 'object storage' : 'URI';

  return (
    <Modal
      isOpen
      data-testid="connection-autofill-modal"
      variant="medium"
      onClose={() => {
        setProject(undefined);
        setConnection(undefined);
        onClose();
      }}
    >
      <ModalHeader
        title="Autofill from connection"
        description={`Select a project to list its ${modelLocationType} connections. Select a connection to autofill the model location.`}
      />
      <ModalBody>
        <Form>
          <FormGroup label="Project" isRequired fieldId="autofillProject">
            <ProjectSelector
              isFullWidth
              onSelection={(projectName: string) => {
                setProject(projectName);
                setConnection(undefined);
              }}
              namespace={project || ''}
              invalidDropdownPlaceholder="Select project"
            />
          </FormGroup>
          <FormGroup label="Connection name" isRequired fieldId="autofillConnection">
            <ConnectionDropdown
              type={type}
              onSelect={setConnection}
              selectedConnection={connection}
              project={project}
            />
            <FormHelperText>
              <HelperText>
                {modelLocationType !== 'URI'
                  ? `Connection list includes only ${modelLocationType} types that contain a bucket.`
                  : `Connection list includes only ${modelLocationType} types.`}
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={!connection}
          data-testid="autofill-modal-button"
          key="confirm"
          onClick={() => {
            if (connection) {
              onSubmit(connection);
            }
          }}
        >
          Autofill
        </Button>
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
