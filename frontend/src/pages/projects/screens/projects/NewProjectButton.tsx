import * as React from 'react';
import { Button } from '@patternfly/react-core';
import ManageProjectModal from './ManageProjectModal';
import { fireTrackingEvent } from '~/utilities/segmentIOUtils';
import { TrackingOutcome } from '~/types';

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
          fireTrackingEvent('NewProject Created', {
            outcome: newProjectName ? TrackingOutcome.submit : TrackingOutcome.cancel,
            success: onProjectCreated != null,
          });
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
    </>
  );
};

export default NewProjectButton;
