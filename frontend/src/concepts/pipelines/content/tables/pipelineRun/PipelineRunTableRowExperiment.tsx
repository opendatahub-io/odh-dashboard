import React from 'react';
import { Label, Skeleton, Split, SplitItem } from '@patternfly/react-core';
import TruncatedText from '#~/components/TruncatedText';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import { NoRunContent } from '#~/concepts/pipelines/content/tables/renderUtils';

type PipelineRunTableRowExperimentProps = {
  experiment?: ExperimentKF | null;
  isExperimentArchived?: boolean;
  loaded: boolean;
  error?: Error;
  onClick?: () => void;
};

const PipelineRunTableRowExperiment: React.FC<PipelineRunTableRowExperimentProps> = ({
  experiment,
  isExperimentArchived,
  loaded,
  error,
  onClick,
}) => {
  if (!loaded && !error) {
    return <Skeleton />;
  }

  if (!experiment) {
    return <NoRunContent />;
  }

  const runGroupLabel = (
    <Label
      {...(onClick
        ? {
            isClickable: true,
            onClick,
          }
        : {})}
      isCompact
      variant="outline"
    >
      <TruncatedText content={experiment.display_name} maxLines={1} />
    </Label>
  );

  return (
    <Split hasGutter>
      <SplitItem>{runGroupLabel}</SplitItem>
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
