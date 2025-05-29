import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import PipelineVersionImportModal from '~/concepts/pipelines/content/import/PipelineVersionImportModal';

type ImportPipelineVersionButtonProps = {
  selectedPipeline: PipelineKF | null;
  onCreate?: (pipelineVersion: PipelineVersionKF, pipeline?: PipelineKF | null) => void;
  redirectAfterImport?: boolean;
} & Omit<React.ComponentProps<typeof Button>, 'onClick'>;

const ImportPipelineVersionButton: React.FC<ImportPipelineVersionButtonProps> = ({
  selectedPipeline,
  onCreate,
  children,
  redirectAfterImport,
  ...buttonProps
}) => {
  const { apiAvailable, refreshAllAPI } = usePipelinesAPI();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        data-testid="import-pipeline-version-button"
        {...buttonProps}
        isDisabled={!apiAvailable || buttonProps.isDisabled}
        onClick={() => setOpen(true)}
      >
        {children || 'Upload new version'}
      </Button>
      {open && (
        <PipelineVersionImportModal
          redirectAfterImport={redirectAfterImport}
          existingPipeline={selectedPipeline}
          onClose={(pipelineVersion, pipeline) => {
            setOpen(false);
            if (pipelineVersion) {
              if (onCreate) {
                onCreate(pipelineVersion, pipeline);
              }
              refreshAllAPI();
            }
          }}
        />
      )}
    </>
  );
};

export default ImportPipelineVersionButton;
