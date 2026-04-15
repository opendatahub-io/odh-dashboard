import React from 'react';
import { FormGroup, HelperText, Form, FormHelperText } from '@patternfly/react-core';
import ProjectSelector from '#~/concepts/projects/ProjectSelector';
import { Connection } from '#~/concepts/connectionTypes/types';
import ContentModal from '#~/components/modals/ContentModal';
import { ModelLocationType } from '#~/concepts/modelRegistry/types';
import { ConnectionDropdown } from './ConnectionDropdown';

export const ConnectionModal: React.FC<{
  type: ModelLocationType;
  onClose: () => void;
  onSubmit: (connection: Connection) => void;
}> = ({ type, onClose, onSubmit }) => {
  const [project, setProject] = React.useState<string | undefined>(undefined);
  const [connection, setConnection] = React.useState<Connection | undefined>(undefined);
  const modelLocationType = type === ModelLocationType.ObjectStorage ? 'object storage' : 'URI';

  const handleClose = () => {
    setProject(undefined);
    setConnection(undefined);
    onClose();
  };

  return (
    <ContentModal
      title="Autofill from connection"
      description={`Select a project to list its ${modelLocationType} connections. Select a connection to autofill the model location.`}
      onClose={handleClose}
      dataTestId="connection-autofill-modal"
      contents={
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
      }
      buttonActions={[
        {
          label: 'Autofill',
          onClick: () => {
            if (connection) {
              onSubmit(connection);
            }
          },
          variant: 'primary',
          isDisabled: !connection,
          dataTestId: 'autofill-modal-button',
        },
        {
          label: 'Cancel',
          onClick: handleClose,
          variant: 'link',
          dataTestId: 'cancel-autofill-button',
        },
      ]}
    />
  );
};
