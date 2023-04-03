import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type ImportPipelineButtonProps = Omit<React.ComponentProps<typeof Button>, 'onClick' | 'children'>;

const ImportPipelineButton: React.FC<ImportPipelineButtonProps> = ({ ...buttonProps }) => {
  const { namespace } = usePipelinesAPI();

  return (
    <>
      <Button {...buttonProps} onClick={() => alert(`todo for ${namespace}`)}>
        Import pipeline
      </Button>
      {/* TODO: add modal */}
    </>
  );
};

export default ImportPipelineButton;
