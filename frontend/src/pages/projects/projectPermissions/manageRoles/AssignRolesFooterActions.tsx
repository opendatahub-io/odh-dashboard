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
        title="Make sure to inform the specified user about the updated role assignments."
        data-testid="assign-roles-footer-alert"
      />
      <ActionList>
        <ActionListGroup>
          <ActionListItem>
            <Button
              variant="primary"
              data-testid="assign-roles-save"
              // TODO: implement the onSave handler in RHOAIENG-46634
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
