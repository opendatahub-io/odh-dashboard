import * as React from 'react';
import { Button, Form, FormGroup, Modal, TextArea, TextInput } from '@patternfly/react-core';
import {
  createProject,
  createRoleBinding,
  generateRoleBindingData,
  updateProject,
} from '../../../../api';
import { useNavigate } from 'react-router-dom';
import { useDashboardNamespace, useUser } from '../../../../redux/selectors';
import { ProjectKind } from '../../../../k8sTypes';
import { getProjectDescription, getProjectDisplayName } from '../../utils';

type ManageProjectModalProps = {
  editProjectData?: ProjectKind;
  open: boolean;
  onClose: () => void;
};

const ManageProjectModal: React.FC<ManageProjectModalProps> = ({
  editProjectData,
  onClose,
  open,
}) => {
  const navigate = useNavigate();
  const [fetching, setFetching] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const nameRef = React.useRef<HTMLInputElement | null>(null);
  const { username } = useUser();
  const { dashboardNamespace } = useDashboardNamespace();

  const canSubmit = !fetching && name.length > 0;

  const editNameValue = editProjectData ? getProjectDisplayName(editProjectData) : '';
  const editDescriptionValue = editProjectData ? getProjectDescription(editProjectData) : '';
  React.useEffect(() => {
    setName(editNameValue);
    setDescription(editDescriptionValue);
  }, [editDescriptionValue, editNameValue]);

  React.useEffect(() => {
    if (open) {
      nameRef.current?.focus();
    }
  }, [open]);

  const onBeforeClose = () => {
    onClose();
    setFetching(false);
    setName('');
    setDescription('');
  };

  return (
    <Modal
      title={editProjectData ? 'Edit data science project' : 'Create data science project'}
      variant="medium"
      isOpen={open}
      onClose={onBeforeClose}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          isDisabled={!canSubmit}
          onClick={() => {
            setFetching(true);
            if (editProjectData) {
              updateProject(editProjectData, name, description).then(() => onBeforeClose());
            } else {
              createProject(username, name, description).then((project) => {
                const projectName = project.metadata.name;
                const rbName = `${projectName}-image-pullers`;
                const roleBindingData = generateRoleBindingData(
                  rbName,
                  dashboardNamespace,
                  projectName,
                );
                createRoleBinding(roleBindingData).then(() => navigate(`/projects/${projectName}`));
              });
            }
          }}
        >
          {editProjectData ? 'Update' : 'Create'}
        </Button>,
        <Button key="cancel" variant="link" onClick={onBeforeClose}>
          Cancel
        </Button>,
      ]}
    >
      <Form>
        <FormGroup label="Name" isRequired fieldId="project-name">
          <TextInput
            ref={nameRef}
            isRequired
            type="text"
            value={name}
            onChange={(value) => setName(value)}
            placeholder="Project name"
            aria-label="Project name"
          />
        </FormGroup>
        <FormGroup label="Description" fieldId="project-description">
          <TextArea
            placeholder="Project description"
            value={description}
            onChange={(value) => setDescription(value)}
            aria-label="Project description"
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default ManageProjectModal;
