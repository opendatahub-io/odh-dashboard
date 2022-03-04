import * as React from 'react';
import { Button, Form, FormGroup, Modal, ModalVariant, TextInput } from '@patternfly/react-core';
import { useHistory } from 'react-router-dom';

type CreateProjectModalProps = {
  isModalOpen: boolean;
  onClose: () => void;
};

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isModalOpen, onClose }) => {
  const history = useHistory();
  const [projectName, setProjectName] = React.useState('');
  const [projectDescription, setProjectDescription] = React.useState('');
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isModalOpen && nameInputRef && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isModalOpen]);

  const handleProjectNameChange = (value: string) => setProjectName(value);
  const handleProjectDescriptionChange = (value: string) => setProjectDescription(value);

  const handleClose = () => {
    onClose();
  };

  const onCreateProject = () => {
    console.log('do something');
    history.push(`/data-projects/${projectName}`); // do this in callback function if successfully created
  };

  return (
    <Modal
      aria-label="Create data project"
      variant={ModalVariant.medium}
      title="Create data project"
      isOpen={isModalOpen}
      onClose={handleClose}
      actions={[
        <Button key="create" variant="primary" onClick={onCreateProject}>
          Create
        </Button>,
        <Button key="cancel" variant="secondary" onClick={handleClose}>
          Cancel
        </Button>,
      ]}
    >
      <Form>
        <FormGroup label="Name" isRequired fieldId="modal-create-data-project-name">
          <TextInput
            isRequired
            id="modal-create-data-project-name"
            name="modal-create-data-project-name"
            value={projectName}
            onChange={handleProjectNameChange}
            ref={nameInputRef}
          />
        </FormGroup>
        <FormGroup label="Description" fieldId="modal-create-data-project-description">
          <TextInput
            id="modal-create-data-project-description"
            name="modal-create-data-project-description"
            value={projectDescription}
            onChange={handleProjectDescriptionChange}
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default CreateProjectModal;
