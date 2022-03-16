import * as React from 'react';
import { useDispatch } from 'react-redux';
import { Button, Form, FormGroup, Modal, ModalVariant, TextInput } from '@patternfly/react-core';
import { useHistory } from 'react-router-dom';
import { createDataProject } from '../../../services/dataProjectsService';
import { Project } from '../../../types';
import { addNotification } from 'redux/actions/actions';

type CreateProjectModalProps = {
  isModalOpen: boolean;
  onClose: () => void;
};

enum CreateProjectStatus {
  PENDING,
  IDLE,
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = React.memo(
  ({ isModalOpen, onClose }) => {
    const history = useHistory();
    const dispatch = useDispatch();
    const [projectName, setProjectName] = React.useState('');
    const [projectDescription, setProjectDescription] = React.useState('');
    const [createProjectStatus, setCreateProjectStatus] = React.useState<CreateProjectStatus>(
      CreateProjectStatus.IDLE,
    );
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
      setCreateProjectStatus(CreateProjectStatus.PENDING);
      createDataProject(projectName, projectDescription)
        .then((project: Project) => {
          dispatch(
            addNotification({
              status: 'success',
              title: `Data project ${projectName} created successfully.`,
              timestamp: new Date(),
            }),
          );
          setCreateProjectStatus(CreateProjectStatus.IDLE);
          history.push(`/data-projects/${project.metadata?.name}`);
        })
        .catch((e) => {
          dispatch(
            addNotification({
              status: 'danger',
              title: `Error attempting to create data project ${projectName}.`,
              message: e.message,
              timestamp: new Date(),
            }),
          );
          setCreateProjectStatus(CreateProjectStatus.IDLE);
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
          <Button
            key="create"
            variant="primary"
            onClick={onCreateProject}
            isDisabled={createProjectStatus === CreateProjectStatus.PENDING}
          >
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
