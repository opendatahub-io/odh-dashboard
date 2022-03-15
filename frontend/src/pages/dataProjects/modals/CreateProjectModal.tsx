import * as React from 'react';
import { Button, Form, FormGroup, Modal, ModalVariant, TextInput } from '@patternfly/react-core';
import { useHistory } from 'react-router-dom';
import { createDataProject } from '../../../services/dataProjectsService';
import { Project } from '../../../types';

type CreateProjectModalProps = {
  isModalOpen: boolean;
  onClose: () => void;
};

const CreateProjectModal: React.FC<CreateProjectModalProps> = React.memo(
  ({ isModalOpen, onClose }) => {
    const history = useHistory();
    const [projectName, setProjectName] = React.useState('');
    const [projectDescription, setProjectDescription] = React.useState('');
    const [createProjectPending, setCreateProjectPending] = React.useState(false);
    const [createProjectFullfilled, setCreateProjectFulfilled] = React.useState(false);
    const [createProjectError, setCreateProjectError] = React.useState(undefined);
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
      setCreateProjectPending(true);
      createDataProject(projectName, projectDescription)
        .then((project: Project) => {
          setCreateProjectFulfilled(true);
          setCreateProjectError(undefined);
          history.push(`/data-projects/${project.metadata?.name}`);
        })
        .catch((e) => {
          setCreateProjectError(e);
        });
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
  },
);

CreateProjectModal.displayName = 'CreateProjectModal';

export default CreateProjectModal;
