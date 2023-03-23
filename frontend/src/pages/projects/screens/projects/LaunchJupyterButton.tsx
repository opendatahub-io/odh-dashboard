import * as React from 'react';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';

type LaunchJupyterButtonProps = {
  variant: ButtonVariant;
};

const LaunchJupyterButton: React.FC<LaunchJupyterButtonProps> = ({ variant }) => {
  const navigate = useNavigate();
  return (
    <Button
      href="/notebookController"
      variant={variant}
      onClick={(e) => {
        e.preventDefault();
        navigate('/notebookController');
      }}
    >
      Launch Jupyter
    </Button>
  );
};

export default LaunchJupyterButton;
