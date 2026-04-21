import * as React from 'react';
import { ActionList, ActionListGroup, ActionListItem, Alert, Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';

type AssignRolesFooterActionsProps = {
  hasChanges: boolean;
  onSave: () => void;
};

const AssignRolesFooterActions: React.FC<AssignRolesFooterActionsProps> = ({
  hasChanges,
  onSave,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const permissionsHref = `/projects/${currentProject.metadata.name}?section=permissions`;

  return (
    <>
      <Alert
        isInline
        variant="info"
        title="Users and groups are not notified of changes to their role assignments."
        data-testid="assign-roles-footer-alert"
      />
      <ActionList>
        <ActionListGroup>
          <ActionListItem>
            <Button
              variant="primary"
              data-testid="assign-roles-save"
              isDisabled={!hasChanges}
              onClick={onSave}
            >
              Save
            </Button>
          </ActionListItem>
          <ActionListItem>
            <Button
              variant="link"
              data-testid="assign-roles-cancel"
              onClick={() => navigate(permissionsHref)}
            >
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </>
  );
};

export default AssignRolesFooterActions;
