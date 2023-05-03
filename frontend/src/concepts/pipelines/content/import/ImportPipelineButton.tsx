import * as React from 'react';
import { Button } from '@patternfly/react-core';
import PipelineImportModal from '~/concepts/pipelines/content/import/PipelineImportModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';

type ImportPipelineButtonProps = {
  onCreate?: (pipeline: PipelineKF) => void;
} & Omit<React.ComponentProps<typeof Button>, 'onClick'>;

const ImportPipelineButton: React.FC<ImportPipelineButtonProps> = ({
  onCreate,
  children,
  ...buttonProps
}) => {
  const { apiAvailable, refreshAllAPI } = usePipelinesAPI();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        {...buttonProps}
        isDisabled={!apiAvailable || buttonProps.isDisabled}
        onClick={() => setOpen(true)}
      >
        {children || <>Import pipeline</>}
      </Button>
      <PipelineImportModal
        isOpen={open}
        onClose={(pipeline) => {
          setOpen(false);
          if (pipeline) {
            onCreate && onCreate(pipeline);
            refreshAllAPI();
          }
        }}
      />
    </>
  );
};

export default ImportPipelineButton;
