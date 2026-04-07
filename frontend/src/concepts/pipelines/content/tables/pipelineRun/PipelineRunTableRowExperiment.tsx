import React from 'react';
import { Label, Skeleton, Split, SplitItem } from '@patternfly/react-core';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import { NoRunContent } from '#~/concepts/pipelines/content/tables/renderUtils';

type PipelineRunTableRowExperimentProps = {
  experiment?: ExperimentKF | null;
  isExperimentArchived?: boolean;
  loaded: boolean;
  error?: Error;
};

const PipelineRunTableRowExperiment: React.FC<PipelineRunTableRowExperimentProps> = ({
  experiment,
  isExperimentArchived,
  loaded,
  error,
}) => {
  if (!loaded && !error) {
    return <Skeleton />;
  }

  if (!experiment) {
    return <NoRunContent />;
  }
  return (
    <Split hasGutter>
      <SplitItem>
        <Label isCompact variant="outline">
          {experiment.display_name}
        </Label>
      </SplitItem>
      {isExperimentArchived && (
        <SplitItem>
          <Label variant="outline" isCompact>
            Archived
          </Label>
        </SplitItem>
      )}
    </Split>
  );
};

export default PipelineRunTableRowExperiment;
