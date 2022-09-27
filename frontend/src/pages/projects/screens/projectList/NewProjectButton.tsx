import * as React from 'react';
import { Button } from '@patternfly/react-core';
import ManageProjectModal from './ManageProjectModal';

const NewProjectButton: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Create data science project
      </Button>
      <ManageProjectModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default NewProjectButton;
