import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import CreateExperimentModal from '~/concepts/pipelines/content/experiment/CreateExperimentModal';

type CreateExperimentButtonProps = {
  onCreate?: (experiment: ExperimentKFv2) => void;
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
      <CreateExperimentModal
        isOpen={open}
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
    </>
  );
};

export default CreateExperimentButton;
