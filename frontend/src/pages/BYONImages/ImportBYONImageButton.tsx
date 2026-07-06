import * as React from 'react';
import { Button } from '@patternfly/react-core';
import ManageBYONImageModal from './BYONImageModal/ManageBYONImageModal';

const ImportBYONImageButton: React.FC = () => {
  const [isOpen, setOpen] = React.useState(false);
  return (
    <>
      <Button
        data-testid="import-new-image"
        onClick={() => {
          setOpen(true);
        }}
      >
        Import new image
      </Button>
      {isOpen ? (
        <ManageBYONImageModal
          onClose={() => {
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
};

export default ImportBYONImageButton;
