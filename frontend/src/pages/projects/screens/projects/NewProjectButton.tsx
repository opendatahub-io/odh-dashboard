import * as React from 'react';
import { Button } from '@patternfly/react-core';
import ManageProjectModal from './ManageProjectModal';

type NewProjectButtonProps = {
  closeOnCreate?: boolean;
  onProjectCreated?: (projectName: string) => void;
};

const NewProjectButton: React.FC<NewProjectButtonProps> = ({ closeOnCreate, onProjectCreated }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Create data science project
      </Button>
      <ManageProjectModal
        open={open}
        onClose={(newProjectName) => {
          if (closeOnCreate) {
            setOpen(false);
          }

          if (newProjectName && onProjectCreated) {
            onProjectCreated(newProjectName);
          }
        }}
      />
    </>
  );
};

export default NewProjectButton;
