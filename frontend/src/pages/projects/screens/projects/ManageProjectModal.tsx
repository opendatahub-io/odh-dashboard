import * as React from 'react';
import { Alert, Button, Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import { createProject, updateProject } from '~/api';
import { useUser } from '~/redux/selectors';
import { ProjectKind } from '~/k8sTypes';
import { getProjectDescription, getProjectDisplayName } from '~/concepts/projects/utils';
import { isValidK8sName } from '~/concepts/k8s/utils';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { NameDescType } from '~/pages/projects/types';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';

type ManageProjectModalProps = {
  editProjectData?: ProjectKind;
  open: boolean;
  onClose: (newProjectName?: string) => void;
};

const ManageProjectModal: React.FC<ManageProjectModalProps> = ({
  editProjectData,
  onClose,
  open,
}) => {
  const { waitForProject } = React.useContext(ProjectsContext);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [nameDesc, setNameDesc] = React.useState<NameDescType>({
    name: '',
    k8sName: undefined,
    description: '',
  });
  const { username } = useUser();

  const canSubmit =
    !fetching && nameDesc.name.trim().length > 0 && isValidK8sName(nameDesc.k8sName);

  const editNameValue = editProjectData ? getProjectDisplayName(editProjectData) : '';
  const editDescriptionValue = editProjectData ? getProjectDescription(editProjectData) : '';
  const editResourceNameValue = editProjectData ? editProjectData.metadata.name : undefined;
  React.useEffect(() => {
    setNameDesc({
      name: editNameValue,
      k8sName: editResourceNameValue,
      description: editDescriptionValue,
    });
  }, [editDescriptionValue, editNameValue, editResourceNameValue]);

  const onBeforeClose = (newProjectName?: string) => {
    onClose(newProjectName);
    setFetching(false);
    setError(undefined);
    setNameDesc({ name: '', k8sName: undefined, description: '' });
  };
  const handleError = (e: Error) => {
    setError(e);
    setFetching(false);
  };

  const submit = () => {
    setFetching(true);
    const { name, description, k8sName } = nameDesc;
    if (editProjectData) {
      updateProject(editProjectData, name, description)
        .then(() => onBeforeClose())
        .catch(handleError);
    } else {
      createProject(username, name, description, k8sName)
        .then((projectName) => waitForProject(projectName).then(() => onBeforeClose(projectName)))
        .catch(handleError);
    }
  };

  return (
    <Modal
      title={editProjectData ? 'Edit data science project' : 'Create data science project'}
      variant="medium"
      isOpen={open}
      onClose={() => onBeforeClose()}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          isDisabled={!canSubmit}
          isLoading={fetching}
          onClick={submit}
        >
          {editProjectData ? 'Update' : 'Create'}
        </Button>,
        <Button key="cancel" variant="link" onClick={() => onBeforeClose()}>
          Cancel
        </Button>,
      ]}
    >
      <Stack hasGutter>
        <StackItem>
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
              showK8sName
              disableK8sName={!!editProjectData}
            />
          </Form>
        </StackItem>
        {error && (
          <StackItem>
            <Alert
              variant="danger"
              isInline
              title={editProjectData ? 'Error updating project' : 'Error creating project'}
            >
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default ManageProjectModal;
