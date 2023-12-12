import { Button } from '@patternfly/react-core';
import * as React from 'react';
import ManageEdgeModels from './ManageEdgeModels';

const ImportModelButton: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  const handleModal = () => {
    setOpen(!open);
  };

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Add model
      </Button>
      <ManageEdgeModels
        isOpen={open}
        onClose={() => {
          setOpen(false);
        }}
        handleModal={handleModal}
      />
    </>
  );
};

export default ImportModelButton;
