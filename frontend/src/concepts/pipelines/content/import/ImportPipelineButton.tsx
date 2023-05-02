import * as React from 'react';
import { Button } from '@patternfly/react-core';
import PipelineImportModal from '~/concepts/pipelines/content/import/PipelineImportModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type ImportPipelineButtonProps = Omit<React.ComponentProps<typeof Button>, 'onClick'>;

const ImportPipelineButton: React.FC<ImportPipelineButtonProps> = ({
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
        onClose={(imported) => {
          setOpen(false);
          if (imported) {
            refreshAllAPI();
          }
        }}
      />
    </>
  );
};

export default ImportPipelineButton;
