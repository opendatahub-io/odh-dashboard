import * as React from 'react';
import { Button, Form, Modal } from '@patternfly/react-core';
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
import NameDescriptionField from '../../components/NameDescriptionField';

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
  const [nameDesc, setNameDesc] = React.useState({ name: '', description: '' });
  const { username } = useUser();
  const { dashboardNamespace } = useDashboardNamespace();

  const canSubmit = !fetching && nameDesc.name.length > 0;

  const editNameValue = editProjectData ? getProjectDisplayName(editProjectData) : '';
  const editDescriptionValue = editProjectData ? getProjectDescription(editProjectData) : '';
  React.useEffect(() => {
    setNameDesc({ name: editNameValue, description: editDescriptionValue });
  }, [editDescriptionValue, editNameValue]);

  const onBeforeClose = () => {
    onClose();
    setFetching(false);
    setNameDesc({ name: '', description: '' });
  };

  const submit = () => {
    setFetching(true);
    const { name, description } = nameDesc;
    if (editProjectData) {
      updateProject(editProjectData, name, description).then(() => onBeforeClose());
    } else {
      createProject(username, name, description).then((project) => {
        const projectName = project.metadata.name;
        const rbName = `${projectName}-image-pullers`;
        const roleBindingData = generateRoleBindingData(rbName, dashboardNamespace, projectName);
        createRoleBinding(roleBindingData).then(() => navigate(`/projects/${projectName}`));
      });
    }
  };

  return (
    <Modal
      title={editProjectData ? 'Edit data science project' : 'Create data science project'}
      variant="medium"
      isOpen={open}
      onClose={onBeforeClose}
      actions={[
        <Button key="confirm" variant="primary" isDisabled={!canSubmit} onClick={submit}>
          {editProjectData ? 'Update' : 'Create'}
        </Button>,
        <Button key="cancel" variant="link" onClick={onBeforeClose}>
          Cancel
        </Button>,
      ]}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <NameDescriptionField
          nameFieldId="manage-project-modal-name"
          descriptionFieldId="manage-project-modal-description"
          data={nameDesc}
          setData={setNameDesc}
          autoFocusName
        />
      </Form>
    </Modal>
  );
};

export default ManageProjectModal;
