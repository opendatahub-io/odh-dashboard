import * as React from 'react';
import { Button } from '@patternfly/react-core';

const NewProjectButton: React.FC = () => {
  return (
    <>
      <Button variant="primary" onClick={() => alert('Not implemented')}>
        Serve model
      </Button>
    </>
  );
};

export default NewProjectButton;
