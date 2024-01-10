import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import PipelineVersionImportModal from '~/concepts/pipelines/content/import/PipelineVersionImportModal';

type ImportPipelineVersionButtonProps = {
  pipeline: PipelineKF | null;
  onCreate?: (pipelineVersion: PipelineVersionKF) => void;
} & Omit<React.ComponentProps<typeof Button>, 'onClick'>;

const ImportPipelineVersionButton: React.FC<ImportPipelineVersionButtonProps> = ({
  pipeline,
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
        {children || 'Upload new version'}
      </Button>
      {open && (
        <PipelineVersionImportModal
          existingPipeline={pipeline}
          onClose={(pipelineVersion) => {
            setOpen(false);
            if (pipelineVersion) {
              onCreate && onCreate(pipelineVersion);
              refreshAllAPI();
            }
          }}
        />
      )}
    </>
  );
};

export default ImportPipelineVersionButton;
