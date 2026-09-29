import * as React from 'react';
import { Button } from '@patternfly/react-core';
import ManageProjectModal from './ManageProjectModal';

type NewProjectButtonProps = {
  closeOnCreate?: boolean;
  onProjectCreated?: (projectName: string) => void;
  waitForProjectOnClose?: boolean;
};

const NewProjectButton: React.FC<NewProjectButtonProps> = ({
  closeOnCreate,
  onProjectCreated,
  waitForProjectOnClose,
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button data-testid="create-project" variant="primary" onClick={() => setOpen(true)}>
        Create project
      </Button>
      {open && (
        <ManageProjectModal
          waitForProjectOnClose={waitForProjectOnClose}
          onClose={(newProjectName) => {
            if (newProjectName) {
              onProjectCreated?.(newProjectName);
              if (closeOnCreate) {
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
