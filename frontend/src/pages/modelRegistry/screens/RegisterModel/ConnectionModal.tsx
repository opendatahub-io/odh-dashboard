import React from 'react';
import { Button, FormGroup, HelperText, Form, FormHelperText } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import ProjectSelector from '~/concepts/projects/ProjectSelector';
import { DataConnection } from '~/pages/projects/types';
import { Connection } from '~/concepts/connectionTypes/types';
import { ConnectionDropdown } from './ConnectionDropdown';
import { ModelLocationType } from './useRegisterModelData';

export const ConnectionModal: React.FC<{
  type: ModelLocationType;
  onClose: () => void;
  onSubmit: (connection: DataConnection | Connection) => void;
}> = ({ type, onClose, onSubmit }) => {
  const [project, setProject] = React.useState<string | undefined>(undefined);
  const [connection, setConnection] = React.useState<DataConnection | undefined>(undefined);
  const modelLocationType = type === ModelLocationType.ObjectStorage ? 'object storage' : 'URI';

  return (
    <Modal
      isOpen
      data-testid="connection-autofill-modal"
      variant="medium"
      title="Autofill from data connection"
      description={`Select a project to list its ${modelLocationType} data connections. Select a data connection to autofill the model location.`}
      onClose={() => {
        setProject(undefined);
        setConnection(undefined);
        onClose();
      }}
      actions={[
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
        </Button>,
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>,
      ]}
    >
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
        <FormGroup label="Data connection name" isRequired fieldId="autofillConnection">
          <ConnectionDropdown
            onSelect={setConnection}
            selectedConnection={connection}
            project={project}
          />
          <FormHelperText>
            <HelperText>
              {`Data connection list includes only ${modelLocationType} types that contain a bucket.`}
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </Form>
    </Modal>
  );
};
