import React from 'react';
import { Modal, Button, FormGroup, HelperText, Form } from '@patternfly/react-core';
import ProjectSelector from '~/concepts/projects/ProjectSelector';
import { DataConnection } from '~/pages/projects/types';
import { ConnectionDropdown } from './ConnectionDropdown';

export type ConnectionInfoType = {
  name: string;
  endpoint: string;
  bucket: string;
  region: string;
  path: string;
};

export const ConnectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (connection: DataConnection) => void;
}> = ({ isOpen = false, onClose, onSubmit }) => {
  const [project, setProject] = React.useState<string | undefined>(undefined);
  const [connection, setConnection] = React.useState<DataConnection | undefined>(undefined);

  return (
    <Modal
      isOpen={isOpen}
      data-testid="connection-autofill-modal"
      variant="medium"
      title="Autofill from data connection"
      description="Select a project to list its [object storage]/[URI] data connections. Select a data connection to autofill the model location."
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
          <HelperText>
            Data connection list includes only object storage types that contain a bucket.
          </HelperText>
        </FormGroup>
      </Form>
    </Modal>
  );
};
