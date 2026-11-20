import * as React from 'react';
import { Button } from '@patternfly/react-core';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import { WhosMyAdministrator } from '@odh-dashboard/ui-core';
import ManageProjectModal from './ManageProjectModal';

const createProjectResource: AccessReviewResourceAttributes = {
  group: 'project.openshift.io',
  resource: 'projectrequests',
  verb: 'create',
};

type NewProjectButtonProps = {
  closeOnCreate?: boolean;
  onProjectCreated?: (projectName: string) => void;
};

const NewProjectButton: React.FC<NewProjectButtonProps> = ({ closeOnCreate, onProjectCreated }) => {
  const [open, setOpen] = React.useState(false);
  const [allowCreate, rbacLoaded] = useAccessReview(createProjectResource);

  if (!rbacLoaded) {
    return null;
  }

  if (!allowCreate) {
    return (
      <WhosMyAdministrator
        leadText="To request a new project, contact your administrator."
        linkTestId="create-project-admin-help"
        contentTestId="create-project-admin-help-content"
      />
    );
  }

  return (
    <>
      <Button data-testid="create-project" variant="primary" onClick={() => setOpen(true)}>
        Create project
      </Button>
      {open && (
        <ManageProjectModal
          onClose={(newProjectName) => {
            if (newProjectName) {
              if (onProjectCreated) {
                onProjectCreated(newProjectName);
              } else if (closeOnCreate) {
                setOpen(false);
              }
              return;
            }

            setOpen(false);
          }}
        />
      )}
    </>
  );
};

export default NewProjectButton;
