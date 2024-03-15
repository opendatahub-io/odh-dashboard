import * as React from 'react';
import { Button } from '@patternfly/react-core';
import ManageBYONImageModal from './BYONImageModal/ManageBYONImageModal';

type ImportBYONImageButtonProps = {
  refresh: () => void;
};

const ImportBYONImageButton: React.FC<ImportBYONImageButtonProps> = ({ refresh }) => {
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
      <ManageBYONImageModal
        isOpen={isOpen}
        onClose={(imported) => {
          if (imported) {
            refresh();
          }
          setOpen(false);
        }}
      />
    </>
  );
};

export default ImportBYONImageButton;
