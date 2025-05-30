import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import CreateExperimentModal from '#~/concepts/pipelines/content/experiment/CreateExperimentModal';

type CreateExperimentButtonProps = {
  onCreate?: (experiment: ExperimentKF) => void;
} & Omit<React.ComponentProps<typeof Button>, 'onClick'>;

const CreateExperimentButton: React.FC<CreateExperimentButtonProps> = ({
  onCreate,
  children,
  ...buttonProps
}) => {
  const { apiAvailable, refreshAllAPI, pipelinesServer } = usePipelinesAPI();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        {...buttonProps}
        isDisabled={!apiAvailable || buttonProps.isDisabled || !pipelinesServer.compatible}
        onClick={() => setOpen(true)}
      >
        {children || 'Create experiment'}
      </Button>
      {open ? (
        <CreateExperimentModal
          onClose={(experiment) => {
            setOpen(false);
            if (experiment) {
              if (onCreate) {
                onCreate(experiment);
              }
              refreshAllAPI();
            }
          }}
        />
      ) : null}
    </>
  );
};

export default CreateExperimentButton;
