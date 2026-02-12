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
  const navigate = useNavigate();
  const { currentProject } = React.useContext(ProjectDetailsContext);

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
              onClick={() =>
                navigate(`/projects/${currentProject.metadata.name}?section=permissions`)
              }
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
