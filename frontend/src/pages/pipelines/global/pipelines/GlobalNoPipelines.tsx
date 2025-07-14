import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ImportPipelineButton from '#~/concepts/pipelines/content/import/ImportPipelineButton';
import ImportPipelineSplitButton from '#~/concepts/pipelines/content/import/ImportPipelineSplitButton';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';

const GlobalNoPipelines: React.FC = () => {
  const isFineTuningAvailable = useIsAreaAvailable(SupportedArea.FINE_TUNING).status;
  return (
    <EmptyState
      headingLevel="h4"
      icon={PlusCircleIcon}
      titleText="No pipelines yet"
      data-testid="global-no-pipelines"
    >
      <EmptyStateBody>
        To get started, import a pipeline, or create one using the Jupyter visual editor.
      </EmptyStateBody>
      <EmptyStateFooter>
        {isFineTuningAvailable ? (
          <ImportPipelineSplitButton isFullWidth={false} hideUploadVersion />
        ) : (
          <ImportPipelineButton variant="primary" />
        )}
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default GlobalNoPipelines;
