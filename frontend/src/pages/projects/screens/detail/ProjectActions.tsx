import * as React from 'react';
import { Dropdown, DropdownItem, MenuToggle, DropdownList, Divider } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { getDashboardMainContainer } from '#~/utilities/utils';
import { ProjectKind } from '#~/k8sTypes';
import DeleteProjectModal from '#~/pages/projects/screens/projects/DeleteProjectModal';
import ManageProjectModal from '#~/pages/projects/screens/projects/ManageProjectModal';
import { useProjectAccessReview } from '#~/concepts/projects/accessChecks';

type Props = {
  project: ProjectKind;
};

const ProjectActions: React.FC<Props> = ({ project }) => {
  const navigate = useNavigate();
  const [canEdit, editRbacLoaded] = useProjectAccessReview('update', project.metadata.name);
  const [canDelete, deleteRbacLoaded] = useProjectAccessReview('delete', project.metadata.name);
  const [open, setOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  if (!editRbacLoaded || !deleteRbacLoaded || (!canEdit && !canDelete)) {
    return null;
  }

  const DropdownComponent = (
    <Dropdown
      onOpenChange={setOpen}
      onSelect={() => setOpen(false)}
      toggle={(toggleRef) => (
        <MenuToggle
          aria-label="Actions"
          data-testid="project-actions"
          variant="secondary"
          ref={toggleRef}
          onClick={() => {
            setOpen(!open);
          }}
        >
          Actions
        </MenuToggle>
      )}
      isOpen={open}
      popperProps={{ position: 'right', appendTo: getDashboardMainContainer() }}
    >
      <DropdownList>
        {canEdit ? (
          <DropdownItem data-testid="edit-project-action" onClick={() => setEditOpen(true)}>
            Edit project
          </DropdownItem>
        ) : null}
        {canDelete ? (
          <>
            <Divider />
            <DropdownItem data-testid="delete-project-action" onClick={() => setDeleteOpen(true)}>
              Delete project
            </DropdownItem>
          </>
        ) : null}
      </DropdownList>
    </Dropdown>
  );

  return (
    <>
      {DropdownComponent}
      {editOpen ? (
        <ManageProjectModal editProjectData={project} onClose={() => setEditOpen(false)} />
      ) : null}
      {deleteOpen ? (
        <DeleteProjectModal
          deleteData={project}
          onClose={(deleted) => {
            setDeleteOpen(false);
            if (deleted) {
              navigate('/projects');
            }
          }}
        />
      ) : null}
    </>
  );
};

export default ProjectActions;
