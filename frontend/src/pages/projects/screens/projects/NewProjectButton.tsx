import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import ManageProjectModal from './ManageProjectModal';

type NewProjectButtonProps = {
  closeOnCreate?: boolean;
  onProjectCreated?: React.ComponentProps<typeof ManageProjectModal>['onProjectCreated'];
};

const NewProjectButton: React.FC<NewProjectButtonProps> = ({ closeOnCreate, onProjectCreated }) => {
  const { refresh } = React.useContext(ProjectsContext);
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Create data science project
      </Button>
      <ManageProjectModal
        onProjectCreated={(projectName) => {
          refresh().then(() => {
            if (closeOnCreate) {
              setOpen(false);
            }

            if (onProjectCreated) {
              onProjectCreated(projectName);
            }
          });
        }}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default NewProjectButton;
